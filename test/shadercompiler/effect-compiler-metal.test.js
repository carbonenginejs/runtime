// Carbon's Metal effect compiler port (src/shadercompiler/EffectCompilerMetal).
//
// The first group ports Carbon's own MetalConversionTest.cpp: each test
// compiles the same source and checks the same substrings of the stage's
// Metal source, or test 7's EffectData counts. The sources are read from the
// Carbon checkout (test/support/carbonTestShaders.js) and the group skips
// without it. Carbon's "compiles" assertions (Compiles<>, and the
// ASSERT_TRUE( compiled ) inside Compile<>) mean Apple's `metal` tool
// accepted the source; that cannot run here, so they are checked only as far
// as CompileEffect returning true with no error message. Test 4 is ray
// tracing, which is not ported.
//
// The rest reproduces the Carbon defects found while porting, and compiles
// the library's outline effect.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { carbonTestShaders, carbonTestsSkipReason } from "./support/carbonTestShaders.js";
import { EffectCompilerMetal, MSL_INCLUDE } from "../../src/shadercompiler/EffectCompilerMetal/index.js";
import { ShaderCompilerSession } from "../../src/shadercompiler/ShaderCompiler/ShaderCompilerSession.js";
import { CompileEffectFile } from "../../src/shadercompiler/ShaderCompiler/shaderCompiler.js";
import { InlineString } from "../../src/shadercompiler/InlineString.js";
import { EffectData } from "../../src/shadercompiler/EffectData/EffectData.js";
import { Macro } from "../../src/shadercompiler/Macro.js";
import { Platform } from "../../src/shadercompiler/platforms.js";
import { LIBRARY_ROOT } from "../../scripts/shadercompiler/cbuffer-headers.mjs";
import { StageInput } from "../../src/shadercompiler/EffectData/StageInput.js";

/**
 * Carbon's `Compile<EffectCompilerMetal>` / `Compiles<>` (TesingUtils.h):
 * a fresh compiler, `Create()`, then `CompileEffect( src + 1, ... )` with no
 * defines. Carbon's length is `strlen( src )` from `src + 1`, one past the
 * text into its NUL; the range here ends at the text.
 *
 * @param {string} src The source as Carbon's raw string holds it, starting with a newline.
 * @returns {{ compiled: boolean, data: EffectData, messages: string[] }} The result and the printed messages.
 */
function compile(src)
{
    const session = new ShaderCompilerSession({ read: () => null, compilerFactories: new Map() });
    const compiler = new EffectCompilerMetal(session);
    assert.equal(compiler.Create(), true);
    const data = new EffectData();
    const compiled = compiler.CompileEffect(InlineString.makeInlineString__StartEnd({ text: src }, 1, src.length), [], data);
    session.messages.Flush();
    return { compiled, data, messages: session.messages.output };
}

/**
 * `Compile<>`'s assertion: the compile succeeded (with no error printed).
 *
 * @param {string} src The source, starting with a newline.
 * @returns {EffectData} The effect.
 */
function compileOk(src)
{
    const { compiled, data, messages } = compile(src);
    assert.deepEqual(messages, []);
    assert.equal(compiled, true);
    return data;
}

/**
 * A Carbon test's source by test name.
 *
 * @param {string} name `Suite.Test`.
 * @returns {string} The raw string's text.
 */
function carbonSource(name)
{
    const found = carbonTestShaders().filter(entry => entry.file === "MetalConversionTest.cpp" && entry.test === name);
    assert.equal(found.length, 1, name);
    return found[0].source;
}

const skip = carbonTestsSkipReason();

/**
 * A two-stage effect around a pixel shader body.
 *
 * @param {string} globals Declarations before the shaders.
 * @param {string} ps The pixel shader function, named `ps`.
 * @param {string} [vs] The vertex shader function, named `vs`.
 * @returns {string} The source, starting with a newline.
 */
