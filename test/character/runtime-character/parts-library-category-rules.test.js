import test from "node:test";
import assert from "node:assert/strict";
import { CjsCharacterDataCategory, CjsCharacterGeneric, CjsCharacterLibrary, CjsCharacterLibraryManager } from "../../../npm/dist/character/index.js";
import { CjsSchema } from "../../../npm/dist/blue/schema/index.js";
import { CjsGraph } from "../../../npm/dist/global/model/graph/CjsGraph.js";
import { genericDefaults } from "../../../npm/dist/character/factory/defaults/generic.js";
import { CjsCharacterTextureRoles } from "../../../npm/dist/character/library/CjsCharacterTextureRoles.js";
import { BluePaths, BlueResMan, BlueResFileSystemRemote, RemoteFileCache } from "../../../npm/dist/blue/index.js";
import { installBlueServices } from "../../../npm/dist/blue/blue.js";
import "../../support/frameLoop.js";

const ROOT = "res:/graphics/character/female/paperdoll/";
const MALE = "res:/graphics/character/male/paperdoll/";
const META = "!!python/object:paperDoll.AvatarPartMetaData\n";
const COLOR = "colors: [!!python/tuple [0.5,0,0,1], !!python/tuple [0,0.5,0,1], !!python/tuple [0,0,0.5,1]]\npattern: ''\n";
const OPAQUE = "opaque";

/** A synthetic build of the categories whose rules moved from Graphene: hair and accessories. */
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
        [ "hair/colors/brown_bc.color", COLOR ],
        // An accessory with a variation folder and an alternative texture source.
        [ "accessories/glasses/glasses01/types/glasses01.type", "!!python/tuple [accessories/glasses/glasses01, v1, gold]\n" ],
        [ "accessories/glasses/glasses01/metadata.yaml", META + "numColorAreas: 2\nalternativeTextureSourcePath: accessories/shared/Metal\n" ],
        [ "accessories/glasses/glasses01/v1/colorize_head_l.png", OPAQUE ],
        [ "accessories/glasses/glasses01/colorize_acc_z.png", OPAQUE ],
        [ "accessories/glasses/glasses01/normal_n.png", OPAQUE ],
        [ "accessories/glasses/glasses01/gold.color", COLOR ],
        [ "accessories/glasses/glasses01/glasses01.black", OPAQUE ],
        [ "accessories/glasses/glasses01/glasses01_lod1.black", OPAQUE ],
        [ "accessories/glasses/glasses01/stripes.color", COLOR.replace("pattern: ''", "pattern: 'res:/graphics/character/stripes.png'") ],
        // An item whose part ships only a lower LOD is not offered.
        [ "accessories/glasses/glasses02/types/glasses02.type", "!!python/tuple [accessories/glasses/glasses02, '', '']\n" ],
        [ "accessories/glasses/glasses02/glasses02_lod1.black", OPAQUE ],
        [ "accessories/shared/metal/comp_acc_s.png", OPAQUE ],
        [ "accessories/shared/metal/silver.color", COLOR ],
        // A piercing type naming a part in another location; the part has no metadata.
        [ "accessories/piercings/set01/types/stud02.type", "!!python/tuple [accessories/earslow/stud02, '', '']\n" ],
        [ "accessories/piercings/set01/default.color", COLOR ],
        // Lashes ship their maps and no palette; a folder without types/ is not an option.
        [ "makeup/eyelashes/eyelashes_01/types/eyelashes_01.type", "!!python/tuple [makeup/eyelashes/eyelashes_01, '', '']\n" ],
        [ "makeup/eyelashes/eyelashes_01/colorize_head_l.png", OPAQUE ],
        [ "makeup/eyelashes/eyelashes_01/colorize_head_z.png", OPAQUE ],
        [ "makeup/eyelashes/eyelashes_01/comp_head_s.png", OPAQUE ],
        [ "makeup/eyelashes/eyelashes_02/colorize_head_l.png", OPAQUE ],
        [ "accessories/earslow/stud02/comp_acc_d.png", OPAQUE ],
        [ "accessories/earslow/stud02/stud02.black", OPAQUE ],
        // Beards (male): a colourised style with its own default palette, and a baked one with a variation.
        [ MALE + "beard/beard_01/types/beard_01.type", "!!python/tuple [beard/beard_01, '', '']\n" ],
        [ MALE + "beard/beard_01/colorize_head_l.png", OPAQUE ],
        [ MALE + "beard/beard_01/colorize_head_z.png", OPAQUE ],
        [ MALE + "beard/beard_01/comp_head_s.png", OPAQUE ],
        [ MALE + "beard/beard_01/default.color", COLOR ],
        [ MALE + "beard/beard_01/stubble.black", OPAQUE ],
        [ MALE + "beard/fiveoc/types/fiveoc.type", "!!python/tuple [beard/fiveoc, v1, '']\n" ],
        [ MALE + "beard/fiveoc/comp_head_d.png", OPAQUE ],
        [ MALE + "beard/fiveoc/v1/comp_head_d.png", OPAQUE ],
        [ MALE + "beard/fiveoc/v1/default.color", COLOR ]
    ].map(([ path, value ]) => [ path.startsWith("res:") ? path : ROOT + path, value ]));
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
    assert.equal(local((await library.ResolveColors(bob)).palette), "hair/colors/brown_a.color", "with no palette named, the first area-1 swatch");
    assert.equal(local((await library.ResolveColors(aura)).palette), "hair/aura_hp/aura.color");
});

