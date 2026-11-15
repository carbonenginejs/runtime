import test from "node:test";
import assert from "node:assert/strict";
import { CjsCharacterDataMorphCorrection, CjsCharacterDataMorphCorrectionMesh, CjsCharacterLibrary, CjsCharacterLibraryManager, CjsCharacterMorphCorrections } from "../../../npm/dist/character/index.js";

/** The shipped corrections in force, by name, as the library compiles them. */
const fileRules = () => structuredClone(new CjsCharacterLibraryManager()._MorphCorrections());

const { carryOffsets, correctOffsets, findMirrorPartners } = CjsCharacterMorphCorrections;
const parameters = { mirrorTolerance: 5e-4, seamPrecision: 1e6, cell: 1 / 2000, carrySmoothing: .005 };
const REGION = [ { center: [ -.01, 0, 0 ], inner: .002, outer: .004 } ];

// A bad vertex at -x with a good partner at +x, a seam copy of the bad vertex, and one far away.
const base = Float32Array.of(-.01, 0, 0, .01, 0, 0, -.01, 0, 0, .1, 0, 0);
const position = Float32Array.of(0, -.004, 0, -.001, .001, .002, 0, -.004, 0, .003, 0, 0);

test("mirror partners are found within the rule's tolerance, and a far vertex has none", () =>
{
    assert.deepEqual(Array.from(findMirrorPartners(base, parameters)), [ 1, 0, 1, -1 ]);
});

test("a region takes the mirrored offset, seam copies agree, and the input stays intact", () =>
{
    const original = position.slice();
    const result = correctOffsets({ base, position, normal: null }, REGION, parameters);
    for (const vertex of [ 0, 2 ]) assert.deepEqual(Array.from(result.position.slice(vertex * 3, vertex * 3 + 3)), [ position[3] * -1, position[4], position[5] ].map(Math.fround));
    for (const vertex of [ 1, 3 ]) assert.deepEqual(Array.from(result.position.slice(vertex * 3, vertex * 3 + 3)), Array.from(position.slice(vertex * 3, vertex * 3 + 3)));
    assert.equal(result.changed, 2);
    assert.deepEqual(position, original);
});

test("an attached mesh takes the smoothed skin change", () =>
{
    const corrected = position.slice();
    corrected[1] = .001;
    const attached = { base: Float32Array.of(-.0101, 0, 0, .1, 0, 0), position: new Float32Array(6) };
    const result = carryOffsets({ base, position }, corrected, attached, parameters);
    assert.equal(result.changed, 1);
    assert.ok(Math.abs(result.position[1] - .0025) < 1e-4);
    assert.equal(result.position[4], 0);
});

test("a right region mirrors the right half from the left and leaves the left untouched", () =>
{
    const base = Float32Array.of(-.01, 0, 0, .01, 0, 0), position = Float32Array.of(0, -.003, 0, -.0002, -.0001, 0);
    const { position: repaired } = correctOffsets({ base, position, normal: null }, [ { name: "right", right: { inner: .004, outer: .0005 } } ], parameters);
    assert.deepEqual(Array.from(repaired.slice(0, 3), value => +value.toFixed(6)), [ .0002, -.0001, 0 ]);
    assert.deepEqual(Array.from(repaired.slice(3)), Array.from(position.slice(3)));
});

