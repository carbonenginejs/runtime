import test from "node:test";
import assert from "node:assert/strict";

import CjsWebglFormat from "../../../src/formats/webgl/index.js";
import {
    buildComparisonSamplePixelDxbc,
    buildMinimalGeometryDxbc,
    buildMinimalVertexDxbc,
    buildStructuredBufferPixelDxbc,
    buildStructuredLoadPixelDxbc,
    buildResourcePixelDxbc,
    buildConstantBufferVertexDxbc
} from "./synthetic.js";

test("sample_c_lz emits a 2D shadow comparison at explicit LOD zero", () =>
{
    const result = CjsWebglFormat.emitGlsl(buildComparisonSamplePixelDxbc(3), { source: "synthetic" });

    assert.match(result.source, /uniform mediump sampler2DShadow s1;/);
    assert.match(result.source, /r0\.x = textureLod\(s1, vec3\(vec2\(r0\.xy\), r0\.w\), 0\.0\);/);
    assert.deepEqual(
        result.bindings.find((binding) => binding.kind === "resource"),
        {
            kind: "resource",
            registerIndex: 1,
            name: "s1",
            samplerType: "sampler2DShadow",
            dimensionName: "texture2d",
            comparison: true,
            // The general pairing and the comparison-specific one agree here,
            // and must: a comparison sample is still a sample site.
            pairedSamplerRegisters: [ 2 ],
            samplerRegisterIndices: [ 2 ]
        }
    );
});

test("sample_c uses implicit-LOD shadow comparison sampling", () =>
{
    const result = CjsWebglFormat.emitGlsl(
        buildComparisonSamplePixelDxbc(3, "sample_c"),
        { source: "synthetic" }
    );

    assert.match(result.source, /r0\.x = texture\(s1, vec3\(vec2\(r0\.xy\), r0\.w\)\);/);
    assert.doesNotMatch(result.source, /textureLod/);
});

test("sample_c_lz emits WebGL2 zero-gradient fallbacks for cube and 2D-array shadows", () =>
{
    const cube = CjsWebglFormat.emitGlsl(buildComparisonSamplePixelDxbc(6), { source: "synthetic-cube" });
    assert.match(cube.source, /uniform mediump samplerCubeShadow s1;/);
    assert.match(cube.source, /textureGrad\(s1, vec4\(vec3\(r0\.xyz\), r0\.w\), vec3\(0\.0\), vec3\(0\.0\)\)/);

    const array = CjsWebglFormat.emitGlsl(buildComparisonSamplePixelDxbc(8), { source: "synthetic-array" });
    assert.match(array.source, /uniform mediump sampler2DArrayShadow s1;/);
    assert.match(array.source, /textureGrad\(s1, vec4\(vec3\(r0\.xyz\), r0\.w\), vec2\(0\.0\), vec2\(0\.0\)\)/);
});