test("a library's generic category overrides the shipped default of that name", async t =>
{
    const library = fixture(t);
    const installed = library.GetLibrary();
    installed.generic.categories.push(Object.assign(new CjsCharacterDataCategory(), { name: "hair", options: "type", maps: "", palettes: "own", areas: "none" }));
    library.InstallLibrary(installed);
    await assert.rejects(library.FetchOptionMaps({ sex: "female", category: "hair", id: "x" }), /No maps rule for the paper doll category hair/);
    assert.equal(library.GetCategoryRules().get("hair").maps, "", "the rules in force are the generic's");
    const reread = new CjsCharacterLibrary().SetData(installed.GetData()).generic.categories.find(category => category.name === "hair");
    assert.equal(CjsSchema.getClassName(reread.constructor), "CjsCharacterDataCategory", "an installed category reads back as a record");
    assert.equal(new CjsCharacterLibraryManager(installed.GetData()).GetCategoryRules().get("hair").maps, "", "and stays in force");
    assert.equal(new CjsCharacterLibraryManager().GetCategoryRules().get("hair").maps, "variation", "the defaults are not changed");
    const rules = library.GetCategoryRules();
    rules.get("outer").maps = "changed";
    assert.equal(library.GetCategoryRules().get("outer").maps, "garment", "the caller's own copy");
    assert.equal(CjsCharacterLibraryManager.categories, undefined, "no public table: the library answers the rules in force");
});

test("lashes: one option per .type, their composed maps, no palette, so the category's default colours", async t =>
{
    const library = fixture(t);
    const options = await library.FetchOptions("female", "makeup/eyelashes");
    assert.deepEqual(options.map(option => option.id), [ "eyelashes_01" ]);
    assert.deepEqual((await library.FetchOptionMaps(options[0])).roles.map(role => local(role.path)).sort(), [
        "makeup/eyelashes/eyelashes_01/colorize_head_l.png",
        "makeup/eyelashes/eyelashes_01/colorize_head_z.png",
        "makeup/eyelashes/eyelashes_01/comp_head_s.png"
    ]);
    assert.deepEqual(await library.FetchPalettes(options[0]), []);
    const resolved = await library.ResolveColors(options[0]);
    assert.equal(resolved.palette, null);
    assert.deepEqual(resolved.colors.map(color => Array.from(color)), [ [ 0, 0, 0, 1 ], [ 0, 0, 0, 1 ], [ 0, 0, 0, 1 ] ]);
});

