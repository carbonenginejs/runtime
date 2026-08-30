import { test } from "node:test";
import assert from "node:assert/strict";

import CjsWebgpuFormat from "../../../../../src/resource/formats/webgpu/index.js";

function emitted(stage, bindings = [])
{
    return {
        kind: "wgsl-shader",
        format: "CJS_WGSL_SHADER",
        formatVersion: 1,
        source: "synthetic",
        stage,
        entryPoint: "main",
        code: `@${stage} fn main() {}`,
        sourceMap: [ { line: 1, instructionIndex: 0, dxbcOffset: 2 } ],
        program: {
            format: "CJS_TYPED_SHADER",
            formatVersion: 1,
            bindings
        }
    };
}

function binding(resourceKind, generatedSymbol, bindingIndex, extra = {})
{
    return {
        resourceKind,
        generatedSymbol,
        registerSpace: extra.registerSpace ?? 0,
        registerIndex: extra.registerIndex ?? 0,
        group: 0,
        binding: bindingIndex,
        type: extra.type || "sampler",
        ...(extra.identity ? { identity: extra.identity } : {}),
        ...(extra.scopeIdentity ? { scopeIdentity: extra.scopeIdentity } : {}),
        ...(Number.isInteger(extra.structureStride) ? { structureStride: extra.structureStride } : {}),
        ...(extra.buffer ? { buffer: extra.buffer } : {}),
        ...(extra.texture ? { texture: extra.texture } : {}),
        ...(extra.sampler ? { sampler: extra.sampler } : {})
    };
}

const COPYBLIT_BINDINGS = [
    binding("uniform-buffer", "cb0", 0, {
        type: "array<vec4<f32>, 3>",
        buffer: { type: "uniform", hasDynamicOffset: false, minBindingSize: 48 }
    }),
    binding("sampled-resource", "t0", 1, {
        type: "texture_2d<f32>",
        texture: { sampleType: "float", viewDimension: "2d", multisampled: false }
    }),
    binding("sampler", "s0", 2, { sampler: { type: "filtering" } })
];

test("BuildWgslSet freezes deterministic copyblit shaders and layouts", () =>
{
    const vertex = { key: "Main.pass0.vertex", shader: emitted("vertex") };
    const pixel = { key: "Main.pass0.pixel", shader: emitted("fragment", COPYBLIT_BINDINGS) };
    const set = CjsWebgpuFormat.buildWgslSet([ vertex, pixel ]);

    assert.equal(set.format, "CJS_WGSL_SET");
    assert.equal(set.formatVersion, 3);
    assert.deepEqual(set.shaders.map((entry) => [ entry.key, entry.stage, entry.stageType ]), [
        [ "Main.pass0.vertex", "vertex", 0 ],
        [ "Main.pass0.pixel", "fragment", 1 ]
    ]);
    assert.deepEqual(set.layouts[0].bindGroups[0].bindings.map((entry) => [
        entry.generatedSymbol,
        entry.binding,
        entry.visibility
    ]), [
        [ "cb0", 0, [ "fragment" ] ],
        [ "t0", 1, [ "fragment" ] ],
        [ "s0", 2, [ "fragment" ] ]
    ]);
    assert.equal(set.layouts[0].bindGroups[0].bindings[0].buffer.minBindingSize, 48);
    assert.deepEqual(set.layouts[0].bindGroups[0].bindings.map((entry) => entry.scopeIdentity), [
        "uniform-buffer:0:0@fragment",
        "sampled-resource:0:0@fragment",
        "sampler:0:0@fragment"
    ]);
    assert.deepEqual(CjsWebgpuFormat.buildWgslSet([ pixel, vertex ]), set);

    // The package round trip that used to close this test is gone with the chunk
    // format: a container cannot be assembled from an arbitrary WGSL document,
    // because the WGSL set is a *view* over description records rather than a
    // stored chunk. The property it asserted -- shaders and layouts survive the
    // wire unchanged -- is now proven where it actually lives, against real
    // effects, in carbon-webgpu-container.test.js's emitter/reader oracle.
});

test("BuildWgslSet unions compatible cross-stage visibility", () =>
{
    const shared = binding("uniform-buffer", "cb0", 0, {
        identity: "uniform-buffer:0:0",
        scopeIdentity: "uniform-buffer:0:0",
        type: "array<vec4<f32>, 1>",
        buffer: { type: "uniform", hasDynamicOffset: false, minBindingSize: 16 }
    });
    const set = CjsWebgpuFormat.buildWgslSet([
        { key: "Main.pass0.vertex", shader: emitted("vertex", [ shared ]) },
        { key: "Main.pass0.pixel", shader: emitted("fragment", [ shared ]) }
    ]);
    assert.equal(set.layouts[0].bindGroups[0].bindings[0].scopeIdentity, "uniform-buffer:0:0");
    assert.deepEqual(set.layouts[0].bindGroups[0].bindings[0].visibility, [ "vertex", "fragment" ]);
});