test("comparison samples replicate their scalar PCF result across multi-lane destinations", () =>
{
    const result = CjsWebglFormat.emitGlsl(
        buildComparisonSamplePixelDxbc(3, "sample_c_lz", 0xF),
        { source: "synthetic" }
    );

    assert.match(result.source, /r0\.xyzw = vec4\(textureLod\(/);
});

test("static emitGlsl and instance EmitGlsl share one code path", () =>
{
    const bytes = buildMinimalVertexDxbc();
    const fromStatic = CjsWebglFormat.emitGlsl(bytes, { source: "synthetic" });
    const fromInstance = new CjsWebglFormat().EmitGlsl(bytes, { source: "synthetic" });
    assert.deepEqual(fromStatic, fromInstance);
});

test("emits a minimal dcl_temps+ret vertex shader as valid-looking GLSL ES 3.00", () =>
{
    const result = CjsWebglFormat.emitGlsl(buildMinimalVertexDxbc(), { source: "synthetic" });

    assert.equal(result.stageName, "vertex");
    assert.match(result.source, /^#version 300 es\n/);
    assert.match(result.source, /void main\(\) \{/);
    const opens = (result.source.match(/\{/g) || []).length;
    const closes = (result.source.match(/\}/g) || []).length;
    assert.equal(opens, closes, "braces must balance");
});

test("rejects non-vertex/pixel/compute stages with the documented error", () =>
{
    assert.throws(
        () => CjsWebglFormat.emitGlsl(buildMinimalGeometryDxbc(), { source: "synthetic" }),
        /Only vertex, pixel, and compute stages target WebGL2/
    );
});

test("rejects unknown emitGlsl options", () =>
{
    assert.throws(
        () => CjsWebglFormat.emitGlsl(buildMinimalVertexDxbc(), { bogus: true }),
        /unknown emitGlsl option/
    );
});

test("emitGlsl defaults are preserved when no profile options are given", () =>
{
    // constantBufferStyle defaults to "array": a vertex shader with no
    // constant buffers won't exercise this directly, but the call must not
    // throw when profile options are entirely omitted.
    assert.doesNotThrow(() => CjsWebglFormat.emitGlsl(buildMinimalVertexDxbc()));
});

test("stubResourceRegisters is an accepted option and defaults to no stubbing", () =>
{
    // Accepted (not an unknown-option throw), and with no list a pixel
    // structured buffer is declared as usual.
    const bytes = buildStructuredBufferPixelDxbc(5, 4);
    assert.doesNotThrow(() => CjsWebglFormat.emitGlsl(bytes, { stubResourceRegisters: [] }));
    const dflt = CjsWebglFormat.emitGlsl(bytes, { source: "synthetic" });
    assert.match(dflt.source, /uniform highp usampler2D sb5;/);
    assert.ok(dflt.bindings.some((b) => b.kind === "structuredTexture" && b.registerIndex === 5));
});

test("stubResourceRegisters drops a pixel structured buffer declaration and binding", () =>
{
    const bytes = buildStructuredBufferPixelDxbc(5, 4);

    const off = CjsWebglFormat.emitGlsl(bytes, { source: "synthetic" });
    assert.match(off.source, /uniform highp usampler2D sb5;/);
    assert.ok(off.bindings.some((b) => b.registerIndex === 5));

    const on = CjsWebglFormat.emitGlsl(bytes, { source: "synthetic", stubResourceRegisters: [ 5 ] });
    assert.doesNotMatch(on.source, /usampler2D sb5;/);
    assert.ok(!on.bindings.some((b) => b.registerIndex === 5), "stubbed register keeps no binding");
});

test("stubResourceRegisters drops a pixel sampler declaration and binding", () =>
{
    const bytes = buildResourcePixelDxbc(6, 8); // texture2darray, like LightProfileArray

    const off = CjsWebglFormat.emitGlsl(bytes, { source: "synthetic" });
    assert.match(off.source, /uniform mediump sampler2DArray s6;/);
    assert.ok(off.bindings.some((b) => b.kind === "resource" && b.registerIndex === 6));

    const on = CjsWebglFormat.emitGlsl(bytes, { source: "synthetic", stubResourceRegisters: [ 6 ] });
    assert.doesNotMatch(on.source, /sampler2DArray s6;/);
    assert.ok(!on.bindings.some((b) => b.registerIndex === 6), "stubbed register keeps no binding");
});

test("stubResourceRegisters drops only the listed registers", () =>
{
    // t5 not listed -> the structured buffer survives.
    const structured = CjsWebglFormat.emitGlsl(buildStructuredBufferPixelDxbc(5, 4), { source: "synthetic", stubResourceRegisters: [ 6 ] });
    assert.match(structured.source, /uniform highp usampler2D sb5;/);

    // t6 not listed -> the sampler survives.
    const sampler = CjsWebglFormat.emitGlsl(buildResourcePixelDxbc(6, 8), { source: "synthetic", stubResourceRegisters: [ 5 ] });
    assert.match(sampler.source, /uniform mediump sampler2DArray s6;/);
});

test("lightConstantBuffer lowers light data structured loads to cb6 rows", () =>
{
    const bytes = buildStructuredLoadPixelDxbc(12, 48, 1);
    const result = CjsWebglFormat.emitGlsl(bytes, {
        source: "synthetic",
        lightConstantBuffer: {
            indexRegister: 11,
            dataRegister: 12,
            profileRegister: 13,
            capacity: 40
        }
    });

    assert.match(result.source, /uniform vec4 cb6\[121\];/);
    assert.match(result.source, /vec4 cjsLocalLightRow/);
    assert.match(result.source, /r0\.x = cjsLocalLightRow\(1, 0\)\.x;/);
    assert.doesNotMatch(result.source, /usampler2D sb12/);
    assert.ok(result.bindings.some((b) =>
        b.kind === "constantBuffer" &&
        b.registerIndex === 6 &&
        b.cjsSemantic === "localLights" &&
        b.capacityLights === 40
    ));
    assert.ok(!result.bindings.some((b) => b.kind === "structuredTexture" && b.registerIndex === 12));
});

test("lightConstantBuffer lowers light index structured loads to a cb-backed linked list helper", () =>
{
    const bytes = buildStructuredLoadPixelDxbc(11, 4, 7);
    const result = CjsWebglFormat.emitGlsl(bytes, {
        source: "synthetic",
        lightConstantBuffer: {
            indexRegister: 11,
            dataRegister: 12,
            capacity: 4
        }
    });

    assert.match(result.source, /uniform vec4 cb6\[13\];/);
    assert.match(result.source, /uint cjsLocalLightIndexLoad\(int element\)/);
    assert.match(result.source, /r0\.x = uintBitsToFloat\(cjsLocalLightIndexLoad\(7\)\);/);
    assert.doesNotMatch(result.source, /usampler2D sb11/);
    assert.ok(result.bindings.some((b) =>
        b.kind === "constantBuffer" &&
        b.registerIndex === 6 &&
        b.lightIndexRegister === 11 &&
        b.lightDataRegister === 12
    ));
});

test("lightPackedTexture lowers light data structured loads to one packed texture", () =>
{
    const bytes = buildStructuredLoadPixelDxbc(14, 48, 1);
    const result = CjsWebglFormat.emitGlsl(bytes, {
        source: "synthetic",
        lightPackedTexture: {
            indexRegister: 13,
            dataRegister: 14,
            profileRegister: 15,
            dataTexelBase: 8192
        }
    });

    assert.match(result.source, /uniform highp usampler2D cjsLocalLightTexture;/);
    assert.match(result.source, /8192 \+ \(\(\(1\) \* 12 \+ 0\) >> 2\)/);
    assert.doesNotMatch(result.source, /usampler2D sb14/);
    assert.ok(result.bindings.some((b) =>
        b.kind === "structuredTexture" &&
        b.name === "cjsLocalLightTexture" &&
        b.cjsSemantic === "packedLocalLights" &&
        b.lightIndexRegister === 13 &&
        b.lightDataRegister === 14 &&
        b.dataTexelBase === 8192
    ));
});

test("lightPackedTexture drops the light profile sampler declaration", () =>
{
    const bytes = buildResourcePixelDxbc(15, 8);
    const result = CjsWebglFormat.emitGlsl(bytes, {
        source: "synthetic",
        lightPackedTexture: {
            indexRegister: 13,
            dataRegister: 14,
            profileRegister: 15
        }
    });

    assert.match(result.source, /uniform highp usampler2D cjsLocalLightTexture;/);
    assert.doesNotMatch(result.source, /sampler2DArray s15/);
    assert.ok(result.bindings.some((b) => b.cjsSemantic === "packedLocalLights"));
    assert.ok(!result.bindings.some((b) => b.kind === "resource" && b.registerIndex === 15));
});

// The CPU-owned per-object contract in runtime-trinity rests on ONE fact: a
// constant buffer is emitted as a FLAT array of vec4, never a struct with named
// members. That is what makes std140 and tight C++ packing agree - std140's
// stride for an array of vec4 is 16 bytes, identical to the C++ struct Carbon
// memcpys - and so what lets Trinity ship ONE layout for every backend. The
// moment a uniform becomes a struct, std140 member padding returns (vec3 padded
// to 16, scalar array stride) and the backend identity breaks silently, in a
// render rather than in CI. Both declaration styles are pinned because the
// profile chooses between them.
// See runtime-trinity/agents/PER-OBJECT-DATA-CPU-OWNED-2026-07-28.md.
test("constant buffers emit as a flat vec4 array in both declaration styles", () =>
{
    for (const sizeInVec4 of [ 1, 3, 27, 59 ])
    {
        const dxbc = buildConstantBufferVertexDxbc(4, sizeInVec4);

        const array = CjsWebglFormat.emitGlsl(dxbc, { source: "synthetic" });
        assert.ok(
            array.source.includes(`uniform vec4 cb4[${sizeInVec4}];`),
            "the uniform4fv style is a flat vec4 array"
        );

        const std140 = CjsWebglFormat.emitGlsl(dxbc, { source: "synthetic", constantBufferStyle: "std140" });
        assert.ok(
            std140.source.includes("layout(std140) uniform ConstantBuffer4 {")
            && std140.source.includes(`vec4 data[${sizeInVec4}];`),
            "the std140 style wraps a flat vec4 array, with no named members to pad"
        );
        assert.doesNotMatch(std140.source, /vec3 \w+;/u, "no vec3 member can appear inside the block");

        for (const result of [ array, std140 ])
        {
            const binding = result.bindings.find((entry) => entry.kind === "constantBuffer");
            assert.equal(binding.sizeInVec4, sizeInVec4, "the reported size is the vec4 count");
        }
    }
});