function effect(globals, ps, vs = "float4 vs(): SV_Position { return float4( 0.0, 0.0, 0.0, 1.0 ); }")
{
    return `\n${globals}\n${vs}\n${ps}\ntechnique t0 { pass p0 { vertexshader = compile vs_3_0 vs(); pixelshader = compile ps_3_0 ps(); } }\n`;
}

// MetalConversionTest.cpp

test("Carbon MetalConversion.TextureIndexingWorks: tex[int2] reads through a uint2 cast", { skip }, () =>
{
    const data = compileOk(carbonSource("MetalConversion.TextureIndexingWorks"));
    assert.ok(data.techniques[0].passes[0].stages[1].source.includes("( ( tex ).read( (uint2)( int2( 0, 0 ) ) ) ).xyz"));
});

test("Carbon MetalConversion.AppliesPackedModifiersToCBuffers: a cbuffer's float3 is packed", { skip }, () =>
{
    const data = compileOk(carbonSource("MetalConversion.AppliesPackedModifiersToCBuffers"));
    assert.ok(data.techniques[0].passes[0].stages[1].source.includes("packed_float3 Color;"));
});

test("Carbon MetalConversion.AddsRowsToMatrixInitializers: a 3x3 initializer is regrouped into rows", { skip }, () =>
{
    const data = compileOk(carbonSource("MetalConversion.AddsRowsToMatrixInitializers"));
    assert.ok(data.techniques[0].passes[0].stages[1].source.includes("{ 1, 2, 3 }"));
});

test("Carbon MetalConversion.AppliesPackedModifiersToRtLocalBuffers: ray tracing is not ported", { skip }, () =>
{
    assert.throws(() => compile(carbonSource("MetalConversion.AppliesPackedModifiersToRtLocalBuffers")), /ray-tracing libraries are not ported/u);
});

for (const name of [
    "MetalConversion.AllowBindlessResources",
    "MetalConversion.AllowLocalBufferVars",
    "MetalShaderPatching.CanHaveNestedStructs",
    "MetalShaderPatching.CanHaveNestedStructsWithSystemSemanticsWithIAInputs1",
    "MetalShaderPatching.CanHaveNestedStructsWithSystemSemanticsWithIAInputs2"
])
{
    test(`Carbon ${name}: compiles (Apple's metal acceptance not reproducible)`, { skip }, () =>
    {
        compileOk(carbonSource(name));
    });
}

test("Carbon MetalConversion.AllowManySrvsUavs: 30 registers, 27 textures and 3 UAVs", { skip }, () =>
{
    const stage = compileOk(carbonSource("MetalConversion.AllowManySrvsUavs")).techniques[0].passes[0].stages[1];
    assert.equal(stage.registerInputs.length, 30);
    assert.equal(stage.textures.size, 27);
    assert.equal(stage.uavs.size, 3);
});

for (const [name, attributes] of [
    ["MetalShaderPatching.CanHaveVertexID", ["[[ vertex_id ]]", "[[ base_vertex ]]"]],
    ["MetalShaderPatching.CanHaveVertexIDWithIAInputs", ["[[ vertex_id ]]", "[[ base_vertex ]]"]],
    ["MetalShaderPatching.CanHaveInstanceID", ["[[ instance_id ]]", "[[ base_instance ]]"]],
    ["MetalShaderPatching.CanHaveInstanceIDWithIAInputs", ["[[ instance_id ]]", "[[ base_instance ]]"]],
    ["MetalShaderPatching.CanHaveSystemSemanticMixedParameterAndIAInputs", ["[[ vertex_id ]]", "[[ base_vertex ]]", "[[ instance_id ]]", "[[ base_instance ]]"]]
])
{
    test(`Carbon ${name}: the vertex stage has ${attributes.join(" and ")}`, { skip }, () =>
    {
        const source = compileOk(carbonSource(name)).techniques[0].passes[0].stages[0].source;
        for (const attribute of attributes)
        {
            assert.ok(source.includes(attribute), attribute);
        }
    });
}

// The port's own checks.

