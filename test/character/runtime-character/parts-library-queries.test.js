import test from "node:test";
import assert from "node:assert/strict";
import { CjsCharacterLibraryManager, CjsCharacterObjectBuilder } from "../../../npm/dist/character/index.js";
import { BluePaths, BlueResMan, BlueResFileSystemRemote, RemoteFileCache } from "../../../npm/dist/blue/index.js";
import { installBlueServices } from "../../../npm/dist/blue/blue.js";
import "../../support/frameLoop.js";

const ROOT = "res:/graphics/character/female/paperdoll/";
const META = "!!python/object:paperDoll.AvatarPartMetaData\n";
const COLOR = value => `colors: [!!python/tuple [${value},0,0,1], !!python/tuple [0,${value},0,1], !!python/tuple [0,0,${value},1]]\npattern: ''\npatternColors: [!!python/tuple [0.2,0.2,0.2,1.0], !!python/tuple [0.6,0.6,0.6,1.0], !!python/tuple [0.5,0.5,0.5,1.0], !!python/tuple [0.5,0.5,0.5,1.0], !!python/tuple [0.5,0.5,0.5,1.0], !!python/tuple [0,0,8,8], 0.0]\n`;
const OPAQUE = "opaque";

/** A synthetic build: one garment with a variation, an underwear folder, eye shadow, blush, a map decal and a head. */
function fixture(t)
{
    const text = new Map([
        // The type names its part in mixed case, as some shipped types do.
        [ "outer/coat01/types/coat01_black.type", "!!python/tuple [outer/Coat01, v1, black]\n" ],
        [ "outer/coat01/types/coat01_plain.type", "!!python/tuple [outer/coat01, '', missing]\n" ],
        [ "outer/coat01/metadata.yaml", META + "dependantModifiers: [dependants/mask01###1.0, utilityshapes/tuck###0.5]\noccludesModifiers: [outer/other#2]\nnumColorAreas: 2\n" ],
        [ "outer/coat01/black.color", COLOR(0.25) ],
        [ "outer/coat01/red.color", COLOR(0.75) ],
        [ "outer/coat01/colorize_body_l.png", OPAQUE ],
        [ "outer/coat01/colorize_body_z.png", OPAQUE ],
        [ "outer/coat01/comp_body_m.png", OPAQUE ],
        [ "outer/coat01/v1/colorize_body_l.png", OPAQUE ],
        [ "outer/coat01/v1/coat01_lod1.black", OPAQUE ],
        [ "outer/coat01/coat01.black", OPAQUE ],
        [ "outer/coat01/acoat01_nosim.black", OPAQUE ],
        [ "outer/coat01/coat01_lod1.black", OPAQUE ],
        [ "dependants/mask01/comp_body_m.png", OPAQUE ],
        [ "bottomunderwear/boxers01/types/boxers01_civire.type", "!!python/tuple [bottomunderwear/boxers01, '', default]\n" ],
        [ "bottomunderwear/boxers01/types/boxers01_deteis.type", "!!python/tuple [bottomunderwear/boxers01, '', default]\n" ],
        [ "bottomunderwear/boxers01/default.color", COLOR(0.5) ],
        [ "makeup/eyeshadow/eyeshadow_01/types/eyeshadow_01.type", "!!python/tuple [makeup/eyeshadow/eyeshadow_01, '', '']\n" ],
        [ "makeup/eyeshadow/eyeshadow_01/colorize_head_l.png", OPAQUE ],
        [ "makeup/eyeshadow/eyeshadow_01/colorize_head_z.png", OPAQUE ],
        [ "makeup/eyeshadow/eyeshadow_01/aa_head_s.png", OPAQUE ],
        [ "makeup/eyeshadow/eyeshadow_01/default.color", COLOR(0.5) ],
        [ "makeup/eyeshadow/eyeshadow_01/aqua_a.color", COLOR(0.125) ],
        [ "makeup/eyeshadow/colors/shared.color", COLOR(0.5) ],
        [ "makeup/blush/blush_01/types/blush_01.type", "!!python/tuple [makeup/blush/blush_01, '', '']\n" ],
        [ "makeup/blush/blush_01/colorize_head_l_512.png", OPAQUE ],
        [ "makeup/blush/blush_01/colorize_head_z.png", OPAQUE ],
        [ "makeup/blush/blush_01/own.color", COLOR(0.5) ],
        [ "makeup/blush/colors/pink.color", COLOR(0.5) ],
        [ "makeup/aging/aging_01/types/aging_01_v1.type", "!!python/tuple [makeup/aging/aging_01, v1, '']\n" ],
        [ "makeup/aging/aging_01/comp_head_d.png", OPAQUE ],
        [ "makeup/aging/aging_01/comp_head_n.png", OPAQUE ],
        [ "makeup/aging/aging_01/v1/comp_head_d.png", OPAQUE ],
        [ "head/caldari_deteis/metadata.yaml", META + "dependantModifiers: [archetypes/cdshape###1.0]\noccludesModifiers: null\n" ],
        [ "head/caldari_civire/metadata.yaml", META + "dependantModifiers: [archetypes/ccshape###1.0]\noccludesModifiers: null\n" ],
        [ "archetypes/cdshape/types/deites.type", "!!python/tuple [archetypes/cdshape, '', '']\n" ],
        [ "skintone/basic/default.color", COLOR(0.5) ]
    ].map(([ path, value ]) => [ ROOT + path, value ]));
    const cache = new RemoteFileCache();
    cache.AddFileIndex([ ...text.keys() ].map((path, index) => `${path},synthetic/${index},checksum,1`).join("\n"));
    const paths = new BluePaths();
    paths.RegisterFileSystem(new BlueResFileSystemRemote(cache));
    const reads = [];
    const resMan = new BlueResMan({ source: { Read(path)
    {
        reads.push(path);
        return new TextEncoder().encode(text.get(path));
    } } });
    const library = new CjsCharacterLibraryManager();
    const previous = installBlueServices({ paths, resMan, characterLibrary: library }, false);
    t.after(() =>
    {
        installBlueServices(previous, previous.running);
        resMan.Clear();
    });
    library.Initialize({ resMan });
    return { library, reads, CjsCharacterObjectBuilder };
}