test("accessories: maps by region across the item's folders, palettes of those folders, areas as its metadata states", async t =>
{
    const library = fixture(t);
    const listed = await library.FetchOptions("female", "accessories/glasses");
    assert.deepEqual(listed.map(option => option.id), [ "glasses01" ], "an item whose part ships no mesh but a lower LOD is not offered");
    const [ glasses ] = listed;
    const [ stud ] = await library.FetchOptions("female", "accessories/piercings");
    const maps = await library.FetchOptionMaps(glasses);
    assert.deepEqual(maps.folders.map(local), [ "accessories/glasses/glasses01/v1/", "accessories/glasses/glasses01/", "accessories/shared/metal/" ]);
    const head = Object.fromEntries(Object.entries(maps.regions.head).map(([ role, map ]) => [ role, map && [ local(map.path), map.fallback ] ]));
    assert.deepEqual(head, {
        l: [ "accessories/glasses/glasses01/v1/colorize_head_l.png", false ],
        z: [ "accessories/glasses/glasses01/colorize_acc_z.png", true ],
        d: null,
        n: [ "accessories/glasses/glasses01/normal_n.png", true ],
        s: [ "accessories/shared/metal/comp_acc_s.png", true ]
    }, "the region's name, else the accessory name, else an unqualified one");
    assert.equal(maps.regions.body.l, null, "another region's named map never stands in");
    assert.deepEqual((await library.FetchPalettes(glasses)).map(record => local(record.path)), [ "accessories/glasses/glasses01/gold.color", "accessories/shared/metal/silver.color" ]);
    assert.deepEqual(await library.FetchColorAreas(glasses), [ 1, 2 ]);

    assert.deepEqual((await library.FetchOptionMaps(stud)).folders.map(local), [ "accessories/earslow/stud02/", "accessories/piercings/set01/" ], "a piercing's maps follow the part its type names");
    assert.deepEqual((await library.FetchPalettes(stud)).map(record => local(record.path)), [ "accessories/piercings/set01/default.color" ]);
    assert.deepEqual(await library.FetchColorAreas(stud), [], "no metadata is no colour");
});

test("the unqualified accessory map fallback is a setting, on by default", async t =>
{
    assert.equal(CjsCharacterTextureRoles.characterAccessoryMapFallback, true);
    CjsCharacterTextureRoles.characterAccessoryMapFallback = false;
    t.after(() => { CjsCharacterTextureRoles.characterAccessoryMapFallback = true; });
    const library = fixture(t);
    const [ glasses ] = await library.FetchOptions("female", "accessories/glasses");
    const { regions } = await library.FetchOptionMaps(glasses);
    assert.equal(regions.head.n, null);
    assert.equal(local(regions.head.s.path), "accessories/shared/metal/comp_acc_s.png", "the accessory name still stands in");
});

test("beards: maps from the variation folder else the style's, every style's default palette with its own first", async t =>
{
    const library = fixture(t);
    const male = path => path.slice(MALE.length);
    const options = await library.FetchOptions("male", "beard");
    assert.deepEqual(options.map(option => option.id).sort(), [ "beard_01", "fiveoc" ]);
    const [ beard, fiveoc ] = [ "beard_01", "fiveoc" ].map(id => options.find(option => option.id === id));
    assert.deepEqual((await library.FetchOptionMaps(fiveoc)).roles.map(role => male(role.path)), [ "beard/fiveoc/v1/comp_head_d.png" ]);
    assert.deepEqual((await library.FetchOptionMaps(beard)).roles.map(role => male(role.path)).sort(), [
        "beard/beard_01/colorize_head_l.png", "beard/beard_01/colorize_head_z.png", "beard/beard_01/comp_head_s.png"
    ]);
    assert.deepEqual((await library.FetchPalettes(fiveoc)).map(record => male(record.path)), [ "beard/fiveoc/v1/default.color", "beard/beard_01/default.color" ]);
    assert.deepEqual((await library.FetchPalettes(beard)).map(record => male(record.path)), [ "beard/beard_01/default.color", "beard/fiveoc/v1/default.color" ]);
    assert.equal(male((await library.ResolveColors(fiveoc)).palette), "beard/fiveoc/v1/default.color", "a style takes its own default");
    assert.deepEqual(await library.FetchColorAreas(fiveoc), [], "a baked style paints no colour areas");
});

test("the shipped categories are records built from the shipped generic, every field carried", () =>
{
    const shipped = CjsGraph.from(CjsCharacterGeneric, genericDefaults).categories;
    assert.equal(CjsSchema.getClassName(shipped[0].constructor), "CjsCharacterDataCategory", "the file is in the generic's own shape");
    const rules = new CjsCharacterLibraryManager().GetCategoryRules();
    assert.equal(rules.size, 45);
    assert.deepEqual(rules.get("makeup/eyelashes"), { options: "type", maps: "composed", palettes: "own", areas: "zone",
        defaultColors: [ [ 0, 0, 0, 1 ], [ 0, 0, 0, 1 ], [ 0, 0, 0, 1 ] ], requiresModel: false, skipPatternedPalettes: false });
    assert.deepEqual([ rules.get("accessories/brow").requiresModel, rules.get("accessories/brow").skipPatternedPalettes ], [ true, true ]);
    assert.deepEqual(rules.get("hair").defaultColors, [], "a category that lists none has none");
    assert.equal(CjsCharacterLibraryManager.partCategory("eyes"), "makeup/eyes", "which category a part reads is its own table");
});
