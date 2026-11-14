import test from "node:test";
import assert from "node:assert/strict";
import { CjsCharacterLibraryManager, CjsCharacterMorphCorrections } from "../../../npm/dist/character/index.js";
import file from "../../../npm/dist/character/factory/defaults/morphCorrections.json.js";

/** The rules of the defaults file, by id. */
const fileRules = () => structuredClone(file.corrections);

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

test("the rules come from data: the defaults file, which only the library loads", () =>
{
    assert.deepEqual(Object.keys(fileRules()), [ "male-head-weight-face", "male-head-weight-mouth" ]);
    const library = new CjsCharacterLibraryManager();
    assert.deepEqual(library._morphCorrections, fileRules());
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

test("the library hands the bake corrected offsets, or none once its corrections are cleared", () =>
{
    const base = Float32Array.of(-.01, 0, 0, .01, 0, 0), position = Float32Array.of(0, -.003, 0, -.0002, -.0001, 0);
    const source = { GetMeshName: () => "TeethLower_GeoShape", GetMeshMorphName: () => "fatShape", GetMorphTargetOffsets: () => ({ base, position, normal: null }) };
    const path = "res:/graphics/character/male/paperdoll/head/head_generic/head_generic.gr2";
    const library = Object.create(CjsCharacterLibraryManager.prototype);
    library._morphCorrections = fileRules();
    assert.ok(library.GetCorrectedMorphOffsets(source, path, 0, 0).changed > 0);
    library._morphCorrections = {};
    assert.equal(library.GetCorrectedMorphOffsets(source, path, 0, 0), null);
});
