// Character area shaders are library data with a default (factory/defaults/generic.js), in the shape of Carbon's
// EveSOFDataGenericShader. The library resolves an area's values: its shader's defaults, the values provided for the
// area over them (an authored area's, or a new part's), its placement in its atlas region, and the rules that pick it.
// For an authored area it answers what the effect does not already hold; the paper doll sets that
// (CjsPaperDollInstance.applyAreaSetup).
import test from "node:test";
import assert from "node:assert/strict";
import { CjsCharacterDataParameter, CjsCharacterDataShader, CjsCharacterGeneric, CjsCharacterLibraryManager, CjsPaperDollInstance } from "../../../npm/dist/character/index.js";
import { CjsGraph } from "../../../npm/dist/global/model/graph/CjsGraph.js";
import { CjsSchema } from "../../../npm/dist/blue/schema/index.js";
import { genericDefaults } from "../../../npm/dist/character/factory/defaults/generic.js";
import { CjsCharacterTextureRoles } from "../../../npm/dist/character/library/CjsCharacterTextureRoles.js";
import { TriBatchType } from "../../../npm/dist/global/consts/graphics/index.js";
import { Tr2Effect } from "../../../npm/dist/trinity/index.js";
import { Fixture, f32, floats, i32 } from "../../support/blackFixture.js";
import { installPartsLibrary } from "../../support/partsLibrary.js";

const ROOT = "res:/graphics/character/female/paperdoll/";
const MODEL = ROOT + "topinner/torso_nude/torso_nude.black", FLOATCLIP = ROOT + "topinner/torso_float/torso_float.black";
const HELDCLIP = ROOT + "topinner/torso_held/torso_held.black", UNKNOWN = ROOT + "topinner/torso_other/torso_other.black";
const BRDF = "res:/texture/global/brdflibrary.dds", NDOTL = "res:/texture/global/ndotllibrary.png";
const ONE = [ 1, 1, 1, 1 ], IDENTITY = [ 0, 0, 1, 1 ];
const SHADERS = "res:/graphics/effect/managed/interior/avatar/";

/**
 * A skinned model written by hand: one mesh whose areas cover each case the defaults and rules tell apart.
 * @param {{ clip?: ?number, shellShader?: string }} [options] The shell's authored float `DecalClip` (null for none) and
 *   its shader.
 * @returns {Uint8Array} The `.black`.
 */
function model({ clip = null, shellShader = "SkinnedAvatarBRDFDoubleLinear.fx" } = {})
{
    const f = new Fixture();
    let reference = 2;
    const texture = (name, path) => f.Object(reference++, "TriTextureParameter", [ [ "name", f.S(name) ], [ "resourcePath", f.S(path) ] ]);
    const area = (name, shader, uv, { textures = [], decalClip = null, gloss = null } = {}) => f.Object(reference++, "Tr2MeshArea", [
        [ "name", f.S(name) ], [ "index", i32(0) ], [ "count", i32(1) ],
        [ "effect", f.Object(reference++, "Tr2Effect", [
            [ "effectFilePath", f.S(SHADERS + shader) ],
            [ "parameters", f.List([
                ...(uv ? [ f.Object(reference++, "Tr2Vector4Parameter", [ [ "name", f.S("TransformUV0") ], [ "value", floats(uv) ] ]) ] : []),
                ...(decalClip !== null ? [ f.Object(reference++, "Tr2FloatParameter", [ [ "name", f.S("DecalClip") ], [ "value", f32(decalClip) ] ]) ] : []),
                ...(gloss !== null ? [ f.Object(reference++, "Tr2Vector4Parameter", [ [ "name", f.S("Gloss") ], [ "value", floats([ gloss, gloss, gloss, gloss ]) ] ]) ] : [])
            ]) ],
            [ "resources", f.List(textures.map(([ textureName, path ]) => texture(textureName, path))) ]
        ]) ]
    ]);
    const mesh = f.Object(reference++, "Tr2Mesh", [
        [ "name", f.S("TorsoShape") ],
        [ "opaqueAreas", f.List([
            // The content's usual slots: Fresnel authored empty, NdotL authored.
            area("skin", "SkinnedAvatarBRDFDoubleLinear.fx", [ 0, 0, 0.5, 1 ], { textures: [ [ "FresnelLookupMap", "" ], [ "ColorNdotLLookupMap", NDOTL ] ] }),
            area("whole", "SkinnedAvatarBRDFLinear.fx", IDENTITY, { textures: [ [ "ColorNdotLLookupMap", "res:/authored.png" ] ], gloss: 0.7 }),
            area("brow", "SkinnedAvatarBRDFLinear.fx", [ 0.5, 0, 1, 0.5 ]),
            area("unplaced", "SkinnedAvatarBRDFLinear.fx", null),
            f.Object(reference++, "Tr2MeshArea", [ [ "name", f.S("bare") ], [ "index", i32(0) ], [ "count", i32(1) ] ])
        ]) ],
        [ "decalAreas", f.List([ area("seam", "SkinnedAvatarBRDFDoubleLinear.fx", [ 0, 0, 0.5, 1 ]) ]) ],
        [ "transparentAreas", f.List([
            area("shell", shellShader, [ 0, 0, 0.5, 1 ], { decalClip: clip }),
            area("band", "SkinnedAvatarBRDFLinear.fx", [ 0.5, 0.5, 0.75, 1 ]),
            area("helmet", "GlassShader.fx", [ 0.75, 0.75, 0.875, 1 ]),
            area("cards", "SkinnedAvatarHair_Detailed.fx", [ 0.5, 0.5, 0.75, 1 ])
        ]) ]
    ]);
    return f.Finish(f.Object(1, "Tr2SkinnedModel", [ [ "meshes", f.List([ mesh ]) ] ]));
}

