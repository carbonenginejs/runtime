// Integer sampled textures and depth comparison, as EVE Frontier's v5 quad,
// ship and turret effects use them: EveSpaceSceneDynamicShadowMap is an
// R16_UINT texture read with ld, and ShadowMapAtlas is a depth atlas read with
// sample_c_lz through a SamplerComparisonState.
import { test } from "node:test";
import assert from "node:assert/strict";

import CjsWebgpuFormat from "../../../../../src/resource/formats/webgpu/index.js";
import { lowerBindingLayout } from "../../../../../src/resource/formats/webgpu/core/wgsl/lowerBindingLayout.js";
import { releaseDevice, wgslErrors } from "../../../../shadercompiler/support/dawn.js";

function register(typeName, registerIndex, { mask = "", swizzle = "", selected = "", modifierName = "none" } = {})
{
    return {
        typeName,
        componentCount: [ "resource", "sampler" ].includes(typeName) ? 0 : 4,
        mask,
        swizzle,
        selected,
        modifierName,
        minPrecisionName: "default",
        registerIndex,
        indices: Number.isInteger(registerIndex) ? [ { values: [ registerIndex ], relative: null } ] : []
    };
}

function immediate(bits)
{
    return {
        ...register("immediate32", null, { swizzle: "xyzw" }),
        immediateValues: bits.map((uint32) => ({ uint32, float32: 0 }))
    };
}

function signature(semanticName, registerIndex, mask)
{
    return {
        semanticName,
        semanticIndex: 0,
        systemValueType: semanticName.startsWith("SV_") ? 1 : 0,
        componentType: 3,
        componentTypeName: "float32",
        registerIndex,
        mask,
        readWriteMask: mask,
        stream: 0,
        minPrecision: 0
    };
}

function declaration(offset, opcodeName, operandType, data)
{
    return {
        offset,
        opcode: 0,
        opcodeName,
        isDeclaration: true,
        declaration: { registerIndex: 0, ...data },
        operands: [ register(operandType, 0) ]
    };
}

function instruction(offset, opcodeName, operands)
{
    return { offset, opcode: 0, opcodeName, isDeclaration: false, operands };
}

function pixelProgram(declarations, body)
{
    return {
        program: { programType: 0, programTypeName: "pixel", majorVersion: 5, minorVersion: 0 },
        signatures: {
            input: [ signature("SV_Position", 0, 15), signature("TEXCOORD", 1, 3) ],
            output: [ signature("SV_Target", 0, 15) ]
        },
        instructions: [
            {
                offset: 0, opcode: 0, opcodeName: "dcl_global_flags", isDeclaration: true,
                declaration: { globalFlags: 1 << 11, refactoringAllowed: true }, operands: []
            },
            ...declarations,
            {
                offset: 9, opcode: 0, opcodeName: "dcl_input_ps", isDeclaration: true,
                declaration: { registerIndex: 1, interpolationModeName: "linear" }, operands: [ register("input", 1) ]
            },
            ...body,
            instruction(60, "ret", [])
        ]
    };
}

const texture2d = returnTypeNames => declaration(7, "dcl_resource", "resource", {
    resourceDimensionName: "texture2d",
    returnType: { returnTypeNames }
});

/** ld r0, l(0,0,0,0), t0 then utof into the output: a uint texture read as Frontier reads its dynamic shadow map. */
function integerLoad(returnTypeName = "uint", extra = [])
{
    return pixelProgram([ texture2d(Array(4).fill(returnTypeName)), ...extra ], [
        instruction(12, "ld", [
            register("temp", 0, { mask: "xyzw" }),
            immediate([ 0, 0, 0, 0 ]),
            register("resource", 0, { swizzle: "xyzw" })
        ]),
        instruction(20, returnTypeName === "uint" ? "utof" : "itof", [ register("output", 0, { mask: "xyzw" }), register("temp", 0, { swizzle: "xyzw" }) ])
    ]);
}

