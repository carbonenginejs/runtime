import test from "node:test";
import assert from "node:assert/strict";
import {
    CjsCharacterLibrary, CjsCharacterLibraryBuilder, CjsCharacterLibraryConfiguration, CjsCharacterLibraryManager,
    CjsCharacterObjectBuilder, CjsCharacterCamera, CjsCharacterColorVariation, CjsCharacterPdpType
} from "../../../npm/dist/character/index.js";
import { BluePaths, BlueResMan, BlueResFileSystemRemote, RemoteFileCache } from "../../../npm/dist/blue/index.js";
import { installBlueServices } from "../../../npm/dist/blue/blue.js";
import "../../support/frameLoop.js";

const ROOT = "res:/graphics/character/female/paperdoll/topmiddle/shirtcf01";
const CAMERA = "res:/graphics/character/global/paperdolllibrary/cameras/test.yaml";
const SEQUENCE = "res:/graphics/character/global/paperdolllibrary/cameras/sequence.yaml";
const BASENAME = "res:/graphics/character/global/paperdolllibrary/posts/basename";

function fixture(t)
{
    const text = new Map([
        [ROOT + "/metadata.yaml", "!!python/object:paperDoll.AvatarPartMetaData\ndependantModifiers: [utilityshapes/test###0.25]\noccludesModifiers: null\n"],
        [ROOT + "/default.color", "colors: [!!python/tuple [0.1,0.2,0.3,1], !!python/tuple [0.4,0.5,0.6,1], !!python/tuple [0.7,0.8,0.9,1]]\npattern: ''\npatternColors: [!!python/tuple [0.2,0.2,0.2,1.0], !!python/tuple [0.6,0.6,0.6,1.0], !!python/tuple [0.5,0.5,0.5,1.0], !!python/tuple [0.5,0.5,0.5,1.0], !!python/tuple [0.5,0.5,0.5,1.0], !!python/tuple [0,0,8,8], 0.0]\n"],
        [ROOT + "/types/shirt.type", "!!python/tuple [topmiddle/shirtcf01, '', default]\n"],
        [ROOT + "/diffuse.png", "opaque"],
        [ROOT + "/mesh.red", "opaque"],
        [CAMERA, "field_of_view: 0.25\n"],
        [SEQUENCE, "[[1,2,3],[4,5,6],0.3,0.1,200,['','','','','']]\n"],
        [BASENAME, "one two\n"],
        ["res:/unrelated.yaml", "untouched"]
    ]);
    const cache = new RemoteFileCache();
    cache.AddFileIndex([...text.keys()].map((path, index) => `${path.replace(/\.red$/u, ".black")},synthetic/${index},checksum,1`).join("\n"));
    const paths = new BluePaths();
    paths.RegisterFileSystem(new BlueResFileSystemRemote(cache));
    const reads = [];
    const resMan = new BlueResMan({ source: { Read(path)
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
    CjsCharacterObjectBuilder.registerObjectBuilders(resMan, path => builder.GetSourceKind(path), CjsCharacterLibraryConfiguration);
    return { builder, resMan, paths, reads };
}

test("library values are its items by kind, version 1, and keep their source identities", () =>
{
    const library = new CjsCharacterLibrary();
    assert.equal(library.GetData().schemaVersion, 1);
    assert.throws(() => new CjsCharacterLibrary().SetData({ ...library.GetData(), schemaVersion: 13 }), /schema version 1/u, "earlier formats are not read");
    const camera = new CjsCharacterCamera();
    camera.field_of_view = 0.123456789;
    library.AddKind("cameras", CAMERA, camera);
    const values = library.GetData();
    assert.deepEqual(values.sourceNames.cameras, [CAMERA]);
    const copy = new CjsCharacterLibrary().SetData(JSON.parse(JSON.stringify(values)));
    assert.equal(copy.GetKindRecord("cameras", CAMERA).field_of_view, camera.field_of_view);
    assert.notEqual(copy.GetKindRecord("cameras", CAMERA), camera);
    assert.deepEqual(copy.ListKindNames("cameras"), [CAMERA]);
    assert.throws(() => library.AddKind("cameras", CAMERA, camera), /Duplicate/);
    assert.throws(() => library.AddKind("cameras", "wrong", new CjsCharacterColorVariation()), /Invalid record/);
    values.sourceNames.cameras = [];
    assert.throws(() => new CjsCharacterLibrary().SetData(values), /equal lengths/);
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
    // Each caller gets its own copy of the one record read (the library gives out data, not references).
    assert.notEqual(a, b);
    assert.deepEqual(a, b);
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
    assert.equal(direct._pdpType, CjsCharacterPdpType.CAMERA);
    await assert.rejects(manager.GetCamera("res:/missing.yaml"), /Unresolved/);
});

test("listing a path-named kind reads the index only and keeps stored names", async t =>
{
    const { builder, reads } = fixture(t);
    await builder.Build({ lazy: true });
    const manager = new CjsCharacterLibraryManager(null, { sourceBuilder: builder });
    assert.deepEqual(await manager.ListColorVariationNames(), [ROOT + "/default.color"]);
    assert.deepEqual(await manager.ListTypeNames(), [ROOT + "/types/shirt.type"]);
    assert.deepEqual(await manager.ListAvatarPartMetaDataNames(), [ROOT + "/metadata.yaml"]);
    assert.deepEqual(reads, []);
    const stored = new CjsCharacterColorVariation();
    manager.GetLibrary().AddKind("colorVariations", "user-named", stored);
    assert.deepEqual(await manager.ListColorVariationNames(), [ROOT + "/default.color", "user-named"]);
    assert.deepEqual(reads, []);
    // A shared family still reads its files: only the bytes say camera or camera sequence.
    assert.deepEqual(await manager.ListCameraNames(), [CAMERA]);
    assert.deepEqual(reads.sort(), [CAMERA, SEQUENCE].sort());
});

test("GetPart joins exact records and paths without acquiring opaque resources", async t =>
{
    const { builder, reads } = fixture(t);
    await builder.Build({ lazy: true });
    const manager = new CjsCharacterLibraryManager(null, { sourceBuilder: builder });
    const part = await manager.GetPart("topmiddle/shirtcf01");
    const again = await manager.GetPart(ROOT);
    assert.notEqual(again, part, "a copy per call");
    assert.deepEqual(again, part);
    assert.deepEqual({ ...part.metadata.dependantModifiers[0] }, { path: "utilityshapes/test", weight: 0.25 });
    assert.equal(part.dependantModifiers[0].weight, 0.25);
    assert.equal(part.dependantModifiers[0].path, "utilityshapes/test");
    assert.deepEqual(part.blackPaths, [ROOT + "/mesh.red"]);
    assert.deepEqual(part.texturePaths, [ROOT + "/diffuse.png"]);
    assert.ok(part.types.has("shirt"));
    assert.deepEqual(await manager.ResolveTypeColor(ROOT + "/types/shirt.type"), part.colorVariations.get("default"));
    assert.ok(reads.every(path => !/\.(png|red)$/u.test(path)));
    await assert.rejects(manager.ResolveReference(ROOT + "/missing.color"), /Unresolved/);
    await assert.rejects(manager.GetPart("topmiddle/missing"), /Unresolved/);
});

test("FetchAvatarPartMetaData starts the lazy source and reads only that metadata file", async t =>
{
    const { reads } = fixture(t);
    const manager = new CjsCharacterLibraryManager();
    const metadata = await manager.FetchAvatarPartMetaData(ROOT + "/metadata.yaml");
    const again = await manager.FetchAvatarPartMetaData(ROOT + "/metadata.yaml");
    assert.notEqual(again, metadata, "a copy per call");
    assert.deepEqual(again, metadata);
    assert.deepEqual(metadata.dependantModifiers.map(value => ({ ...value })), [ { path: "utilityshapes/test", weight: 0.25 } ]);
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

test("installing another library detaches the previous source loader", async t =>
{
    const { builder, reads } = fixture(t);
    await builder.Build({ lazy: true });
    const next = new CjsCharacterLibrary();
    const manager = new CjsCharacterLibraryManager(null, { sourceBuilder: builder });
    manager.InstallLibrary(next);
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
    assert.deepEqual(first.metadata, second.metadata);
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
    manager.InstallLibrary(next);
    release();
    await assert.rejects(pending, /replaced/);
    assert.equal(next.parts.length, 0);
});