/** The installed parts library over a build holding the models. */
const library = t => installPartsLibrary(t, ROOT, [ MODEL, FLOATCLIP, HELDCLIP, UNKNOWN ], { text: {
    [MODEL]: model(), [FLOATCLIP]: model({ clip: 0 }), [HELDCLIP]: model({ clip: 1 }), [UNKNOWN]: model({ shellShader: "Unknown.fx" })
} }).library;

/** A model's areas for a category, by name. */
async function areas(installed, category, path = MODEL)
{
    const answer = await installed.FetchModelAreas(path, category);
    return Object.fromEntries(answer.meshes[0].areas.map(area => [ area.name, area ]));
}

test("an authored rect is placed in the atlas region it lies in, relative to it; the whole image is its own place", () =>
{
    const roles = new CjsCharacterLibraryManager().GetTextureRoles(), place = transform => CjsCharacterTextureRoles.placeInRegion(roles, transform);
    assert.deepEqual(place([ 0, 0, 0.5, 1 ]), { region: "body", transform: IDENTITY });
    assert.deepEqual(place([ 0.5, 0, 1, 0.5 ]), { region: "head", transform: IDENTITY });
    assert.deepEqual(place([ 0.75, 0.75, 0.875, 1 ]), { region: "acc", transform: [ 0, 0.5, 0.5, 1 ] });
    assert.equal(place([ 0.5, 0.5, 0.7505, 1 ]).region, "hair", "authored floats match within the data's tolerance");
    assert.equal(place([ 0.5, 0.5, 0.752, 1 ]), null, "and no further");
    assert.deepEqual(place(IDENTITY), { region: "identity", transform: IDENTITY });
    assert.equal(place([ 0.25, 0.25, 0.75, 0.75 ]), null, "a rect across regions lies in none");
});

test("an authored area's setup: the resolved values its effect does not already hold", async t =>
{
    const torso = await areas(library(t), "topinner");
    assert.deepEqual(Object.keys(torso), [ "skin", "whole", "brow", "unplaced", "bare", "seam", "shell", "band", "helmet", "cards" ], "in GetAreas order by batch type");
    assert.deepEqual([ torso.skin.batchType, torso.seam.batchType, torso.shell.batchType ], [ 0, 1, 2 ]);
    assert.deepEqual([ torso.skin.shader, torso.skin.region, torso.whole.region, torso.unplaced.region ], [ "skinnedavatarbrdfdoublelinear.fx", "body", "identity", null ]);
    assert.deepEqual(torso.skin.setup, { textures: { FresnelLookupMap: BRDF }, parameters: { TransformUV0: IDENTITY } },
        "the empty Fresnel slot takes the default, the authored NdotL stays, the rect becomes its placement");
    assert.deepEqual(torso.whole.setup, { textures: { FresnelLookupMap: BRDF }, parameters: {} }, "an authored texture wins; the identity is already placed");
    assert.deepEqual(torso.unplaced.setup, { textures: { FresnelLookupMap: BRDF, ColorNdotLLookupMap: NDOTL }, parameters: {} }, "no slots: every default");
    assert.deepEqual([ torso.seam.setup.parameters.DecalClip, torso.shell.setup.parameters.DecalClip ], [ ONE, ONE ],
        "a body carrier's decal and transparent DoubleLinear areas clip");
    assert.equal(torso.skin.setup.parameters.DecalClip, undefined, "its opaque one does not");
    assert.equal(torso.band.setup.parameters.DecalClip, undefined, "the hair rule needs the hair category");
    assert.deepEqual(torso.helmet.setup.parameters.TransformUV0, [ 0, 0.5, 0.5, 1 ], "outside hair, the accessory-region placement");
    assert.deepEqual(torso.cards.setup, { textures: {}, parameters: { TransformUV0: IDENTITY } }, "a shader with no defaults or rules: only the placement");
    assert.deepEqual([ torso.bare.shader, torso.bare.effect, torso.bare.region, torso.bare.setup ], [ "", "", null, { textures: {}, parameters: {} } ],
        "an area without an effect has nothing to set");
});

