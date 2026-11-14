import test from "node:test";
import assert from "node:assert/strict";
import { CjsCharacterLibraryManager } from "../../../npm/dist/character/index.js";
import { BluePaths, BlueResMan, BlueResFileSystemRemote, RemoteFileCache } from "../../../npm/dist/blue/index.js";
import { installBlueServices } from "../../../npm/dist/blue/blue.js";
import "../../support/frameLoop.js";

const ROOT = "res:/graphics/character/female/paperdoll/";
const META = "!!python/object:paperDoll.AvatarPartMetaData\n";
const COLOR = "colors: [!!python/tuple [0.5,0,0,1], !!python/tuple [0,0.5,0,1], !!python/tuple [0,0,0.5,1]]\npattern: ''\n";
const OPAQUE = "opaque";

/** A synthetic build of the categories whose rules moved from Graphene: hair. */
function fixture(t)
{
    const text = new Map([
        // A style with a variation folder, its own palette its type does not name, and its colour areas stated.
        [ "hair/hair_bob_02/types/hair_bob_02.type", "!!python/tuple [hair/hair_bob_02, v1, '']\n" ],
        [ "hair/hair_bob_02/metadata.yaml", META + "numColorAreas: 2\n" ],
        [ "hair/hair_bob_02/rbvf.color", COLOR ],
        [ "hair/hair_bob_02/colorize_hair_l.png", OPAQUE ],
        [ "hair/hair_bob_02/colorize_hair_z.png", OPAQUE ],
        [ "hair/hair_bob_02/comp_hair_n.png", OPAQUE ],
        [ "hair/hair_bob_02/v1/colorize_hair_l.png", OPAQUE ],
        // A style whose type names its own palette.
        [ "hair/aura_hp/types/aura_hp.type", "!!python/tuple [hair/aura_hp, '', aura]\n" ],
        [ "hair/aura_hp/metadata.yaml", META + "numColorAreas: 1\n" ],
        [ "hair/aura_hp/aura.color", COLOR ],
        [ "hair/aura_hp/comp_hair_d.png", OPAQUE ],
        [ "hair/colors/brown_a.color", COLOR ],
        [ "hair/colors/brown_bc.color", COLOR ]
    ].map(([ path, value ]) => [ ROOT + path, value ]));
    const cache = new RemoteFileCache();
    cache.AddFileIndex([ ...text.keys() ].map((path, index) => `${path},synthetic/${index},checksum,1`).join("\n"));
    const paths = new BluePaths();
    paths.RegisterFileSystem(new BlueResFileSystemRemote(cache));
    const resMan = new BlueResMan({ source: { Read: path => new TextEncoder().encode(text.get(path)) } });
    const library = new CjsCharacterLibraryManager();
    const previous = installBlueServices({ paths, resMan, characterLibrary: library }, false);
    t.after(() =>
    {
        installBlueServices(previous, previous.running);
        resMan.Clear();
    });
    library.Initialize({ resMan });
    return library;
}

const local = path => path.slice(ROOT.length);

test("hair: one option per .type, maps from the variation folder else the style's, palettes and areas by its type and metadata", async t =>
{
    const library = fixture(t);
    const options = await library.FetchOptions("female", "hair");
    assert.deepEqual(options.map(option => [ option.id, local(option.folder) ]).sort(), [
        [ "aura_hp", "hair/aura_hp/" ],
        [ "hair_bob_02", "hair/hair_bob_02/" ]
    ]);
    const [ aura, bob ] = [ "aura_hp", "hair_bob_02" ].map(id => options.find(option => option.id === id));

    const maps = await library.FetchOptionMaps(bob);
    assert.deepEqual(maps.roles.map(role => local(role.path)).sort(), [
        "hair/hair_bob_02/colorize_hair_z.png",
        "hair/hair_bob_02/comp_hair_n.png",
        "hair/hair_bob_02/v1/colorize_hair_l.png"
    ], "a name in the variation folder replaces the style folder's");
    assert.deepEqual((await library.FetchOptionMaps(aura)).roles.map(role => local(role.path)), [ "hair/aura_hp/comp_hair_d.png" ]);

    assert.deepEqual((await library.FetchPalettes(bob)).map(record => [ local(record.path), record.areas ]), [
        [ "hair/colors/brown_a.color", [ 1 ] ],
        [ "hair/colors/brown_bc.color", [ 2, 3 ] ]
    ], "a style whose type names no palette of its own takes the shared swatches");
    assert.deepEqual((await library.FetchPalettes(aura)).map(record => local(record.path)), [ "hair/aura_hp/aura.color" ],
        "a style whose type names its own palette is coloured from its folder");

    assert.deepEqual(await library.FetchColorAreas(bob), [ 1, 2 ]);
    assert.deepEqual(await library.FetchColorAreas(aura), [ 1 ]);
});

test("a library's generic category overrides the shipped default of that name", async t =>
{
    const library = fixture(t);
    const installed = library.GetLibrary();
    installed.generic.categories.set("hair", Object.assign(Object.create(null), { options: "type", maps: "", palettes: "own", areas: "none" }));
    library.InstallLibrary(installed);
    await assert.rejects(library.FetchOptionMaps({ sex: "female", category: "hair", id: "x" }), /No maps rule for the paper doll category hair/);
    assert.equal(CjsCharacterLibraryManager.categories.hair.maps, "variation", "the defaults are not changed");
});