test("BuildWgslSet rejects incomplete sharing and mixed identity forms", () =>
{
    const bare = binding("uniform-buffer", "cb0", 0, {
        identity: "uniform-buffer:0:0",
        scopeIdentity: "uniform-buffer:0:0",
        type: "array<vec4<f32>, 1>",
        buffer: { type: "uniform", hasDynamicOffset: false, minBindingSize: 16 }
    });
    assert.throws(() => CjsWebgpuFormat.buildWgslSet([
        { key: "Main.pass0.vertex", shader: emitted("vertex", [ bare ]) }
    ]), /does not cover multiple stages/u);

    const local = { ...bare };
    delete local.scopeIdentity;
    assert.throws(() => CjsWebgpuFormat.buildWgslSet([
        { key: "Main.pass0.vertex", shader: emitted("vertex", [ local ]) },
        { key: "Main.pass0.pixel", shader: emitted("fragment", [ local ]) }
    ]), /assigns 0:0 to both/u);

    const scoped = { ...bare, binding: 1, scopeIdentity: "uniform-buffer:0:0@fragment" };
    assert.throws(() => CjsWebgpuFormat.buildWgslSet([
        { key: "Main.pass0.vertex", shader: emitted("vertex", [ bare ]) },
        { key: "Main.pass0.pixel", shader: emitted("fragment", [ scoped ]) }
    ]), /mixes shared and stage-scoped forms/u);
});

test("BuildWgslSet accepts a structured SRV as a sampled-resource read-only buffer", () =>
{
    const structured = binding("sampled-resource", "t0", 0, {
        type: "array<u32>",
        structureStride: 48,
        buffer: { type: "read-only-storage", hasDynamicOffset: false, minBindingSize: 48 }
    });
    const set = CjsWebgpuFormat.buildWgslSet([
        { key: "Shadow.pass0.vertex", shader: emitted("vertex", [ structured ]) }
    ]);

    const result = set.layouts[0].bindGroups[0].bindings[0];
    assert.equal(result.resourceKind, "sampled-resource");
    assert.equal(result.scopeIdentity, "sampled-resource:0:0@vertex");
    assert.equal(result.structureStride, 48);
    assert.deepEqual(result.buffer, structured.buffer);
});

test("BuildWgslSet preserves compute stage metadata and compute-only visibility", () =>
{
    const storage = binding("storage-resource", "u0", 0, {
        type: "array<atomic<u32>>",
        buffer: { type: "storage", hasDynamicOffset: false, minBindingSize: 4 }
    });
    const shader = { ...emitted("compute", [ storage ]), threadGroupSize: [ 64, 1, 1 ] };
    shader.program = { ...shader.program, programType: 5 };
    const set = CjsWebgpuFormat.buildWgslSet([
        { key: "Main.pass0.compute", shader }
    ]);

    assert.equal(shader.program.programType, 5);
    assert.deepEqual(set.shaders.map((entry) => [
        entry.key, entry.stage, entry.stageType, entry.threadGroupSize
    ]), [
        [ "Main.pass0.compute", "compute", 2, [ 64, 1, 1 ] ]
    ]);
    assert.deepEqual(set.layouts[0].bindGroups[0].bindings[0].visibility, [ "compute" ]);
    assert.equal(set.layouts[0].bindGroups[0].bindings[0].scopeIdentity,
        "storage-resource:0:0@compute");
});

test("BuildWgslSet preserves stage-scoped t0 buffer and texture layouts", () =>
{
    const structured = binding("sampled-resource", "t0", 0, {
        type: "array<u32>",
        structureStride: 48,
        buffer: { type: "read-only-storage", hasDynamicOffset: false, minBindingSize: 48 }
    });
    const texture = binding("sampled-resource", "t0", 1, {
        type: "texture_2d<f32>",
        texture: { sampleType: "float", viewDimension: "2d", multisampled: false }
    });
    const set = CjsWebgpuFormat.buildWgslSet([
        { key: "Main.pass0.vertex", shader: emitted("vertex", [ structured ]) },
        { key: "Main.pass0.pixel", shader: emitted("fragment", [ texture ]) }
    ]);

    assert.deepEqual(set.layouts[0].bindGroups[0].bindings.map((entry) => [
        entry.identity, entry.scopeIdentity, entry.binding, entry.visibility, Boolean(entry.buffer), Boolean(entry.texture)
    ]), [
        [ "sampled-resource:0:0", "sampled-resource:0:0@vertex", 0, [ "vertex" ], true, false ],
        [ "sampled-resource:0:0", "sampled-resource:0:0@fragment", 1, [ "fragment" ], false, true ]
    ]);
});