test("the same model for a hair style: its BRDF areas in the hair or body region clip, its accessory-region glass samples whole", async t =>
{
    const installed = library(t);
    const hair = await areas(installed, "hair");
    assert.deepEqual([ hair.band.setup.parameters.DecalClip, hair.skin.setup.parameters.DecalClip ], [ ONE, ONE ]);
    assert.equal(hair.whole.setup.parameters.DecalClip, undefined, "the whole image is not the hair or body region");
    assert.equal(hair.brow.setup.parameters.DecalClip, undefined, "nor is the head region");
    assert.equal(hair.unplaced.setup.parameters.DecalClip, undefined, "an unplaced area is in no region");
    assert.equal(hair.cards.setup.parameters.DecalClip, undefined, "the hair shader has no rule");
    assert.deepEqual(hair.helmet.setup.parameters.TransformUV0, IDENTITY);
    assert.equal((await areas(installed, "topinner")).band.setup.parameters.DecalClip, undefined, "each category its own answer");
});

test("an authored float is held at its value; a rule that would change it is an error; so is a shader without generic data", async t =>
{
    const installed = library(t);
    assert.equal((await areas(installed, "topinner", HELDCLIP)).shell.setup.parameters.DecalClip, undefined, "an authored float DecalClip 1 already holds the rule's value");
    await assert.rejects(installed.FetchModelAreas(FLOATCLIP, "topinner"), /Area shell of .*torso_float\.black authors DecalClip as other than a Vector4/);
    await assert.rejects(installed.FetchModelAreas(UNKNOWN, "topinner"), /No generic area shader data for unknown\.fx/);
});

test("a new part resolves the same way from the values given for it, and from none", () =>
{
    // No public door makes a new part yet (plan § 6: placeholder library items); this is the merge it will use.
    const fresh = new CjsCharacterLibraryManager();
    const resolve = (provided, category = "topinner") => fresh._ResolveAreaValues("skinnedavatarbrdfdoublelinear.fx", category, TriBatchType.TRIBATCHTYPE_TRANSPARENT, provided);
    assert.deepEqual(resolve({ textures: {}, parameters: {} }),
        { region: null, textures: { FresnelLookupMap: BRDF, ColorNdotLLookupMap: NDOTL }, parameters: { DecalClip: ONE } }, "nothing given: the defaults and the rule");
    assert.deepEqual(resolve({ textures: { ColorNdotLLookupMap: "res:/given.png" }, parameters: { TransformUV0: [ 0, 0, 0.5, 1 ], Gloss: [ 2, 2, 2, 2 ] } }),
        { region: "body", textures: { FresnelLookupMap: BRDF, ColorNdotLLookupMap: "res:/given.png" }, parameters: { TransformUV0: IDENTITY, Gloss: [ 2, 2, 2, 2 ], DecalClip: ONE } },
        "given values over the defaults, the placement over the given rect, the rule last");
});