const option = async (library, category, id) => (await library.FetchOptions("female", category)).find(value => value.id === id);

test("options come from the index alone, one per .type, per underwear folder, or the category itself", async t =>
{
    const { library, reads } = fixture(t);
    assert.deepEqual((await library.FetchOptions("female", "outer")).map(value => [ value.id, value.typePath.slice(ROOT.length), value.folder.slice(ROOT.length), value.path ]), [
        [ "coat01_black", "outer/coat01/types/coat01_black.type", "outer/coat01/", "outer/coat01" ],
        [ "coat01_plain", "outer/coat01/types/coat01_plain.type", "outer/coat01/", "outer/coat01" ]
    ]);
    const [ boxers ] = await library.FetchOptions("female", "bottomunderwear");
    assert.deepEqual([ boxers.id, boxers.typePath, boxers.path, boxers.bloodlines ], [ "boxers01", null, "bottomunderwear/boxers01", [ "civire", "deteis" ] ]);
    const [ skin ] = await library.FetchOptions("female", "skintone/basic");
    assert.deepEqual([ skin.id, skin.folder ], [ "basic", ROOT + "skintone/basic/" ]);
    assert.deepEqual(reads, [], "listing reads no file");
    await assert.rejects(library.FetchOptions("female", "bodyshapes"), /No paper doll category bodyshapes/);
    await assert.rejects(library.FetchOptions("female", "head"), /No options rule for the paper doll category head/);
    assert.deepEqual(await library.FetchOptions("female", "hair"), [], "a listed category this build ships nothing in");
    await assert.rejects(library.FetchOptionMaps({ sex: "female", category: "bottominner", id: "long01" }), /No maps rule for the paper doll category bottominner/);
    assert.throws(() => CjsCharacterLibraryManager.paperDollRoot("other"), /Unknown character sex/);
});

test("an option's part: its type's tuple, the variation folder before the part folder, and its metadata decoded", async t =>
{
    const { library } = fixture(t);
    const black = await library.FetchOptionPart(await option(library, "outer", "coat01_black"));
    assert.deepEqual([ black.part, black.variation, black.colorVariant ], [ "outer/coat01", "v1", "black" ], "the part lowercased");
    assert.deepEqual(black.folders, [ ROOT + "outer/coat01/v1/", ROOT + "outer/coat01/" ]);
    assert.deepEqual([ black.dependants, black.occludes, black.numColorAreas ], [ [ "dependants/mask01" ], [ "outer/other" ], 2 ], "utility shapes are not dependants");
    assert.deepEqual(black.shapes.requests.map(value => [ value.modifierPath, value.weight ]), [ [ "utilityshapes/tuck", 0.5 ] ]);
    assert.deepEqual((await library.FetchOptionPart(await option(library, "outer", "coat01_plain"))).folders, [ ROOT + "outer/coat01/" ]);
    const aging = await library.FetchOptionPart(await option(library, "makeup/aging", "aging_01_v1"));
    assert.deepEqual([ aging.metadataPath, aging.numColorAreas, aging.projection ], [ null, -1, null ]);
});

