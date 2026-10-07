import { test, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Tr2EffectRes } from "../../src/resource/shader/Tr2EffectRes.js";
import { readBackendBlock } from "../../src/resource/format/index.js";
import { CompileEffectFile } from "../../src/shadercompiler/ShaderCompiler/shaderCompiler.js";
import { Platform } from "../../src/shadercompiler/platforms.js";
import { CjsFxEffectCompilerWebGPU, CjsFxHlslPacking } from "../../src/shadercompiler/EffectCompilerWebGPU/index.js";
import { LIBRARY_ROOT } from "../../scripts/shadercompiler/cbuffer-headers.mjs";
import { parse } from "./support/parse.js";
import { releaseDevice, wgslErrors, pipelineError } from "./support/dawn.js";

after(releaseDevice);

/**
 * Compiles an effect for the WebGPU target, keeping each permutation's
 * EffectData.
 *
 * @param {string} path The effect's path, as the driver opens it.
 * @param {Record<string, string>} [files] Sources by path; the library otherwise.
 * @returns {{ bytes: Uint8Array|null, messages: string[], results: object[] }} The container, messages and EffectData.
 */
function compile(path, files = {})
{
    const read = p => (p in files ? files[p] : existsSync(join(LIBRARY_ROOT, p)) ? readFileSync(join(LIBRARY_ROOT, p), "utf8") : null);
    const results = [];
    const factory = session =>
    {
        const compiler = new CjsFxEffectCompilerWebGPU(session);
        return {
            Create: () => compiler.Create(),
            CompileEffect: (source, defines, result) =>
            {
                const ok = compiler.CompileEffect(source, defines, result);
                results.push(result);
                return ok;
            }
        };
    };
    const { bytes, messages } = CompileEffectFile(path, { read, compilers: new Map([[Platform.PLATFORM_WEBGPU, factory]]) });
    return { bytes, messages, results };
}

/**
 * Every pass of every permutation.
 *
 * @param {object[]} results Per-permutation EffectData.
 * @returns {object[]} The passes.
 */
function passesOf(results)
{
    return results.flatMap(result => result.techniques.flatMap(technique => technique.passes));
}

/**
 * Vertex buffer layouts feeding a vertex stage's pipeline inputs.
 *
 * @param {object} stage The vertex stage.
 * @returns {object[]} One buffer per input.
 */
function buffersFor(stage)
{
    const formats = ["float32x4", "sint32x4", "uint32x4"];
    return stage.pipelineInputs.map(input => ({ arrayStride: 16, attributes: [{ shaderLocation: input.registerIndex, offset: 0, format: formats[input.type] }] }));
}

const PROBE = `
Texture2D DiffuseMap;
SamplerState DiffuseSampler;
float4 Tint;
struct VSOut { float4 pos : SV_Position; float2 uv : TEXCOORD0; };
VSOut vs(float3 p : POSITION, float2 uv : TEXCOORD0) { VSOut o; o.pos = float4(p, 1); o.uv = uv; return o; }
float4 ps(VSOut i) : SV_Target { float4 c = DiffuseMap.Sample(DiffuseSampler, i.uv); c.rgb *= Tint.rgb; return c * 2; }
technique Main { pass P0 { VertexShader = compile vs_5_0 vs(); PixelShader = compile ps_5_0 ps(); } }
`;

const OUTLINES = ["/outline/unpacked_quadoutline.fx", "/outline/unpackedskinned_quadoutline.fx"];

test("HLSL cbuffer packing: no straddling, arrays, matrices and structs start a register", () =>
{
    const { state } = parse(`
        struct Inner { float x; };
        struct Layout { float a; float3 b; float2 c; float3 straddles; float d[2]; float4x4 m; float e; Inner s; float f; row_major float3x4 r; float g; };
        Layout L;`);
    const layout = CjsFxHlslPacking.structLayout(state.GetSymbolTable().LookupGlobal("Layout"));
    const offsets = Object.fromEntries([...layout.members].map(([symbol, member]) => [symbol.name.ToString(), member.offset]));
    // a 0, b 4 (fits), c 16, straddles 32 (24 + 12 would cross 32), d 48 (array: 48, 64; 4 bytes into the
    // second register, so it ends at 68), m 80, e 144, s 160 (struct), f 176 (after a struct),
    // r 192 (row_major float3x4: 3 registers of 4), g 240 (r fills its last register).
    assert.deepEqual(offsets, { a: 0, b: 4, c: 16, straddles: 32, d: 48, m: 80, e: 144, s: 160, f: 176, r: 192, g: 240 });
});

