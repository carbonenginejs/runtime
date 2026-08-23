import assert from "node:assert/strict";
import test from "node:test";

import { CjsWebgpuFormat } from "../../../../../src/resource/formats/webgpu/index.js";
import { buildMinimalStagedEffectBytes } from "./synthetic.js";
import { readContainer } from "./support/readContainer.js";

function allBodyEffectBytes()
{
    return buildMinimalStagedEffectBytes({
        version: 15,
        permutations: [ {
            name: "QUALITY",
            options: [ "LOW", "HIGH" ],
            defaultOption: 0,
            description: "quality",
            type: 1
        } ],
        bodyPassCounts: [ 1, 2 ],
        distinctBodyRanges: true
    });
}

function buildAllBodyPackage(options = {})
{
    return CjsWebgpuFormat.buildEffect(allBodyEffectBytes(), {
        source: "synthetic.sm_depth",
        mode: "all",
        ...options
    });
}

test("all-body mode translates every unique source body", () =>
{
    const result = buildAllBodyPackage();

    assert.equal(result.info.bodyMode, "all");
    assert.equal(result.info.sourceBodyCoverage, "all-unique");
    assert.equal(result.info.backendBodyCoverage, "all-unique");
    assert.equal(result.backendBodySet.coverage.bodies, "all-unique");
    assert.equal(
        result.backendBodySet.bodyCount,
        result.permutationGraph.bodies.length
    );
    assert.equal(
        result.backendBodySet.translatedBodyCount,
        result.backendBodySet.bodyCount
    );
    assert.ok(result.backendBodySet.passUnitCount >= 1);
});

test("all-body mode keeps completeness truthful", () =>
{
    const result = buildAllBodyPackage();

    // Translating every body does not prove the engine realizes them.
    assert.equal(result.info.completeness.sourceComplete, true);
    assert.equal(result.info.completeness.backendComplete, false);
    assert.equal(result.info.completeness.runtimeComplete, false);
});

test("selected mode remains the default and carries no all-body graph", () =>
{
    const result = CjsWebgpuFormat.buildEffect(allBodyEffectBytes(), {
        source: "synthetic.sm_depth"
    });

    assert.equal(result.info.bodyMode, "selected");
    assert.equal(result.info.backendBodyCoverage, "selected");
    assert.equal(result.backendBodySet, null);
    assert.ok(!Object.prototype.hasOwnProperty.call(result.info, "backendBodySet"));
});

test("allPermutations compatibility request selects all-body mode", () =>
{
    const result = CjsWebgpuFormat.buildEffect(allBodyEffectBytes(), {
        source: "synthetic.sm_depth",
        allPermutations: true
    });

    assert.equal(result.info.bodyMode, "all");
    assert.equal(result.qualification.mode, "all");
});

test("every permutation resolves to translated backend programs", () =>
{
    const result = buildAllBodyPackage();
    const pkg = readContainer(result.bytes);
    const bodyKeys = new Set();

    for (let index = 0; index < result.permutationGraph.variants.length; index++)
    {
        const resolved = pkg.GetBackendBodyPrograms(index);

        assert.ok(resolved, `permutation ${index} resolved`);
        assert.equal(resolved.permutationIndex, index);
        assert.equal(resolved.status, "translated");
        assert.ok(resolved.passes.length >= 1);

        for (const pass of resolved.passes)
        {
            assert.ok(pass.shaders.length >= 1);
            assert.ok(pass.layouts.length >= 1);
            assert.ok(typeof pass.shaders[0].code === "string" && pass.shaders[0].code);
        }

        bodyKeys.add(resolved.bodyKey);
    }

    assert.equal(bodyKeys.size, result.permutationGraph.bodies.length);
});