test("a part folder's metadata: the first folder holding one, decoded, with weighted dependant parts", async t =>
{
    const { library, reads } = fixture(t);
    const coat = await library.FetchPartMetadata([ ROOT + "outer/coat01/v1/", ROOT + "outer/coat01/" ]);
    assert.equal(coat.metadataPath, ROOT + "outer/coat01/metadata.yaml", "the variation folder has none");
    assert.deepEqual([ coat.occludes, coat.dependants, coat.dependantParts, coat.numColorAreas, coat.alternativeTextureSourcePath ],
        [ [ "outer/other" ], [ "dependants/mask01" ], [ { path: "dependants/mask01", weight: 1 } ], 2, "" ]);
    assert.deepEqual(coat.shapes.requests.map(value => [ value.modifierPath, value.weight ]), [ [ "utilityshapes/tuck", 0.5 ] ]);
    coat.occludes.push("changed");
    assert.deepEqual((await library.FetchPartMetadata([ ROOT + "outer/coat01/v1/", ROOT + "outer/coat01/" ])).occludes, [ "outer/other" ], "the caller's own copy");
    assert.equal(reads.filter(path => path.endsWith("metadata.yaml")).length, 1, "read once");
    assert.equal(await library.FetchPartMetadata([ ROOT + "makeup/aging/aging_01/" ]), null, "no folder holds one");
});

test("each category's maps follow its own rule", async t =>
{
    const { library } = fixture(t);
    const garment = await library.FetchOptionMaps(await option(library, "outer", "coat01_black"));
    assert.equal(garment.maps.detail, ROOT + "outer/coat01/v1/colorize_body_l.png", "the variation folder first");
    assert.equal(garment.maps.zone, ROOT + "outer/coat01/colorize_body_z.png");
    assert.deepEqual(garment.masks, [ ROOT + "outer/coat01/comp_body_m.png", ROOT + "dependants/mask01/comp_body_m.png" ], "its own, then each dependant folder's");
    const decal = await library.FetchOptionMaps(await option(library, "makeup/aging", "aging_01_v1"));
    assert.deepEqual(decal.paths, [ ROOT + "makeup/aging/aging_01/v1/comp_head_d.png", ROOT + "makeup/aging/aging_01/comp_head_n.png" ], "the variation's replaces the part folder's of its name");
    const composed = await library.FetchOptionMaps(await option(library, "makeup/eyeshadow", "eyeshadow_01"));
    assert.deepEqual(composed.roles.map(role => role.path.split("/").at(-1)), [ "colorize_head_l.png", "colorize_head_z.png" ]);
    assert.deepEqual(composed.skipped, [ "aa_head_s" ], "a map outside the composed names is not drawn");
    const catalog = await library.FetchOptionMaps(await option(library, "makeup/blush", "blush_01"));
    assert.deepEqual(Object.keys(catalog.channels).sort(), [ "colorize_head_l", "colorize_head_z" ]);
    assert.equal(catalog.channels.colorize_head_l, ROOT + "makeup/blush/blush_01/colorize_head_l_512.png", "the nearest tier");
});

test("palettes: an option's own, and a shared category's colors/", async t =>
{
    const { library } = fixture(t);
    assert.deepEqual((await library.FetchPalettes(await option(library, "makeup/eyeshadow", "eyeshadow_01"))).map(record => [ record.name, record.areas ]),
        [ [ "aqua_a", [ 1 ] ], [ "default", [ 1, 2, 3 ] ] ], "eye shadow keeps its own; the category's colors/ is not offered");
    assert.deepEqual((await library.FetchPalettes(await option(library, "makeup/blush", "blush_01"))).map(record => record.name), [ "own", "pink" ]);
});

test("an archetype's bloodline is the head that depends on it; a recipe entry selects the option its type presets", async t =>
{
    const { library } = fixture(t);
    assert.deepEqual(await library.FetchBloodline("female", "archetypes/cdshape"), { bloodline: "deteis", head: "head/caldari_deteis", morphTarget: "CDShape" },
        "the head's name, not the archetype type's spelling");
    assert.equal(await library.FetchBloodline("female", "archetypes/aashape"), null);
    const resolve = entry => library.ResolveRecipeEntry("female", entry);
    assert.deepEqual(await resolve({ path: "outer/coat01", variation: "v1", colorVariation: "black" }), { category: "outer", option: "coat01_black", path: "outer/coat01" });
    assert.deepEqual(await resolve({ path: "outer/Coat01", variation: "v0", colorVariation: "missing" }), { category: "outer", option: "coat01_plain", path: "outer/coat01" }, "'' is v0; case does not matter");
    assert.deepEqual(await resolve({ path: "outer/coat01", variation: "v1", colorVariation: "red" }), { category: "outer", option: null }, "a pairing no type presets");
    assert.deepEqual(await resolve({ path: "outer/coat01", variation: "V1", colorVariation: "Black" }), { category: "outer", option: "coat01_black", path: "outer/coat01" }, "no name compares with case");
    assert.deepEqual(await resolve({ path: "makeup/eyeshadow/eyeshadow_01", colorVariation: "aqua_a" }), { category: "makeup/eyeshadow", option: "eyeshadow_01", path: "makeup/eyeshadow/eyeshadow_01" }, "a makeup entry's colour variation is a palette");
    assert.deepEqual(await resolve({ path: "bottomunderwear/boxers01" }), { category: "bottomunderwear", option: "boxers01", path: "bottomunderwear/boxers01" });
    assert.deepEqual(await resolve({ path: "hair/long01" }), { category: "hair", option: null }, "a listed category with no matching type");
    assert.deepEqual(await resolve({ path: "head/caldari_deteis" }), { category: "head", option: null }, "a category with no option rule");
    assert.equal(await resolve({ path: "bodyshapes/thinshape" }), null, "a path in no category");
});

