// The generic head's eye-wet effect is borrowed from a baked character-select model (a workaround the library holds as
// data: sexes.json eyeWet); the library names the two areas, and fails when either is missing.
import test from "node:test";
import assert from "node:assert/strict";
import { CjsCharacterLibraryManager } from "../../../npm/dist/character/index.js";
import { TriBatchType } from "../../../npm/dist/global/consts/graphics/index.js";
import { BlueResMan } from "../../../npm/dist/blue/index.js";
import "../../../npm/dist/trinity/index.js";
import { Fixture, floats, i32 } from "../../support/blackFixture.js";
import { installPartsLibrary } from "../../support/partsLibrary.js";

const ROOT = "res:/graphics/character/female/paperdoll/";
const HEAD = ROOT + "head/head_generic/head_generic.black", GEOMETRY = "res:/Graphics/Character/Female/Paperdoll/head/head_generic/Head_Generic.gr2";
const { eyeWet } = CjsCharacterLibraryManager.sexFacts("female");
const SHADERS = "res:/graphics/effect/managed/interior/avatar/";

/** One mesh with one transparent area, or none. */
function mesh(f, next, name, meshIndex, geometry, transparent, shader = "SkinnedAvatarBRDF.fx")
{
    const area = () => f.Object(next(), "Tr2MeshArea", [ [ "name", f.S(name) ], [ "index", i32(0) ], [ "count", i32(1) ],
        [ "effect", f.Object(next(), "Tr2Effect", [ [ "effectFilePath", f.S(SHADERS + shader) ],
            [ "parameters", f.List([ f.Object(next(), "Tr2Vector4Parameter", [ [ "name", f.S("TransformUV0") ], [ "value", floats([ 0.5, 0, 1, 0.5 ]) ] ]) ]) ] ]) ] ]);
    return f.Object(next(), "Tr2Mesh", [ [ "name", f.S(name) ], [ "meshIndex", i32(meshIndex) ], [ "geometryResPath", f.S(geometry) ],
        [ "transparentAreas", f.List(transparent ? [ area() ] : []) ] ]);
}

/** The generic head: its eye-wet mesh at meshIndex 8, and a face. */
function head(withWet = true)
{
    const f = new Fixture();
    let reference = 2;
    const next = () => reference++;
    return f.Finish(f.Object(1, "Tr2SkinnedModel", [ [ "meshes", f.List([
        mesh(f, next, "Face", 0, GEOMETRY, false),
        mesh(f, next, "EyeWet_GeoShape", 8, GEOMETRY, withWet)
    ]) ] ]));
}

/** The character-select model: its meshes at one index, on the head's geometry (in other case) and on a garment's. */
function reference(wetIndex = 8)
{
    const f = new Fixture();
    let next = 2;
    const n = () => next++;
    const lower = GEOMETRY.toLowerCase();
    return f.Finish(f.Object(1, "Tr2IntSkinnedObject", [ [ "visualModel", f.Object(n(), "Tr2SkinnedModel", [ [ "meshes", f.List([
        mesh(f, n, "jacket", wetIndex, "res:/graphics/character/female/paperdoll/outer/jacket/jacket.gr2", true),
        mesh(f, n, "head5", wetIndex, lower, true, "EyeWetnessShader.fx")
    ]) ] ]) ] ]));
}

test("the eye-wet borrow: the head's eye-wet mesh, and the reference's mesh of the same meshIndex on the head's geometry", async t =>
{
    const { library } = installPartsLibrary(t, ROOT, [ HEAD, eyeWet.reference ], { text: { [HEAD]: head(), [eyeWet.reference]: reference() } });
    assert.deepEqual(await library.FetchEyeWet("female"), {
        head: { model: HEAD, mesh: "EyeWet_GeoShape", batchType: TriBatchType.TRIBATCHTYPE_TRANSPARENT, area: 0 },
        reference: { model: eyeWet.reference, mesh: "head5", batchType: TriBatchType.TRIBATCHTYPE_TRANSPARENT, area: 0 }
    }, "the reference's garment mesh of the same index is passed over: only the geometry tells them apart");
});

test("the borrow is read once", async t =>
{
    const { library } = installPartsLibrary(t, ROOT, [ HEAD, eyeWet.reference ], { text: { [HEAD]: head(), [eyeWet.reference]: reference() } });
    await library.FetchEyeWet("female");
    // resMan's object cache would answer a second load without a read, so count the loads themselves.
    const loads = BlueResMan.resManLoadObjectCalls;
    await library.FetchEyeWet("female");
    assert.equal(BlueResMan.resManLoadObjectCalls, loads, "the second query loads nothing");
});

test("a missing eye-wet area on either side, or a reference of another class, is an error", async t =>
{
    const missingHead = installPartsLibrary(t, ROOT, [ HEAD, eyeWet.reference ], { text: { [HEAD]: head(false), [eyeWet.reference]: reference() } }).library;
    await assert.rejects(missingHead.FetchEyeWet("female"), /No one eye-wet area EyeWet_GeoShape in .*head\/head_generic\//u);
    const missingReference = installPartsLibrary(t, ROOT, [ HEAD, eyeWet.reference ], { text: { [HEAD]: head(), [eyeWet.reference]: reference(3) } }).library;
    await assert.rejects(missingReference.FetchEyeWet("female"), /No one eye-wet area of meshIndex 8 in .*unique\.black/u);
    // A reference that is a bare skinned model (the head's own file), with no object around it.
    const notSkinned = installPartsLibrary(t, ROOT, [ HEAD, eyeWet.reference ], { text: { [HEAD]: head(), [eyeWet.reference]: head() } }).library;
    await assert.rejects(notSkinned.FetchEyeWet("female"), /is a Tr2SkinnedModel, not a Tr2IntSkinnedObject/u);
});
