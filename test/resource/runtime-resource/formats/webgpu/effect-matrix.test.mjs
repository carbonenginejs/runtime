import assert from "node:assert/strict";
import test from "node:test";

import {
    enumerateEffectPermutations,
    inspectEffectOffsets,
    parseEffectMatrixArguments,
    validateEffectPermutationAxes
} from "./support/effectMatrixHelpers.js";
import {
    buildEffectPassVariantSeed,
    classifyEffectPassTopology,
    serializeIndependentShader
} from "./support/effectMatrixQualification.js";

test("effect matrix enumerates Carbon mixed-radix permutations in body-index order", () =>
{
    const permutations = enumerateEffectPermutations([
        { name: "A", options: [ "A0", "A1" ] },
        { name: "B", options: [ "B0", "B1", "B2" ] }
    ]);
    assert.equal(permutations.length, 6);
    assert.deepEqual(permutations.map((entry) => entry.optionIndices), [
        [ 0, 0 ], [ 1, 0 ], [ 0, 1 ], [ 1, 1 ], [ 0, 2 ], [ 1, 2 ]
    ]);
    assert.deepEqual(permutations[5].options, [
        { name: "A", value: "A1" },
        { name: "B", value: "B2" }
    ]);
});

test("effect matrix requires one correctly indexed offset record per permutation body", () =>
{
    assert.deepEqual(inspectEffectOffsets([ { index: 0 }, { index: 1 } ], 2), {
        offsetRecords: 2,
        offsetCountMatch: true,
        offsetIndicesMatch: true
    });
    assert.equal(inspectEffectOffsets([ { index: 0 } ], 2).offsetCountMatch, false);
    assert.equal(inspectEffectOffsets([ { index: 1 }, { index: 0 } ], 2).offsetIndicesMatch, false);
});

test("effect matrix admits render and compute pipelines but rejects mixed topology", () =>
{
    assert.equal(classifyEffectPassTopology([ "vertex", "pixel" ]), "render");
    assert.equal(classifyEffectPassTopology([ "pixel", "vertex" ]), "render");
    assert.equal(classifyEffectPassTopology([ "compute" ]), "compute");
    assert.equal(classifyEffectPassTopology([ "vertex", "compute" ]), null);
    assert.equal(classifyEffectPassTopology([ "compute", "compute" ]), null);
    assert.equal(classifyEffectPassTopology([]), null);
});

test("effect matrix retains independent compute thread-group metadata", () =>
{
    const threadGroupSize = [ 1, 1, 1 ];
    const serialized = serializeIndependentShader({
        stage: "compute",
        entryPoint: "main",
        code: "@compute fn main() {}",
        threadGroupSize
    });

    assert.deepEqual(serialized.threadGroupSize, threadGroupSize);
    assert.notEqual(serialized.threadGroupSize, threadGroupSize);
    assert.deepEqual(serializeIndependentShader({
        stage: "vertex",
        entryPoint: "main",
        code: "@vertex fn main() {}"
    }), {
        stage: "vertex",
        entryPoint: "main",
        code: "@vertex fn main() {}"
    });
});

test("effect matrix pass cache separates companion-authorized particle reset", () =>
{
    const stages = [ { stageName: "compute", digest: "same-reset-bytes" } ];
    const standalone = buildEffectPassVariantSeed(
        "Main.pass0",
        stages
    );
    const authorized = buildEffectPassVariantSeed(
        "Main.pass0",
        stages,
        "particle-clear-r32sint-v1"
    );
    assert.notEqual(standalone, authorized);
    assert.match(standalone, /effectContext:none$/u);
    assert.match(authorized, /effectContext:particle-clear-r32sint-v1$/u);
});

test("effect matrix rejects axes that cannot map names and values uniquely", () =>
{
    assert.throws(() => validateEffectPermutationAxes([
        { name: "A", options: [ "OFF" ] },
        { name: "A", options: [ "ON" ] }
    ]), /duplicate permutation axis A/u);
    assert.throws(() => validateEffectPermutationAxes([
        { name: "A", options: [ "OFF", "OFF" ] }
    ]), /duplicate option OFF/u);
    assert.throws(() => validateEffectPermutationAxes([
        { name: "A", options: [ "OFF", 1 ] }
    ]), /non-string or empty option/u);
});

test("effect matrix CLI parses an optional summary and full-report output", () =>
{
    const parsed = parseEffectMatrixArguments([
        "--summary", "--output", "matrix.json", "dx11.sm_lo", "dx12.sm_lo"
    ]);
    assert.equal(parsed.summary, true);
    assert.match(parsed.outputPath, /matrix[.]json$/u);
    assert.match(parsed.dx11Path, /dx11[.]sm_lo$/u);
    assert.match(parsed.dx12Path, /dx12[.]sm_lo$/u);
});

test("effect matrix CLI rejects ambiguous or incomplete arguments", () =>
{
    assert.throws(() => parseEffectMatrixArguments([ "one.sm_lo" ]), /usage/u);
    assert.throws(() => parseEffectMatrixArguments([ "--unknown", "a", "b" ]), /unknown option/u);
    assert.throws(() => parseEffectMatrixArguments([ "--output", "a", "b" ]), /usage/u);
    assert.throws(() => parseEffectMatrixArguments([ "--summary", "--summary", "a", "b" ]), /only be specified once/u);
    assert.throws(() => parseEffectMatrixArguments([ "--output", "a.sm_lo", "a.sm_lo", "b.sm_lo" ]), /must not overwrite/u);
});