/** sample_c_lz r0.x, v1.xyxx, t0.xxxx, s0, l(0.5), the shape Frontier samples ShadowMapAtlas with. */
function comparison(extra = [])
{
    return pixelProgram([
        declaration(5, "dcl_sampler", "sampler", { samplerModeName: "comparison" }),
        texture2d([ "float", "float", "float", "float" ])
    ], [
        instruction(12, "sample_c_lz", [
            register("temp", 0, { mask: "x" }),
            register("input", 1, { swizzle: "xyxx" }),
            register("resource", 0, { swizzle: "xxxx" }),
            register("sampler", 0),
            immediate([ 0x3f000000 ])
        ]),
        ...extra,
        instruction(30, "mov", [ register("output", 0, { mask: "xyzw" }), register("temp", 0, { swizzle: "xxxx" }) ])
    ]);
}

test("a uint texture read only with ld lowers to texture_2d<u32> with a uint layout", () =>
{
    const ir = CjsWebgpuFormat.buildShaderIr(integerLoad("uint"));
    const binding = lowerBindingLayout(ir).find((entry) => entry.resourceKind === "sampled-resource");
    assert.equal(binding.type, "texture_2d<u32>");
    assert.deepEqual(binding.texture, { sampleType: "uint", viewDimension: "2d", multisampled: false });

    const shader = CjsWebgpuFormat.buildWgsl(integerLoad("uint"), { source: "synthetic-uint-load" });
    assert.match(shader.code, /var t0: texture_2d<u32>/);
    // D3D ld reads 0 out of bounds; the zero is the texture's own element type.
    assert.match(shader.code, /select\(vec4<u32>\(\), textureLoad\(t0,/);
});

test("a sint texture lowers to texture_2d<i32>", () =>
{
    const binding = lowerBindingLayout(CjsWebgpuFormat.buildShaderIr(integerLoad("sint")))
        .find((entry) => entry.resourceKind === "sampled-resource");
    assert.equal(binding.type, "texture_2d<i32>");
    assert.equal(binding.texture.sampleType, "sint");
});

test("an integer texture that is sampled is refused by name, since WGSL cannot sample one", () =>
{
    const program = integerLoad("uint", [ declaration(5, "dcl_sampler", "sampler", { samplerModeName: "default" }) ]);
    program.instructions.splice(program.instructions.length - 1, 0, instruction(40, "sample", [
        register("temp", 1, { mask: "xyzw" }),
        register("input", 1, { swizzle: "xyxx" }),
        register("resource", 0, { swizzle: "xyzw" }),
        register("sampler", 0)
    ]));
    assert.throws(() => lowerBindingLayout(CjsWebgpuFormat.buildShaderIr(program)), /is a uint texture, which WGSL can only load; sample samples it/u);
});

test("a texture read only by sample_c_lz is a depth texture behind a comparison sampler", () =>
{
    const layout = lowerBindingLayout(CjsWebgpuFormat.buildShaderIr(comparison()));
    const texture = layout.find((entry) => entry.resourceKind === "sampled-resource");
    const sampler = layout.find((entry) => entry.resourceKind === "sampler");
    assert.equal(texture.type, "texture_depth_2d");
    assert.deepEqual(texture.texture, { sampleType: "depth", viewDimension: "2d", multisampled: false });
    assert.equal(sampler.type, "sampler_comparison");
    assert.deepEqual(sampler.sampler, { type: "comparison" });

    const shader = CjsWebgpuFormat.buildWgsl(comparison(), { source: "synthetic-compare" });
    assert.match(shader.code, /var t0: texture_depth_2d/);
    assert.match(shader.code, /var s0: sampler_comparison/);
    assert.match(shader.code, /textureSampleCompareLevel\(t0, s0, vec2<f32>\([^\n]+\), /);
});

test("a texture both depth-compared and read plainly is refused rather than given one wrong type", () =>
{
    const program = comparison([ instruction(20, "ld", [
        register("temp", 1, { mask: "xyzw" }),
        immediate([ 0, 0, 0, 0 ]),
        register("resource", 0, { swizzle: "xyzw" })
    ]) ]);
    assert.throws(() => lowerBindingLayout(CjsWebgpuFormat.buildShaderIr(program)), /is depth-compared and also read otherwise \(sample_c_lz, ld\)/u);
});

test("an unsupported sampler mode is still refused", () =>
{
    const program = comparison();
    program.instructions.find((entry) => entry.opcodeName === "dcl_sampler").declaration.samplerModeName = "mono";
    assert.throws(() => lowerBindingLayout(CjsWebgpuFormat.buildShaderIr(program)), /has unsupported mode mono/u);
});

test("both shapes compile in Dawn", async t =>
{
    t.after(releaseDevice);
    for (const [ name, program ] of [ [ "uint load", integerLoad("uint") ], [ "sint load", integerLoad("sint") ], [ "compare", comparison() ] ])
    {
        const shader = CjsWebgpuFormat.buildWgsl(program, { source: name });
        assert.deepEqual(await wgslErrors(shader.code), [], name);
    }
});

/** A uint lane from an integer texture beside a float lane, moved straight into the pixel output. */
function mixedOutputMove()
{
    return pixelProgram([ texture2d(Array(4).fill("uint")) ], [
        instruction(12, "ld", [
            register("temp", 0, { mask: "x" }),
            immediate([ 0, 0, 0, 0 ]),
            register("resource", 0, { swizzle: "xxxx" })
        ]),
        instruction(16, "mov", [ register("temp", 0, { mask: "y" }), register("input", 1, { selected: "x" }) ]),
        instruction(20, "mov", [ register("output", 0, { mask: "xy" }), register("temp", 0, { swizzle: "xyxx" }) ]),
        instruction(24, "mov", [ register("output", 0, { mask: "zw" }), immediate([ 0, 0, 0, 0x3f800000 ]) ])
    ]);
}

test("a mov of mixed-type lanes into an output splits into typed lane lets and per-lane assignments", async t =>
{
    t.after(releaseDevice);
    const shader = CjsWebgpuFormat.buildWgsl(mixedOutputMove(), { source: "synthetic-mixed-output" });
    // The uint lane keeps its bits on the way into the float target, as D3D's mov does.
    assert.match(shader.code, /let value\w+_x: u32 = /);
    assert.match(shader.code, /let value\w+_y: f32 = /);
    assert.match(shader.code, /\.x = bitcast<f32>\(value\w+_x\);/);
    assert.deepEqual(await wgslErrors(shader.code), []);
});

test("a vector shift takes a vecN<u32> amount, as WGSL requires (Frontier's shaders shift two lanes at once)", async t =>
{
    t.after(releaseDevice);
    const program = pixelProgram([ texture2d(Array(4).fill("sint")) ], [
        instruction(12, "ld", [ register("temp", 0, { mask: "xy" }), immediate([ 0, 0, 0, 0 ]), register("resource", 0, { swizzle: "xyxx" }) ]),
        instruction(16, "ishl", [ register("temp", 1, { mask: "xy" }), register("temp", 0, { swizzle: "xyxx" }), immediate([ 3, 4, 0, 0 ]) ]),
        instruction(20, "itof", [ register("output", 0, { mask: "xy" }), register("temp", 1, { swizzle: "xyxx" }) ]),
        instruction(24, "mov", [ register("output", 0, { mask: "zw" }), immediate([ 0, 0, 0, 0x3f800000 ]) ])
    ]);
    const shader = CjsWebgpuFormat.buildWgsl(program, { source: "synthetic-vector-shift" });
    assert.match(shader.code, /<< vec2<u32>\(/);
    assert.deepEqual(await wgslErrors(shader.code), []);
});
