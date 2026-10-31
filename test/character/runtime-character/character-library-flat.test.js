import test from "node:test";
import assert from "node:assert/strict";
import {
    CjsCharacterLibrary, CjsCharacterLibraryBuilder, CjsCharacterLibraryManager,
    CjsCharacterObjectBuilder, CjsCharacterCamera, CjsCharacterColorVariation
} from "../../../npm/dist/character/index.js";
import { CjsBluePaths, CjsBlueResMan, BlueResFileSystemRemote, RemoteFileCache } from "../../../npm/dist/global/blue/index.js";
import { installBlueServices } from "../../../npm/dist/global/blue/blue.js";
import "../../support/frameLoop.js";

const ROOT = "res:/graphics/character/female/paperdoll/topmiddle/shirtcf01";
const CAMERA = "res:/graphics/character/global/paperdolllibrary/cameras/test.yaml";
const SEQUENCE = "res:/graphics/character/global/paperdolllibrary/cameras/sequence.yaml";
const BASENAME = "res:/graphics/character/global/paperdolllibrary/posts/basename";

function fixture(t)
{
    const text = new Map([
        [ROOT + "/metadata.yaml", "!!python/object:paperDoll.AvatarPartMetaData\ndependantModifiers: [utilityshapes/test###0.25]\noccludesModifiers: null\n"],
        [ROOT + "/default.color", "colors: [!!python/tuple [0.1,0.2,0.3,1], !!python/tuple [0.4,0.5,0.6,1], !!python/tuple [0.7,0.8,0.9,1]]\npattern: ''\npatternColors: []\n"],
        [ROOT + "/types/shirt.type", "!!python/tuple [topmiddle/shirtcf01, '', default]\n"],
        [ROOT + "/diffuse.png", "opaque"],
        [ROOT + "/mesh.red", "opaque"],
        [CAMERA, "field_of_view: 0.25\n"],
        [SEQUENCE, "[[1,2,3],[4,5,6],1,2,3,[a,b,c,d,e]]\n"],
        [BASENAME, "one two\n"],
        ["res:/unrelated.yaml", "untouched"]
    ]);
    const cache = new RemoteFileCache();
    cache.AddFileIndex([...text.keys()].map((path, index) => `${path.replace(/\.red$/u, ".black")},synthetic/${index},checksum,1`).join("\n"));
    const paths = new CjsBluePaths();
    paths.RegisterFileSystem(new BlueResFileSystemRemote(cache));
    const reads = [];
    const resMan = new CjsBlueResMan({ source: { Read(path)
    {
        reads.push(path);
        return new TextEncoder().encode(text.get(path));
    } } });
    resMan.RegisterObjectBuilder("yaml", () => ({ CreateObject: () => ({ fallback: true }) }));
    // A loading object queues its read on the installed resMan, as Carbon's BlueAsyncRes
    // does on BeResMan (BlueAsyncRes.cpp:221-227), so this one must be blue.resMan.
    const previous = installBlueServices({ paths, resMan }, false);
    t.after(() =>
    {
        installBlueServices(previous, previous.running);
        resMan.Clear();
    });
    const builder = new CjsCharacterLibraryBuilder({ paths, resMan });
    CjsCharacterObjectBuilder.registerObjectBuilders(resMan, path => builder.GetSourceKind(path));
    return { builder, resMan, paths, reads };
}

test("flat values retain source identities and leave legacy payloads unchanged", () =>
{
    const library = new CjsCharacterLibrary();
    const legacy = library.GetValues();
    assert.equal(legacy.schemaVersion, 11);
    assert.equal(Object.hasOwn(legacy, "sourceNames"), false);
    assert.equal(Object.hasOwn(legacy, "cameras"), false);
    library.schemaVersion = 13;
    const camera = new CjsCharacterCamera();
    camera.field_of_view = 0.123456789;
    library.AddKind("cameras", CAMERA, camera);
    const values = library.GetValues();
    assert.deepEqual(values.sourceNames.cameras, [CAMERA]);
    const copy = CjsCharacterLibrary.from(JSON.parse(JSON.stringify(values)));
    assert.equal(copy.GetKindRecord("cameras", CAMERA).field_of_view, camera.field_of_view);
    assert.notEqual(copy.GetKindRecord("cameras", CAMERA), camera);
    assert.deepEqual(copy.ListKindNames("cameras"), [CAMERA]);
    assert.throws(() => library.AddKind("cameras", CAMERA, camera), /Duplicate/);
    assert.throws(() => library.AddKind("cameras", "wrong", new CjsCharacterColorVariation()), /Invalid record/);
    values.sourceNames.cameras = [];
    assert.throws(() => CjsCharacterLibrary.from(values), /equal lengths/);
    assert.equal(copy.RemoveKind("cameras", CAMERA), true);
    assert.deepEqual(copy.ListKindNames("cameras"), []);
});

test("lazy Blue reads load each record once on first need, preserve unrelated YAML and distinguish content variants", async t =>
{
    const { builder, resMan, reads } = fixture(t);
    await builder.Build({ lazy: true });
    assert.equal(reads.length, 0);
    const manager = new CjsCharacterLibraryManager(null, { sourceBuilder: builder });
    const [a,b] = await Promise.all([manager.GetCamera(CAMERA), manager.GetCamera(CAMERA)]);
    assert.equal(a,b);
    // One record, not its family: the camera sequence beside it is not read yet.
    assert.deepEqual(reads, [CAMERA]);
    assert.deepEqual(await manager.ListCameraNames(), [CAMERA]);
    assert.deepEqual(reads, [CAMERA, SEQUENCE]);
    assert.deepEqual(await manager.ListCameraSequenceNames(), [SEQUENCE]);
    assert.equal((await manager.GetPostBaseNames(BASENAME)).value, "one two");
    assert.deepEqual(await resMan.LoadObject("res:/unrelated.yaml"), { fallback: true });
    // A character .yaml loads under its own ex; plain .yaml stays the generic reader (above).
    const direct = await resMan.LoadObject(CAMERA, CjsCharacterObjectBuilder.getLoadOptions(CAMERA));
    assert.notEqual(direct, a);
    assert.equal(CjsCharacterObjectBuilder.getSource(direct).kind, "cameras");
    await assert.rejects(manager.GetCamera("res:/missing.yaml"), /Unresolved/);
});