test("each stage is its Metal source, after the prelude, with Carbon's entry point names", () =>
{
    const data = compileOk(effect("", "float4 ps(): SV_Target { return 1; }"));
    const [vs, ps] = data.techniques[0].passes[0].stages;
    assert.equal(vs.type, StageInput.InputStageType.VERTEX_STAGE);
    assert.equal(ps.type, StageInput.InputStageType.PIXEL_STAGE);
    for (const stage of [vs, ps])
    {
        assert.equal(stage.shaderData, stage.source);
        assert.ok(stage.source.startsWith(MSL_INCLUDE));
        assert.ok(stage.source.includes("void InterlockedXor(device int& dest, int value)"));
        assert.deepEqual(stage.threadGroupSize, [1, 1, 1]);
    }
    assert.match(vs.source, / vertex __StageOutData_\d+ mainVS\( /u);
    assert.match(ps.source, / fragment __StageOutData_\d+ mainPS\( /u);
    assert.ok(MSL_INCLUDE.startsWith("\n#include <metal_stdlib>\nusing namespace metal;\n"));
});

test("globals become GlobalsData at CBUFFER(0), with offsets, defaults and annotations", () =>
{
    const data = compileOk(effect(
        "float4 Tint < string UIWidget = \"Color\"; > = { 1, 0.5, 0.25, 1 };\nfloat3 Fog;\nint Count = 3;",
        "float4 ps(): SV_Target { return Tint + float4( Fog, Count ); }"));
    const ps = data.techniques[0].passes[0].stages[1];
    assert.ok(ps.source.includes("constant GlobalsData& Globals [[ CBUFFER(0) ]]"));
    assert.ok(ps.source.includes("packed_float3 Fog;"));
    assert.deepEqual(ps.constants.map(c => [c.name, c.offset, c.size, c.dimension]), [["Tint", 0, 16, 4], ["Fog", 16, 12, 3], ["Count", 28, 4, 1]]);
    const view = new DataView(ps.defaultValues.buffer);
    assert.deepEqual([0, 4, 8, 12].map(offset => view.getFloat32(offset, true)), [1, 0.5, 0.25, 1]);
    assert.equal(view.getInt32(28, true), 3);
    assert.deepEqual(ps.registerInputs.map(r => [r.registerType, r.registerIndex]), [[0, 0]]);
    assert.equal(data.annotations.get("Tint").annotations.get("UIWidget").stringValue, "Color");
});

test("textures and samplers take the first free slots; static samplers stay constexpr", () =>
{
    const data = compileOk(effect(
        [
            "Texture2D A;",
            "Texture2D B;",
            "SamplerState Dynamic;",
            "SamplerState Fixed = sampler_state { AddressU = Wrap; AddressV = Wrap; };"
        ].join("\n"),
        "float4 ps( float2 uv : TEXCOORD0 ): SV_Target { return A.Sample( Dynamic, uv ) + B.Sample( Fixed, uv ); }"));
    const ps = data.techniques[0].passes[0].stages[1];
    assert.ok(ps.source.includes("texture2d<float> A [[ texture(0) ]]"));
    assert.ok(ps.source.includes("texture2d<float> B [[ texture(1) ]]"));
    assert.ok(ps.source.includes("sampler Dynamic [[ sampler(0) ]]"));
    assert.ok(ps.source.includes("constexpr sampler Fixed"));
    assert.deepEqual([...ps.textures.keys()], [0, 1]);
    assert.deepEqual([...ps.samplers].map(([register, sampler]) => [register, sampler.name]), [[0, "Dynamic"]]);
});

test("a vertex shader's inputs become numbered attributes and pipeline inputs", () =>
{
    const data = compileOk(effect("", "float4 ps(): SV_Target { return 1; }",
        "float4 vs( float3 p : POSITION, float2 uv : TEXCOORD3 ): SV_Position { return float4( p + uv.x, 1 ); }"));
    const vs = data.techniques[0].passes[0].stages[0];
    assert.deepEqual(vs.pipelineInputs.map(input => [input.name, input.index, input.registerIndex, input.dimension]), [[0, 0, 0, 3], [5, 3, 1, 2]]);
    assert.match(vs.source, /float3 __p_\d+\[\[ attribute\(0\) \]\];float2 __uv_\d+\[\[ attribute\(1\) \]\];/u);
});

test("a compute shader reads [numthreads] and becomes kernel mainCS", () =>
{
    const { compiled, data, messages } = compile([
        "",
        "RWBuffer<float> Output;",
        "[numthreads( 8, 4, 2 )]",
        "void cs( uint3 id : SV_DispatchThreadID ) { Output[id.x] = 1; }",
        "technique t0 { pass p0 { computeshader = compile cs_5_0 cs(); } }",
        ""
    ].join("\n"));
    assert.deepEqual(messages, []);
    assert.equal(compiled, true);
    const cs = data.techniques[0].passes[0].stages[0];
    assert.deepEqual(cs.threadGroupSize, [8, 4, 2]);
    assert.ok(cs.source.includes(" kernel void mainCS( "));
    assert.ok(cs.source.includes("[[ thread_position_in_grid ]]"));
    assert.deepEqual([...cs.uavs.keys()], [4]);
});

test("the permutation's defines reach the preprocessor", () =>
{
    const text = effect("", "float4 ps(): SV_Target { return BAR; }", "#if FOO == 2\nfloat4 vs(): SV_Position { return float4( 0.0, 0.0, 0.0, FOO ); }\n#endif");
    const session = new ShaderCompilerSession({ read: () => null, compilerFactories: new Map() });
    const data = new EffectData();
    const compiled = new EffectCompilerMetal(session).CompileEffect(InlineString.makeInlineString__StartEnd({ text }, 1, text.length), [new Macro("FOO", "2"), new Macro("BAR", "0.5")], data);
    session.messages.Flush();
    assert.deepEqual(session.messages.output, []);
    assert.equal(compiled, true);
    const [vs, ps] = data.techniques[0].passes[0].stages;
    assert.ok(vs.source.includes("return float4( 0.0, 0.0, 0.0, 2 );"));
    assert.ok(ps.source.includes("return 0.5;"));
});

test("uniform arguments become locals of the wrapper, globals read through Globals", () =>
{
    const { compiled, data, messages } = compile([
        "",
        "float Scale;",
        "float4 vs(): SV_Position { return float4( 0.0, 0.0, 0.0, 1.0 ); }",
        "float4 ps( uniform float s, float4 pos : VPOS ): SV_Target { return s * pos; }",
        "technique t0 { pass p0 { vertexshader = compile vs_3_0 vs(); pixelshader = compile ps_3_0 ps( Scale ); ZEnable = false; } }",
        ""
    ].join("\n"));
    assert.deepEqual(messages, []);
    assert.equal(compiled, true);
    const pass = data.techniques[0].passes[0];
    assert.deepEqual([...pass.states], [[7, 0]]);
    assert.ok(pass.stages[1].source.includes("{float s = ( Globals ).Scale;float4 pos;"));
    assert.ok(pass.stages[1].source.includes("constant GlobalsData& Globals [[ CBUFFER(0) ]]"));
});

test("matrix rows, constructors, truncation and float modulo are rewritten for Metal", () =>
{
    const vs = compileOk(effect("float4x4 W;", "float4 ps(): SV_Target { return 1; }", [
        "float4 vs( float3 p : POSITION ): SV_Position {",
        "float3x3 m = (float3x3)W; float4 r = W[1]; float4x4 k = W; k[0] = r; k[1][2] = 3;",
        "float2x2 q = float2x2( 1, 2, 3, 4 );",
        "return float4( mul( p, m ), 1 ) + r + k[0] + ( r % 2.0 ) + q[0].x; }"
    ].join("\n"))).techniques[0].passes[0].stages[0].source;
    for (const expected of [
        "float3x3 m = to_float3x3( ( Globals ).W );",
        "float4 r = matrixRow( ( Globals ).W, 1 );",
        "( MatrixRow4LH<4>( k, 0 ) ) = ( r );",
        "( ( ( k )[2] )[1] ) = ( 3 );",
        "float2x2 q = transpose( float2x2( 1, 2, 3, 4 ) );",
        "( fmod( r, 2.0 ) )",
        "( matrixRow( q, 0 ) ).x"
    ])
    {
        assert.ok(vs.includes(expected), expected);
    }
});

test("identical stages across permutations share one compile, as Carbon's m_compiled does", () =>
{
    const session = new ShaderCompilerSession({ read: () => null, compilerFactories: new Map() });
    const compiler = new EffectCompilerMetal(session);
    const text = effect("", "float4 ps(): SV_Target { return 1; }");
    const first = new EffectData();
    const second = new EffectData();
    assert.equal(compiler.CompileEffect(InlineString.makeInlineString__StartEnd({ text }, 1, text.length), [], first), true);
    assert.equal(compiler.CompileEffect(InlineString.makeInlineString__StartEnd({ text }, 1, text.length), [new Macro("UNUSED", "1")], second), true);
    assert.equal(compiler._compiled.size, 2);
    assert.equal(second.techniques[0].passes[0].stages[1].shaderData, first.techniques[0].passes[0].stages[1].shaderData);
});

// Carbon defects, reproduced (numbers are assigned in the organization's
// research/carbon-known-defects.md).

test("Carbon defect: only the first name of a global declaration is filed (EffectCompilerMetal.cpp:646-649)", () =>
{
    const ps = compileOk(effect("float a, b;", "float4 ps(): SV_Target { return float4( a, b, 0, 1 ); }")).techniques[0].passes[0].stages[1];
    assert.ok(ps.source.includes("struct  GlobalsData{float a;float b;};"));
    // `a` is reached through Globals; `b` is left as an undeclared name.
    assert.ok(ps.source.includes("return float4( ( Globals ).a, b, 0, 1 );"));
});

test("Carbon defect: PatchVpos swizzles a float3 VPOS with .x (EffectCompilerMetal.cpp:2552)", () =>
{
    const ps = compileOk(effect("", "float4 ps( float4 p : POSITION, float3 v : VPOS ): SV_Target { return float4( v, p.x ); }")).techniques[0].passes[0].stages[1];
    assert.match(ps.source, /\( v \) = \( \( \( __stageIn_\d+ \)\.__p_\d+ \)\.x \);/u);
});

test("Carbon defect: a Metal stage never carries its entry point's annotations (EffectCompilerMetal.cpp:5049, :5166)", () =>
{
    const ps = compileOk(effect("", "float4 ps(): SV_Target < string Tag = \"x\"; > { return 1; }")).techniques[0].passes[0].stages[1];
    assert.equal(ps.annotations.annotations.size, 0);
});

test("Carbon quirk: SV_VERTEXID is a vertex_id without the base_vertex subtraction (EffectCompilerMetal.cpp:2402)", () =>
{
    const vs = compileOk(effect("", "float4 ps(): SV_Target { return 1; }",
        "float4 vs( uint id : SV_VERTEXID ): SV_Position { return float4( id, 0.0, 0.0, 1.0 ); }")).techniques[0].passes[0].stages[0];
    assert.ok(vs.source.includes("uint id[[ vertex_id ]]"));
    assert.ok(!vs.source.includes("base_vertex"));
});

test("Carbon defect: a used half global divides by a zero alignment (EffectCompilerMetal.cpp:3495-3503); the port throws", () =>
{
    assert.throws(() => compile(effect("half h;", "float4 ps(): SV_Target { return h; }")), /divides by its zero alignment/u);
});

test("Carbon quirk: a used uint or bool global with an initializer does not compile", () =>
{
    for (const global of ["uint u = 1u;", "bool u = true;"])
    {
        const { compiled, messages } = compile(effect(global, "float4 ps(): SV_Target { return u; }"));
        assert.equal(compiled, false, global);
        assert.deepEqual(messages, ["(1): error t1014: type mismatch"], global);
    }
});

test("Carbon quirk: a struct global that is not a known constant buffer takes buffer slot 3, a vertex stream", () =>
{
    const { compiled, messages } = compile(effect("struct S { float4 a; };\nS g;", "float4 ps(): SV_Target { return g.a; }"));
    assert.equal(compiled, false);
    assert.deepEqual(messages, ["mainPS(1): error t1046: Couldn't allocate a register for g. Reason: register 3 already assigned to ."]);
});

test("Carbon quirk: an unregistered cbuffer and the globals both take CBUFFER(0)", () =>
{
    const { compiled, messages } = compile(effect("cbuffer X { float c; }\nfloat d;", "float4 ps(): SV_Target { return c + d; }"));
    assert.equal(compiled, false);
    assert.match(messages[0], /Couldn't allocate a register for Globals\. Reason: register 4 already assigned to __cbuffer_\d+\./u);
});

test("Carbon quirk: an explicit texture register is not kept", () =>
{
    const ps = compileOk(effect("Texture2D t : register(t5);", "float4 ps(): SV_Target { return t.Load( int3( 0, 0, 0 ) ); }")).techniques[0].passes[0].stages[1];
    assert.ok(ps.source.includes("texture2d<float> t [[ texture(0) ]]"));
    assert.deepEqual([...ps.textures.keys()], [0]);
});

// The library's outline effect.

const libraryRead = path => (existsSync(join(LIBRARY_ROOT, path)) ? readFileSync(join(LIBRARY_ROOT, path), "utf8") : null);

test("outline/unpacked_quadoutline.fx compiles for Metal", () =>
{
    const session = new ShaderCompilerSession({ read: libraryRead, compilerFactories: new Map() });
    const file = session.includeHandler.Open("outline/unpacked_quadoutline.fx");
    const compiler = new EffectCompilerMetal(session);
    const data = new EffectData();
    const compiled = compiler.CompileEffect(InlineString.makeInlineString__StartEnd(file.data, 1, file.data.text.length), [new Macro("PLATFORM", "10")], data);
    session.messages.Flush();
    assert.deepEqual(session.messages.output, []);
    assert.equal(compiled, true);

    const [vs, ps] = data.techniques[0].passes[0].stages;
    assert.ok(vs.source.includes("constant EveSpaceObjectVSData& PerObjectVS [[ CBUFFER(3) ]]"));
    assert.ok(vs.source.includes("constant EveSpaceScenePerFrameVSData& PerFrameVS [[ CBUFFER(1) ]]"));
    assert.ok(vs.source.includes("constant GlobalsData& Globals [[ CBUFFER(0) ]]"));
    assert.ok(vs.source.includes("to_float3x3( ( PerObjectVS ).worldTransform )"));
    assert.deepEqual(vs.registerInputs.map(r => r.registerIndex), [3, 1, 0]);
    assert.deepEqual(vs.pipelineInputs.map(input => [input.name, input.registerIndex, input.dimension]), [[0, 0, 3], [2, 1, 3]]);
    assert.deepEqual(vs.constants.map(c => [c.name, c.offset, c.size]), [["OutlineSettings", 0, 16]]);
    assert.deepEqual(ps.constants.map(c => [c.name, c.offset, c.size]), [["OutlineColour", 0, 16], ["OutlineSettings", 16, 16]]);
    assert.ok(ps.source.includes(" fragment __StageOutData_"));
    assert.ok(ps.source.includes("[[ color(0) ]]"));
    assert.ok(data.annotations.has("OutlineColour"));
});

test("the driver writes a Metal container for the outline effect", () =>
{
    const { bytes, messages } = CompileEffectFile("outline/unpacked_quadoutline.fx", {
        read: libraryRead,
        compilers: new Map([[Platform.PLATFORM_METAL, session => new EffectCompilerMetal(session)]]),
        defines: [new Macro("PLATFORM", "10")]
    });
    assert.deepEqual(messages, []);
    assert.ok(bytes instanceof Uint8Array && bytes.length > 0);
});
