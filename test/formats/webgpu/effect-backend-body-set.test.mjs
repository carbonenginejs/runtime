import assert from "node:assert/strict";
import test from "node:test";

import { CjsWebgpuFormat } from "../../../src/formats/webgpu/index.js";
import { buildMinimalStagedEffectBytes } from "./synthetic.js";

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
    const pkg = CjsWebgpuFormat.read(result.bytes, {
        emit: CjsWebgpuFormat.OUTPUT_RAW
    });
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
    const pkg = CjsWebgpuFormat.read(result.bytes, {
        emit: CjsWebgpuFormat.OUTPUT_RAW
    });
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
    ), /requires complete version-15 source reflection/u);
});

test("unknown package modes still fail closed", () =>
{
    assert.throws(() => CjsWebgpuFormat.buildEffect(allBodyEffectBytes(), {
        source: "synthetic.sm_depth",
        mode: "partial"
    }), /supported modes are selected and all/u);
});

test("a tampered all-body graph fails validation", () =>
{
    const result = buildAllBodyPackage();
    const pkg = CjsWebgpuFormat.read(result.bytes, {
        emit: CjsWebgpuFormat.OUTPUT_RAW
    });
    const chunks = pkg.chunks.map((chunk) => [
        chunk.tag,
        chunk.tag === "RBLB"
            ? Uint8Array.from(chunk.bytes)
            : pkg.GetJson(chunk.tag)
    ]);
    const tampered = chunks.map(([ tag, value ]) =>
    {
        if (tag !== "WGSB") return [ tag, value ];

        return [ tag, { ...value, bodies: value.bodies.slice(1) } ];
    });

    assert.throws(
        () => CjsWebgpuFormat.read(CjsWebgpuFormat.build(tampered)),
        /WGSB|body-set counts|does not cover/u
    );
});

test("a selected-mode package cannot smuggle in an all-body graph", () =>
{
    const allBody = buildAllBodyPackage();
    const pkg = CjsWebgpuFormat.read(allBody.bytes, {
        emit: CjsWebgpuFormat.OUTPUT_RAW
    });
    const chunks = pkg.chunks.map((chunk) => [
        chunk.tag,
        chunk.tag === "RBLB"
            ? Uint8Array.from(chunk.bytes)
            : pkg.GetJson(chunk.tag)
    ]).map(([ tag, value ]) =>
    {
        if (tag !== "INFO" && tag !== "META") return [ tag, value ];

        return [ tag, { ...value, bodyMode: "selected" } ];
    });

    assert.throws(
        () => CjsWebgpuFormat.read(CjsWebgpuFormat.build(chunks)),
        /selected-mode packages cannot declare an all-body backend graph/u
    );
});

test("accessors stay closed until the package passes validation", async () =>
{
    const { CewgpuPackage } = await import("../../../src/formats/webgpu/core/cewgpu/CewgpuPackage.js");
    const result = buildAllBodyPackage();
    const direct = new CewgpuPackage();

    assert.equal(direct.Read(result.bytes), true, "container decodes");
    assert.ok(direct.info, "chunks remain readable");

    // A container read outside the validated entry point must not hydrate.
    assert.equal(direct.GetPortableEffectReflection(0), null);
    assert.equal(direct.GetBackendBodyPrograms(0), null);

    // The same bytes through the validating reader do hydrate.
    const validated = CjsWebgpuFormat.read(result.bytes, {
        emit: CjsWebgpuFormat.OUTPUT_RAW
    });

    assert.ok(validated.GetPortableEffectReflection(0));
    assert.ok(validated.GetBackendBodyPrograms(0));
});