test("BuildWgslSet rejects binding conflicts and ambiguous generated symbols", () =>
{
    const shared = binding("sampler", "s0", 0, {
        identity: "sampler:0:0",
        scopeIdentity: "sampler:0:0",
        sampler: { type: "filtering" }
    });
    const moved = { ...shared, binding: 1 };
    assert.throws(() => CjsWebgpuFormat.buildWgslSet([
        { key: "Main.pass0.vertex", shader: emitted("vertex", [ shared ]) },
        { key: "Main.pass0.pixel", shader: emitted("fragment", [ moved ]) }
    ]), /conflicting layouts/i);

    const other = binding("sampled-resource", "t0", 0, {
        type: "texture_2d<f32>",
        texture: { sampleType: "float", viewDimension: "2d", multisampled: false }
    });
    assert.throws(() => CjsWebgpuFormat.buildWgslSet([
        { key: "Main.pass0.pixel", shader: emitted("fragment", [ shared, other ]) }
    ]), /assigns 0:0 to both/i);

    const secondSpace = { ...shared, registerSpace: 1 };
    assert.throws(() => CjsWebgpuFormat.buildWgslSet([
        { key: "Main.pass0.pixel", shader: emitted("fragment", [ shared, secondSpace ]) }
    ]), /inconsistent D3D identity|duplicate generated symbol/i);

    assert.throws(() => CjsWebgpuFormat.buildWgslSet([
        { key: "Main.pass0.vertex", shader: emitted("vertex", [ shared, shared ]) }
    ]), /duplicate D3D identity/i);

    const malformedScope = {
        ...shared,
        scopeIdentity: "sampler:0:0@vertex"
    };
    assert.throws(() => CjsWebgpuFormat.buildWgslSet([
        { key: "Main.pass0.pixel", shader: emitted("fragment", [ malformedScope ]) }
    ]), /invalid scope identity/i);

    assert.throws(() => CjsWebgpuFormat.buildWgslSet([
        { key: "Main.pass0.pixel", shader: emitted("fragment", [ { ...shared, scopeIdentity: "" } ]) }
    ]), /invalid scope identity/i);

    const sharedStructured = binding("sampled-resource", "t0", 0, {
        identity: "sampled-resource:0:0",
        scopeIdentity: "sampled-resource:0:0",
        type: "array<u32>",
        structureStride: 48,
        buffer: { type: "read-only-storage", hasDynamicOffset: false, minBindingSize: 48 }
    });
    const sharedTexture = binding("sampled-resource", "t0", 0, {
        identity: "sampled-resource:0:0",
        scopeIdentity: "sampled-resource:0:0",
        type: "texture_2d<f32>",
        texture: { sampleType: "float", viewDimension: "2d", multisampled: false }
    });
    assert.throws(() => CjsWebgpuFormat.buildWgslSet([
        { key: "Main.pass0.vertex", shader: emitted("vertex", [ sharedStructured ]) },
        { key: "Main.pass0.pixel", shader: emitted("fragment", [ sharedTexture ]) }
    ]), /conflicting layouts/i);
});

test("BuildWgslSet rejects malformed, duplicate, and stage-mismatched entries", () =>
{
    const vertex = emitted("vertex");
    assert.throws(() => CjsWebgpuFormat.buildWgslSet([]), /non-empty/i);
    assert.throws(() => CjsWebgpuFormat.buildWgslSet([ { key: "bad", shader: vertex } ]), /malformed key/i);
    assert.throws(() => CjsWebgpuFormat.buildWgslSet([
        { key: "Main.pass0.pixel", shader: vertex }
    ]), /does not match shader stage/i);
    assert.throws(() => CjsWebgpuFormat.buildWgslSet([
        { key: "Main.pass0.vertex", shader: vertex },
        { key: "Main.pass0.vertex", shader: vertex }
    ]), /duplicate shader key/i);

    const compute = { ...emitted("compute"), threadGroupSize: [ 8, 1, 1 ] };
    assert.throws(() => CjsWebgpuFormat.buildWgslSet([
        { key: "Main.pass0.compute", shader: { ...compute, threadGroupSize: [ 0, 1, 1 ] } }
    ]), /positive three-dimensional threadGroupSize/u);
    assert.throws(() => CjsWebgpuFormat.buildWgslSet([
        { key: "Main.pass0.vertex", shader: vertex },
        { key: "Main.pass0.compute", shader: compute }
    ]), /cannot mix compute and render shader stages/u);
});