test("a textured probe compiles to WGSL that Dawn accepts and links", async () =>
{
    const { bytes, messages, results } = compile("/probe.fx", { "/probe.fx": PROBE });
    assert.deepEqual(messages, []);
    assert.ok(bytes);
    const [pass] = passesOf(results);
    const [vs, ps] = pass.stages;
    assert.deepEqual(await wgslErrors(vs.shaderData), []);
    assert.deepEqual(await wgslErrors(ps.shaderData), []);
    assert.equal(await pipelineError(vs.shaderData, ps.shaderData, buffersFor(vs)), null);
    assert.match(ps.shaderData, /struct FragmentOutput\n/u);
    assert.match(ps.shaderData, /\n@fragment\nfn main\(/u);
    assert.deepEqual(ps.constants.map(c => [c.name, c.offset, c.size]), [["Tint", 0, 16]]);
});

test("the quad outlines compile, every permutation, to WGSL that Dawn accepts and links", async () =>
{
    for (const effect of OUTLINES)
    {
        const { bytes, messages, results } = compile(effect);
        assert.deepEqual(messages, [], effect);
        assert.ok(bytes, effect);
        for (const pass of passesOf(results))
        {
            for (const stage of pass.stages)
            {
                assert.deepEqual(await wgslErrors(stage.shaderData), [], `${effect} stage ${stage.type}:\n${stage.shaderData}`);
            }
            const vs = pass.stages.find(stage => stage.type === 0);
            const ps = pass.stages.find(stage => stage.type === 1);
            assert.equal(await pipelineError(vs.shaderData, ps.shaderData, buffersFor(vs)), null, effect);
        }
    }
});

test("the skinned outline binds its bone buffer at its declared t0", () =>
{
    const { results } = compile(OUTLINES[1]);
    const [pass] = passesOf(results);
    const vs = pass.stages.find(stage => stage.type === 0);
    const block = readBackendBlock(pass.backendBlock);
    const bones = block.bindGroups[0].bindings.find(binding => binding.generatedSymbol === "BoneTransforms");
    assert.equal(bones.resourceKind, "sampled-resource");
    assert.equal(bones.registerIndex, 0);
    assert.equal(bones.structureStride, 48);
    assert.ok(vs.registerInputs.some(input => input.registerIndex === 0 && (input.registerType & 32) !== 0));
});

test("every WGSL binding is in the pass block with its register, kind and type", () =>
{
    for (const effect of OUTLINES)
    {
        const { results } = compile(effect);
        for (const pass of passesOf(results))
        {
            const bindings = readBackendBlock(pass.backendBlock).bindGroups[0].bindings;
            const declared = pass.stages.flatMap(stage =>
                [...stage.shaderData.matchAll(/@group\(0\) @binding\((\d+)\) var(?:<[^>]+>)? (\w+) : (.+);/gu)]
                    .map(([, binding, name, type]) => ({ binding: Number(binding), name, type, stage: stage.type })));
            assert.equal(declared.length, bindings.length, effect);
            for (const d of declared)
            {
                const binding = bindings.find(b => b.binding === d.binding);
                assert.equal(binding.generatedSymbol, d.name, effect);
                assert.equal(binding.type, d.type, effect);
                assert.deepEqual(binding.visibility, [d.stage === 0 ? "vertex" : "fragment"], effect);
                if (binding.resourceKind === "uniform-buffer")
                {
                    assert.equal(d.name, `cb${binding.registerIndex}`, effect);
                    assert.match(binding.type, /^array<vec4<f32>, \d+>$/u, effect);
                }
            }
            const vs = pass.stages.find(stage => stage.type === 0);
            const locations = [...vs.shaderData.matchAll(/struct cjs__StageInData_\d+\n\{\n([^}]*)\}/gu)]
                .flatMap(([, body]) => [...body.matchAll(/@location\((\d+)\)/gu)].map(m => Number(m[1])));
            assert.deepEqual(locations.sort(), vs.pipelineInputs.map(input => input.registerIndex).sort(), effect);
        }
    }
});

test("the runtime loads the container and hands every stage its WGSL and block", () =>
{
    for (const effect of OUTLINES)
    {
        const { bytes, results } = compile(effect);
        const res = new Tr2EffectRes().DoLoad(bytes);
        for (let index = 0; index < results.length; ++index)
        {
            const pass = res.GetShaderByIndex(index).effect.techniques[0].passes[0];
            assert.ok(pass.backendBlock && pass.backendBlock.size > 0, effect);
            const stages = pass.stageInputs.filter(stage => stage.exists);
            assert.equal(stages.length, 2, effect);
            for (const stage of stages)
            {
                assert.equal(stage.signature.backendBlock, pass.backendBlock, effect);
                const wgsl = new TextDecoder().decode(stage.sourceProgram.bytes);
                assert.match(wgsl, /\nfn main\(/u, effect);
            }
        }
    }
});