test("GetPart joins exact records and paths without acquiring opaque resources", async t =>
{
    const { builder, reads } = fixture(t);
    await builder.Build({ lazy: true });
    const manager = new CjsCharacterLibraryManager(null, { sourceBuilder: builder });
    const part = await manager.GetPart("topmiddle/shirtcf01");
    assert.equal(await manager.GetPart(ROOT), part);
    assert.equal(part.metadata.dependantModifiers[0], "utilityshapes/test###0.25");
    assert.equal(part.dependantModifiers[0].weight, 0.25);
    assert.equal(part.dependantModifiers[0].path, "utilityshapes/test");
    assert.deepEqual(part.blackPaths, [ROOT + "/mesh.red"]);
    assert.deepEqual(part.texturePaths, [ROOT + "/diffuse.png"]);
    assert.ok(part.types.has("shirt"));
    assert.equal(await manager.ResolveTypeColor(ROOT + "/types/shirt.type"), part.colorVariations.get("default"));
    assert.ok(reads.every(path => !/\.(png|red)$/u.test(path)));
    await assert.rejects(manager.ResolveReference(ROOT + "/missing.color"), /Unresolved/);
    await assert.rejects(manager.GetPart("topmiddle/missing"), /Unresolved/);
    assert.throws(() => CjsCharacterLibraryManager.parseModifier("utilityshapes/test###wat"), /suffix/);
});

test("FetchAvatarPartMetaData starts the lazy source and reads only that metadata file", async t =>
{
    const { reads } = fixture(t);
    const manager = new CjsCharacterLibraryManager();
    const metadata = await manager.FetchAvatarPartMetaData(ROOT + "/metadata.yaml");
    assert.equal(await manager.FetchAvatarPartMetaData(ROOT + "/metadata.yaml"), metadata);
    assert.deepEqual(metadata.dependantModifiers, [ "utilityshapes/test###0.25" ]);
    assert.equal(metadata.numColorAreas, -1);
    assert.deepEqual(reads, [ ROOT + "/metadata.yaml" ]);
});

test("eager loading stores opaque paths without decoding and loads every indexed text", async t =>
{
    const { builder, reads } = fixture(t);
    const library = await builder.Build();
    assert.equal(library.cameras.length, 1);
    assert.equal(library.cameraSequences.length, 1);
    assert.equal(library.textures.length, 1);
    assert.equal(library.blackResources.length, 1);
    assert.equal(library.generic.postBaseNames.length, 1);
    assert.equal(reads.length, 6);
    assert.equal(library.blackResources[0].value, ROOT + "/mesh.red");
});

test("legacy formats reject flat fields and Reindex refreshes paired flat identities", () =>
{
    const library = new CjsCharacterLibrary();
    assert.throws(() => CjsCharacterLibrary.from({...library.GetValues(), cameras: []}), /schema-13 field/);
    library.schemaVersion = 13;
    const first = new CjsCharacterCamera(), second = new CjsCharacterCamera();
    library.AddKind("cameras", "first", first);
    assert.equal(library.GetKindRecord("cameras", "first"), first);
    library.cameras[0] = second;
    library.sourceNames.get("cameras")[0] = "second";
    library.Reindex();
    assert.equal(library.GetKindRecord("cameras", "first"), null);
    assert.equal(library.GetKindRecord("cameras", "second"), second);
});

test("async library replacement detaches the previous source loader", async t =>
{
    const { builder, reads } = fixture(t);
    await builder.Build({ lazy: true });
    const next = new CjsCharacterLibrary();
    next.schemaVersion = 13;
    const manager = new CjsCharacterLibraryManager(null, { sourceBuilder: builder, resourceLoader: async () => next });
    assert.equal(await manager.LoadLibraryAsync("res:/replacement"), true);
    assert.equal(manager.GetLibrary(), next);
    await assert.rejects(manager.GetCamera(CAMERA), /Unresolved/);
    assert.equal(reads.length, 0);
});

test("removing a completed part lets the next query make a fresh join", async t =>
{
    const { builder } = fixture(t);
    const manager = new CjsCharacterLibraryManager(null, { sourceBuilder: builder });
    const first = await manager.GetPart(ROOT);
    assert.equal(manager.GetLibrary().RemoveKind("parts", ROOT), true);
    const second = await manager.GetPart(ROOT);
    assert.notEqual(first, second);
    assert.equal(first.metadata, second.metadata);
});

test("a pending part join cannot cross a library replacement", async t =>
{
    const { paths, resMan } = fixture(t);
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    class DelayedBuilder extends CjsCharacterLibraryBuilder
    {
        async LoadRecord(kind, path) { await gate; return super.LoadRecord(kind, path); }
    }
    const builder = new DelayedBuilder({ paths, resMan });
    const manager = new CjsCharacterLibraryManager(null, { sourceBuilder: builder });
    const pending = manager.GetPart(ROOT);
    const next = new CjsCharacterLibrary();
    next.schemaVersion = 13;
    manager.InstallLibrary(next);
    release();
    await assert.rejects(pending, /replaced/);
    assert.equal(next.parts.length, 0);
});