test("colours: the library's palette, then each provided colour the option paints", async t =>
{
    const { library } = fixture(t);
    const coat = await option(library, "outer", "coat01_black");
    const own = await library.ResolveColors(coat);
    assert.equal(own.palette, ROOT + "outer/coat01/black.color", "the colour variant's palette");
    assert.deepEqual(Array.from(own.colors[0]), [ 0.25, 0, 0, 1 ]);
    const red = await library.ResolveColors(coat, { palette: "red" });
    assert.equal(red.palette, ROOT + "outer/coat01/red.color", "a named palette");
    const custom = await library.ResolveColors(coat, { palette: "unknown", colors: [ [ 1, 1, 1, 1 ], null, [ 1, 1, 1, 1 ] ] });
    assert.equal(custom.palette, ROOT + "outer/coat01/black.color", "an unknown name falls back");
    assert.deepEqual(Array.from(custom.colors[0]), [ 1, 1, 1, 1 ], "area 1 is painted: overridden");
    assert.deepEqual(Array.from(custom.colors[1]), [ 0, 0.25, 0, 1 ], "no value provided: the palette's");
    assert.deepEqual(Array.from(custom.colors[2]), [ 0, 0, 0.25, 1 ], "area 3 is not painted (numColorAreas 2): not applied");
    assert.equal((await library.ResolveColors(await option(library, "outer", "coat01_plain"))).palette, ROOT + "outer/coat01/black.color",
        "a garment whose colour variant names no palette takes its first");
    const shadow = await library.ResolveColors(await option(library, "makeup/eyeshadow", "eyeshadow_01"), { palette: "aqua_a" });
    assert.deepEqual(shadow.colors.map(color => color === null), [ false, true, true ], "an _a palette sets area 1 only");
    assert.equal((await library.ResolveColors(await option(library, "makeup/aging", "aging_01_v1"))).palette, null);
});

test("an option's model: the first folder's .black that is not a LOD, else none; areas by role and atlas region", async t =>
{
    const { library } = fixture(t);
    const read = [];
    library.FetchModelAreas = async path => { read.push(path); return { model: path, meshes: [] }; };
    assert.equal((await library.FetchOptionAreas(await option(library, "outer", "coat01_black"))).model, ROOT + "outer/coat01/coat01.black",
        "the variation folder holds only a LOD model, so the part folder's: the one named as its folder");
    assert.equal(await library.FetchOptionAreas(await option(library, "makeup/eyeshadow", "eyeshadow_01")), null, "a baked option has no model");
    assert.deepEqual(read, [ ROOT + "outer/coat01/coat01.black" ]);
    const { uvRegion } = await import("../../../npm/dist/character/library/CjsCharacterTextureRoles.js").then(m => ({ uvRegion: m.CjsCharacterTextureRoles.uvRegion }));
    assert.deepEqual([ [ 0, 0, 0.5, 1 ], [ 0.5, 0, 1, 0.5 ], [ 0.5, 0.5, 0.75, 1 ], [ 0.8, 0.6, 0.9, 0.7 ], [ 0, 0, 1, 1 ], [ 0.25, 0.25, 0.75, 0.75 ] ].map(uv => uvRegion(uv)),
        [ "body", "head", "hair", "acc", "identity", null ]);
    const kind = CjsCharacterLibraryManager.areaKind;
    assert.deepEqual([
        kind("skinnedavatarbrdfdoublelinear.fx", 0, 3), kind("skinnedavatarbrdflinear.fx", 0, 2), kind("skinnedavatarbrdflinear.fx", 10, null),
        kind("skinnedavatarbrdflinear.fx", 0, null), kind("skinnedavatarbrdf.fx", 0, null), kind("skinnedavatarhair_detailed.fx", null, null),
        kind("glassshader.fx", 0, null), kind("eyeshader.fx", 0, 4), kind("portraitbasic.fx", null, null), kind("other.fx", 1, 1)
    ], [ "skin", "skin", "cloth", null, "own", "hair", "glass", "eyes", "portrait", null ]);
});