test("the rules come from data: the shipped generic's records, in the form the corrections engine reads", () =>
{
    const rules = fileRules();
    assert.deepEqual(Object.keys(rules), [ "male-head-weight-face", "male-head-weight-mouth" ]);
    const face = rules["male-head-weight-face"], mouth = rules["male-head-weight-mouth"];
    assert.deepEqual(Object.keys(face.meshes), [ "meshShape", "Eyelashes_GeoShape", "EyeWet_GeoShape", "EyeShadow_GeoShape", "Tearducts_GeoShape" ]);
    assert.deepEqual(face.meshes.Eyelashes_GeoShape, { carry: "meshShape" });
    assert.deepEqual(face.meshes.meshShape.mirror[0], { name: "right nostril", center: [ -0.016, 1.728, 0.13 ].map(Math.fround), inner: Math.fround(0.012), outer: Math.fround(0.022) });
    assert.deepEqual(mouth.meshes.Tongue_GeoShape.mirror, [ { name: "right half of the mouth", right: { inner: Math.fround(0.004), outer: Math.fround(0.0005) } } ]);
    assert.deepEqual(face.meshes.meshShape.mirror[1], { name: "left upper lid", center: [ 0.0375, 1.771, 0.12 ].map(Math.fround), inner: Math.fround(0.006), outer: Math.fround(0.014) });
    assert.deepEqual(Object.keys(mouth.meshes), [ "TeethLower_GeoShape", "Tongue_GeoShape", "TeethUpper_GeoShape" ]);
    assert.deepEqual(mouth.meshes.TeethUpper_GeoShape, mouth.meshes.TeethLower_GeoShape);
    const model = "res:/graphics/character/male/paperdoll/head/head_generic/head_generic.gr2";
    assert.deepEqual([ face.model, face.morph, mouth.model, mouth.morph ], [ model, "^fatShape", model, "^fatShape" ]);
    const tuning = { mirrorTolerance: Math.fround(0.0005), seamPrecision: 1000000, cell: Math.fround(0.0005), carrySmoothing: Math.fround(0.005) };
    assert.deepEqual([ face.parameters, mouth.parameters ], [ tuning, tuning ]);
    const library = new CjsCharacterLibraryManager();
    assert.equal(typeof library.SetMorphCorrections, "undefined", "no public setter");
    assert.equal(typeof library.GetMorphCorrections, "undefined", "no public getter");
});

test("offsetsFor applies a rule in force to its model and mesh only", () =>
{
    const base = Float32Array.of(-.01, 0, 0, .01, 0, 0), position = Float32Array.of(0, -.003, 0, -.0002, -.0001, 0);
    const source = { GetMeshName: () => "TeethLower_GeoShape", GetMeshMorphName: () => "fatShape", GetMorphTargetOffsets: () => ({ base, position, normal: null }) };
    const path = "res:/Graphics/Character/Male/Paperdoll/Head/Head_Generic/Head_Generic.gr2";
    const rules = fileRules();
    assert.ok(CjsCharacterMorphCorrections.offsetsFor(source, path, 0, 0, rules).changed > 0);
    assert.equal(CjsCharacterMorphCorrections.offsetsFor(source, "res:/other.gr2", 0, 0, rules), null);
    assert.equal(CjsCharacterMorphCorrections.offsetsFor(source, path, 0, 0, {}), null);
});

test("the library hands the bake corrected offsets, or none once an installed correction of the name replaces it", () =>
{
    const base = Float32Array.of(-.01, 0, 0, .01, 0, 0), position = Float32Array.of(0, -.003, 0, -.0002, -.0001, 0);
    const source = { GetMeshName: () => "TeethLower_GeoShape", GetMeshMorphName: () => "fatShape", GetMorphTargetOffsets: () => ({ base, position, normal: null }) };
    const path = "res:/graphics/character/male/paperdoll/head/head_generic/head_generic.gr2";
    const installed = new CjsCharacterLibrary();
    const library = new CjsCharacterLibraryManager(installed);
    assert.ok(library.GetCorrectedMorphOffsets(source, path, 0, 0).changed > 0);
    // The same model and morph with no meshes: a field-by-field merge would keep the shipped meshes and still correct.
    const replacement = Object.assign(new CjsCharacterDataMorphCorrection(), { name: "male-head-weight-mouth", model: path, morph: "^fatShape",
        mirrorTolerance: .0005, seamPrecision: 1e6, cell: .0005, carrySmoothing: .005 });
    installed.generic.morphCorrections.push(replacement);
    library.InstallLibrary(installed);
    assert.equal(library.GetCorrectedMorphOffsets(source, path, 0, 0), null, "replaced whole, not merged");
});

test("a correction that would compute nothing throws instead: tuning not above 0, or a mesh with neither carry nor region", () =>
{
    const installed = new CjsCharacterLibrary();
    const correction = Object.assign(new CjsCharacterDataMorphCorrection(), { name: "custom", model: "res:/custom.gr2", morph: "^fatShape" });
    installed.generic.morphCorrections.push(correction);
    assert.throws(() => new CjsCharacterLibraryManager(installed)._MorphCorrections(), /Morph correction custom needs every tuning number above 0/);
    Object.assign(correction, { mirrorTolerance: .0005, seamPrecision: 1e6, cell: .0005, carrySmoothing: .005 });
    correction.meshes.push(Object.assign(new CjsCharacterDataMorphCorrectionMesh(), { name: "meshShape" }));
    assert.throws(() => new CjsCharacterLibraryManager(installed)._MorphCorrections(), /gives mesh meshShape neither a carry nor a region/);
});