test("the selected body's translated programs equal the WGSL chunk", () =>
{
    const result = buildAllBodyPackage();
    const pkg = readContainer(result.bytes);
    const selected = pkg.GetBackendBodyPrograms();
    const shaders = selected.passes.flatMap((pass) => pass.shaders);

    assert.equal(shaders.length, result.wgsl.shaders.length);

    for (const shader of shaders)
    {
        const expected = result.wgsl.shaders.find((entry) => entry.key === shader.key);

        assert.ok(expected, `WGSL chunk contains ${shader.key}`);
        assert.equal(shader.code, expected.code);
        assert.equal(shader.entryPoint, expected.entryPoint);
    }
});

test("pass translation units are shared between identical passes", () =>
{
    const result = buildAllBodyPackage();
    const totalPasses = result.backendBodySet.bodies
        .reduce((total, body) => total + body.passCount, 0);

    assert.ok(
        result.backendBodySet.passUnitCount <= totalPasses,
        "translation units never exceed the passes that reference them"
    );

    const keys = result.backendBodySet.passUnits.map((unit) => unit.key);

    assert.equal(new Set(keys).size, keys.length, "unit keys are unique");

    for (const body of result.backendBodySet.bodies)
    {
        for (const pass of body.passes)
        {
            assert.ok(keys.includes(pass.unitKey), `${pass.unitKey} exists`);
        }
    }
});

test("all-body mode requires complete version-15 source reflection", () =>
{
    assert.throws(() => CjsWebgpuFormat.buildEffect(
        buildMinimalStagedEffectBytes({ version: 14 }),
        { source: "synthetic.sm_hi", mode: "all" }
    ), /requires a version-15 compiled effect, got version 14/u);
});

test("unknown package modes still fail closed", () =>
{
    assert.throws(() => CjsWebgpuFormat.buildEffect(allBodyEffectBytes(), {
        source: "synthetic.sm_depth",
        mode: "partial"
    }), /supported modes are selected and all/u);
});

test("body accounting cannot disagree with the bodies, because there is one document", () =>
{
    // Three tests stood here: a tampered WGSB body set, a selected-mode package
    // smuggling an all-body graph, and CewgpuPackage's hydration gate. All three
    // asserted that separate projections of one effect still agreed with each
    // other -- WGSB against PGRF, INFO/META bodyMode against WGSB.
    //
    // The record layout makes that question unaskable rather than answering it.
    // There is no stored body set to tamper with and no declared bodyMode to
    // contradict: the bodies ARE the offset table, and the body accounting is
    // counted from them on read. A count derived from the thing it counts cannot
    // disagree with it.
    //
    // What replaces them is the guard that does still have work to do: the bytes
    // themselves must be sound.
    const result = buildAllBodyPackage();
    const container = readContainer(result.bytes);

    const graph = container.permutationGraph;
    const distinctOffsets = new Set(container.carbon.records.map((record) => record.offset));
    assert.equal(graph.bodies.length, distinctOffsets.size);
    assert.equal(
        graph.variants.length,
        container.carbon.records.length,
        "every permutation row is a variant, and the table is dense"
    );
    assert.equal(
        graph.bodies.reduce((sum, body) => sum + body.permutationCount, 0),
        graph.variants.length,
        "every variant resolves to exactly one body"
    );
});

test("a corrupted container is rejected rather than silently misread", () =>
{
    // The negative control for the test above. If tampering produced a readable
    // container, "cannot disagree" would be true and worthless -- the checks
    // would have moved from reconciliation to nothing at all.
    const result = buildAllBodyPackage();

    // Corrupt the last body's bytes. Rule 1 requires a blob to parse to exactly
    // its declared end, so this must not parse clean under either reading.
    const corrupted = Uint8Array.from(result.bytes);
    corrupted[corrupted.length - 2] ^= 0xff;

    let rejected = false;
    try
    {
        const container = readContainer(corrupted);
        for (let index = 0; index < container.carbon.records.length; index += 1)
        {
            container.GetDescription(index);
        }
    }
    catch
    {
        rejected = true;
    }
    assert.ok(rejected, "a corrupted body must fail to parse");
});
