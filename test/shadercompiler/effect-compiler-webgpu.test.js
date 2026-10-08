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
import { getDevice, releaseDevice, wgslErrors, pipelineError, runCompute } from "./support/dawn.js";

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

const OUTLINES = ["/selection/selectionmask.fx", "/selection/skinned_selectionmask.fx", "/selection/selectionoutline.fx"];

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

test("the selection effects compile, every permutation, to WGSL that Dawn accepts and links", async () =>
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

test("the skinned mask binds its bone buffer at its declared t0", () =>
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

/**
 * Carbon's PackTangentsLegacy (mesh/src/cmf/tangents.cpp:394-411), in JS.
 *
 * @param {number[]} n The normal.
 * @param {number[]} t The tangent.
 * @param {number[]} b The bitangent.
 * @returns {number[]} The packed float4.
 */
function PackTangentsLegacy(n, t, b)
{
    const clamp = x => Math.min(1, Math.max(-1, x));
    const angles = [Math.atan2(t[1], t[0]), Math.acos(clamp(t[2])), Math.atan2(b[1], b[0]), Math.acos(clamp(b[2]))];
    const cross = [t[1] * b[2] - t[2] * b[1], t[2] * b[0] - t[0] * b[2], t[0] * b[1] - t[1] * b[0]];
    if (n[0] * cross[0] + n[1] * cross[1] + n[2] * cross[2] < 0)
    {
        angles[1] = -angles[1];
        angles[3] = -angles[3];
    }
    return angles.map(a => Math.min(1, Math.max(0, (a + Math.PI) / (2 * Math.PI))));
}

// A vertex shader that decodes TANGENT0 with the library's UnpackTangentsLegacy.
const TANGENT_PROBE = `#include "mesh/Tangents.fxh"
float4 vs( float3 position : POSITION, float4 packedTangent : TANGENT ) : SV_Position
{
    float3 normal;
    float3 tangent;
    float3 bitangent;
    UnpackTangentsLegacy( packedTangent, normal, tangent, bitangent );
    return float4( position + normal, 1.0 );
}
float4 ps() : SV_Target { return float4( 1.0, 1.0, 1.0, 1.0 ); }
technique Main { pass P0 { VertexShader = compile vs_5_0 vs(); PixelShader = compile ps_5_0 ps(); } }
`;

test("the library's tangent decode recovers Carbon's legacy tangent frames on the GPU", async () =>
{
    const { results } = compile("/tangentprobe.fx", { "/tangentprobe.fx": TANGENT_PROBE });
    const vs = passesOf(results)[0].stages.find(stage => stage.type === 0).shaderData;
    const start = vs.indexOf("fn UnpackTangentsLegacy(");
    assert.ok(start >= 0, "the packed variant decodes TANGENT0");
    const decode = vs.slice(start, vs.indexOf("\n}\n", start) + 2);

    // Orthonormal frames, both handednesses, none with a tangent along z (an
    // acos of 0 loses the handedness sign in Carbon's encoding too).
    const frames = [];
    for (let i = 0; i < 64; ++i)
    {
        const a = i * 0.7 + 0.1;
        const c = Math.cos(i * 0.37 + 0.2) * 0.9;
        const s = Math.sqrt(1 - c * c);
        const t = [Math.cos(a) * s, Math.sin(a) * s, c];
        const helper = Math.abs(t[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
        const n0 = [t[1] * helper[2] - t[2] * helper[1], t[2] * helper[0] - t[0] * helper[2], t[0] * helper[1] - t[1] * helper[0]];
        const length = Math.hypot(...n0);
        const n = n0.map(v => v / length);
        const rightHanded = [n[1] * t[2] - n[2] * t[1], n[2] * t[0] - n[0] * t[2], n[0] * t[1] - n[1] * t[0]];
        const b = i % 2 === 0 ? rightHanded : rightHanded.map(v => -v);
        frames.push({ n, packed: PackTangentsLegacy(n, t, b) });
    }

    const code = `@group(0) @binding(0) var<storage, read> inputs : array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> outputs : array<vec4<f32>>;
${decode}
@compute @workgroup_size(1)
fn main(@builtin(global_invocation_id) id : vec3<u32>)
{
    var normal : vec3<f32>;
    var tangent : vec3<f32>;
    var bitangent : vec3<f32>;
    UnpackTangentsLegacy(inputs[id.x], &normal, &tangent, &bitangent);
    outputs[id.x] = vec4<f32>(normal, 0.0);
}
`;
    assert.deepEqual(await wgslErrors(code), []);
    const output = await runCompute(code, new Float32Array(frames.flatMap(frame => frame.packed)));
    frames.forEach((frame, i) =>
    {
        for (let k = 0; k < 3; ++k)
        {
            assert.ok(Math.abs(output[i * 4 + k] - frame.n[k]) < 1e-3, `frame ${i}: normal ${[...output.subarray(i * 4, i * 4 + 3)]} against ${frame.n}`);
        }
    });
});

test("the selection outline draws a solid line of the set width around the mask, and nothing inside it", async () =>
{
    const { results } = compile("/selection/selectionoutline.fx");
    const [pass] = passesOf(results);
    const vertexStage = pass.stages.find(stage => stage.type === 0);
    const vs = vertexStage.shaderData;
    const ps = pass.stages.find(stage => stage.type === 1).shaderData;
    const bindings = readBackendBlock(pass.backendBlock).bindGroups[0].bindings;
    // Carbon's screen quad (Tr2RenderUtils.setupScreenQuad): a strip of four
    // clip-space corners, POSITION float4 then TEXCOORD float2.
    const location = usage => vertexStage.pipelineInputs.find(input => input.name === usage).registerIndex;
    const quadLayout = [{ arrayStride: 24, attributes: [
        { shaderLocation: location(0), offset: 0, format: "float32x4" },
        { shaderLocation: location(5), offset: 16, format: "float32x2" }
    ] }];
    const binding = symbol => bindings.find(b => b.generatedSymbol === symbol).binding;

    const size = 64;
    const device = await getDevice();
    // A 20 x 20 square of mask at (22, 22)-(41, 41).
    const mask = new Uint8Array(size * size);
    for (let y = 22; y < 42; ++y) for (let x = 22; x < 42; ++x) mask[y * size + x] = 255;
    const maskTexture = device.createTexture({ size: [size, size], format: "r8unorm", usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
    device.queue.writeTexture({ texture: maskTexture }, mask, { bytesPerRow: size }, [size, size]);
    // OutlineColour red, OutlineSettings brightness 1 and width 3 pixels.
    const uniform = bindings.find(b => b.generatedSymbol === "cb0");
    const registers = Number(/^array<vec4<f32>, (\d+)>$/u.exec(uniform.type)[1]);
    const values = new Float32Array(registers * 4);
    values.set([1, 0, 0, 1, 1, 3, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]);
    const constants = device.createBuffer({ size: values.byteLength, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(constants, 0, values);
    const target = device.createTexture({ size: [size, size], format: "rgba8unorm", usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });

    const pipeline = device.createRenderPipeline({
        layout: "auto",
        vertex: { module: device.createShaderModule({ code: vs }), entryPoint: "main", buffers: quadLayout },
        fragment: {
            module: device.createShaderModule({ code: ps }),
            entryPoint: "main",
            targets: [{ format: "rgba8unorm", blend: { color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" }, alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" } } }]
        },
        primitive: { topology: "triangle-strip" }
    });
    const quad = device.createBuffer({ size: 96, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(quad, 0, new Float32Array([
        -1, 1, 1, 1, 0, 0,
        1, 1, 1, 1, 1, 0,
        -1, -1, 1, 1, 0, 1,
        1, -1, 1, 1, 1, 1
    ]));
    const group = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            { binding: binding("SelectionMask"), resource: maskTexture.createView() },
            { binding: binding("cb0"), resource: { buffer: constants } }
        ]
    });
    const readback = device.createBuffer({ size: size * size * 4, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
    const encoder = device.createCommandEncoder();
    const renderPass = encoder.beginRenderPass({ colorAttachments: [{ view: target.createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
    renderPass.setPipeline(pipeline);
    renderPass.setBindGroup(0, group);
    renderPass.setVertexBuffer(0, quad);
    renderPass.draw(4);
    renderPass.end();
    encoder.copyTextureToBuffer({ texture: target }, { buffer: readback, bytesPerRow: size * 4 }, [size, size]);
    device.queue.submit([encoder.finish()]);
    await readback.mapAsync(GPUMapMode.READ);
    const pixels = new Uint8Array(readback.getMappedRange().slice(0));
    readback.unmap();
    const at = (x, y) => [...pixels.subarray((y * size + x) * 4, (y * size + x) * 4 + 4)];

    assert.deepEqual(at(31, 31), [0, 0, 0, 0], "inside the mask: no line");
    assert.deepEqual(at(5, 5), [0, 0, 0, 0], "far outside: no line");
    // One and two pixels beyond each side: solid red.
    for (const [x, y] of [[20, 31], [21, 31], [43, 31], [42, 31], [31, 20], [31, 43]])
    {
        assert.deepEqual(at(x, y), [255, 0, 0, 255], `line at ${x},${y}`);
    }
    // Four pixels beyond: past the 3-pixel width.
    for (const [x, y] of [[18, 31], [45, 31], [31, 18], [31, 45]])
    {
        assert.deepEqual(at(x, y), [0, 0, 0, 0], `no line at ${x},${y}`);
    }
});