test("the drape's decal areas sample the body atlas whole and clip as a decal, by the drape's rule", () =>
{
    const fresh = new CjsCharacterLibraryManager();
    // The drape authors TransformUV0 [ 0, 0, 0.5, 1 ] and no DecalClip (build 3698585).
    const drape = fresh._ResolveAreaValues("skinnedavatarbrdfdoublelinear.fx", "dependants/drape", TriBatchType.TRIBATCHTYPE_DECAL,
        { textures: {}, parameters: { TransformUV0: [ 0, 0, 0.5, 1 ] } });
    assert.deepEqual(drape.parameters, { TransformUV0: [ 0, 0, 1, 1 ], DecalClip: [ 1, 0, 0, 0 ] });
    const top = fresh._ResolveAreaValues("skinnedavatarbrdfdoublelinear.fx", "topmiddle", TriBatchType.TRIBATCHTYPE_DECAL,
        { textures: {}, parameters: { TransformUV0: [ 0, 0, 0.5, 1 ] } });
    assert.equal(top.parameters.DecalClip, undefined, "the rule picks the drape's category only");
    const outside = fresh._ResolveAreaValues("skinnedavatarbrdfdoublelinear.fx", "dependants/drape", TriBatchType.TRIBATCHTYPE_DECAL,
        { textures: {}, parameters: { TransformUV0: [ 0.25, 0.25, 0.75, 0.75 ] } });
    assert.deepEqual(outside.parameters.TransformUV0, [ 0, 0, 1, 1 ], "the whole atlas, whatever the authored rect");
});

test("a library's generic area shader replaces the shipped default of that shader", async t =>
{
    const installed = library(t);
    const generic = installed.GetLibrary();
    generic.generic.areaShaders.push(Object.assign(new CjsCharacterDataShader(), {
        shader: "skinnedavatarbrdflinear.fx",
        defaultParameters: [ Object.assign(new CjsCharacterDataParameter(), { name: "Gloss", value: [ 0.7, 0.7, 0.7, 0.7 ] }) ]
    }));
    installed.InstallLibrary(generic);
    const torso = await areas(installed, "topinner");
    assert.deepEqual(torso.whole.setup, { textures: {}, parameters: {} }, "its authored Gloss 0.7, a float32, already holds the default 0.7");
    assert.deepEqual(torso.brow.setup.parameters.Gloss, [ 0.7, 0.7, 0.7, 0.7 ], "an area without one takes it");
    assert.deepEqual(Object.keys(torso.skin.setup.textures), [ "FresnelLookupMap" ], "other shaders keep their defaults");
});

test("a default does not replace a parameter the area authors as a float", async t =>
{
    const installed = library(t);
    const generic = installed.GetLibrary();
    generic.generic.areaShaders.push(Object.assign(new CjsCharacterDataShader(), {
        shader: "skinnedavatarbrdfdoublelinear.fx",
        defaultParameters: [ Object.assign(new CjsCharacterDataParameter(), { name: "DecalClip", value: [ 0, 0, 0, 0 ] }) ]
    }));
    installed.InstallLibrary(generic);
    // A garment category, which no rule picks: only the default applies.
    const outer = await areas(installed, "outer", HELDCLIP);
    assert.equal(outer.shell.setup.parameters.DecalClip, undefined, "the authored float DecalClip 1 is given, so it stays");
    assert.deepEqual(outer.seam.setup.parameters.DecalClip, [ 0, 0, 0, 0 ], "an area without one takes the default");
});

test("applying a setup sets each texture and each parameter as a Vector4, over the authored one", () =>
{
    // A real effect as a .black authors it: an empty Fresnel slot and a TransformUV0.
    const effect = new Tr2Effect();
    effect.SetResourceTexture2D("FresnelLookupMap", "");
    effect.SetParameter__Vector4("TransformUV0", [ 0, 0, 0.5, 1 ]);

    CjsPaperDollInstance.applyAreaSetup(effect, { textures: { FresnelLookupMap: BRDF }, parameters: { TransformUV0: IDENTITY, DecalClip: ONE } });
    assert.equal(effect.GetResourceByName("FresnelLookupMap").resourcePath, BRDF);
    const named = name => effect.parameters.filter(parameter => parameter.name === name);
    assert.equal(named("TransformUV0").length, 1, "the authored TransformUV0 takes the value; no second one");
    assert.deepEqual(Array.from(named("TransformUV0")[0].value), IDENTITY);
    assert.deepEqual(Array.from(named("DecalClip")[0].value), ONE);
});

test("the shipped area shaders are in the generic's own shape, built into records by the graph", () =>
{
    const shipped = CjsGraph.from(CjsCharacterGeneric, genericDefaults).areaShaders;
    assert.deepEqual(shipped.map(shader => CjsSchema.getClassName(shader.constructor)), shipped.map(() => "CjsCharacterDataShader"));
    assert.ok(shipped.some(shader => shader.shader === "skinnedavatarbrdf.fx"), "the generic head's shader is shipped");
});
