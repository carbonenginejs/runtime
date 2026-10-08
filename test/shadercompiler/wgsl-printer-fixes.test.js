import { test, after } from "node:test";
import assert from "node:assert/strict";
import { CompileEffectFile } from "../../src/shadercompiler/ShaderCompiler/shaderCompiler.js";
import { Platform } from "../../src/shadercompiler/platforms.js";
import { CjsFxEffectCompilerWebGPU, CjsFxHlslPacking } from "../../src/shadercompiler/EffectCompilerWebGPU/index.js";
import { readBackendBlock } from "../../src/resource/format/index.js";
import { parse } from "./support/parse.js";
import { getDevice, releaseDevice, wgslErrors } from "./support/dawn.js";

after(releaseDevice);

/**
 * Compile a synthetic effect and retain its reflected stages.
 * @param {string} source The HLSL declarations.
 * @param {string} stages The pass's shader assignments.
 * @returns {object} Compiler output and its first pass.
 */
function compile(source, stages = "PixelShader = compile ps_5_0 ps();")
{
    const results = [];
    const factory = session =>
    {
        const compiler = new CjsFxEffectCompilerWebGPU(session);
        return {
            Create: () => compiler.Create(),
            CompileEffect: (text, defines, result) =>
            {
                const ok = compiler.CompileEffect(text, defines, result);
                results.push(result);
                return ok;
            }
        };
    };
    const result = CompileEffectFile("/probe.fx", {
        read: () => `${source}\ntechnique Main { pass P { ${stages} } }`,
        compilers: new Map([[Platform.PLATFORM_WEBGPU, factory]])
    });
    return { ...result, pass: results[0]?.techniques[0]?.passes[0] };
}

/**
 * Assert successful compilation and return the pixel stage.
 * @param {object} result Compiler output.
 * @returns {string} Fragment WGSL.
 */
function pixel(result)
{
    assert.deepEqual(result.messages, []);
    assert.ok(result.bytes);
    return result.pass.stages.find(stage => stage.type === 1).shaderData;
}

const VERTEX = `@vertex fn main(@builtin(vertex_index) id: u32) -> @builtin(position) vec4<f32> {
    let p = array<vec2<f32>, 3>(vec2<f32>(-1, -1), vec2<f32>(3, -1), vec2<f32>(-1, 3));
    return vec4<f32>(p[id], 0, 1);
}`;

/**
 * Draw one pixel, preserving float results for arithmetic checks.
 * @param {string} fragment Fragment WGSL.
 * @param {object[]} entries Resources for group zero.
 * @param {string} vertex Vertex WGSL.
 * @returns {Promise<number[]>} The RGBA pixel.
 */
async function draw(fragment, entries = [], vertex = VERTEX)
{
    assert.deepEqual(await wgslErrors(fragment), []);
    assert.deepEqual(await wgslErrors(vertex), []);
    const device = await getDevice();
    device.pushErrorScope("validation");
    const target = device.createTexture({ size: [1, 1], format: "rgba32float", usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
    const readback = device.createBuffer({ size: 256, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
    try
    {
        const pipeline = device.createRenderPipeline({
            layout: "auto",
            vertex: { module: device.createShaderModule({ code: vertex }), entryPoint: "main" },
            fragment: { module: device.createShaderModule({ code: fragment }), entryPoint: "main", targets: [{ format: "rgba32float" }] }
        });
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({ colorAttachments: [{ view: target.createView(), loadOp: "clear", storeOp: "store" }] });
        pass.setPipeline(pipeline);
        if (entries.length)
        {
            pass.setBindGroup(0, device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries }));
        }
        pass.draw(3);
        pass.end();
        encoder.copyTextureToBuffer({ texture: target }, { buffer: readback, bytesPerRow: 256 }, [1, 1]);
        device.queue.submit([encoder.finish()]);
        assert.equal(await device.popErrorScope(), null);
        await readback.mapAsync(GPUMapMode.READ);
        const output = new Float32Array(readback.getMappedRange().slice(0, 16));
        readback.unmap();
        return [...output];
    }
    finally
    {
        target.destroy();
        readback.destroy();
    }
}

for (const [method, extra] of [["Sample", ""], ["SampleLevel", ", 0"], ["SampleBias", ", 0"], ["SampleGrad", ", float2(0,0), float2(0,0)"]])
{
    test(`${method} preserves a constant texel offset in GPU readback`, async () =>
    {
        const result = compile(`Texture2D T; SamplerState S;
            float4 ps():SV_Target { return T.${method}(S, float2(0.125,0.125)${extra}, int2(1,2)); }`);
        const source = pixel(result);
        const device = await getDevice();
        const texture = device.createTexture({ size: [4, 4], format: "rgba8unorm", usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
        try
        {
            const data = new Uint8Array(64);
            for (let i = 0; i < 16; ++i)
            {
                data[i * 4] = i;
            }
            device.queue.writeTexture({ texture }, data, { bytesPerRow: 16 }, [4, 4]);
            const bindings = readBackendBlock(result.pass.backendBlock).bindGroups[0].bindings;
            const entries = bindings.map(binding => ({ binding: binding.binding, resource: binding.generatedSymbol === "T" ? texture.createView() : device.createSampler() }));
            const output = await draw(source, entries);
            assert.ok(Math.abs(output[0] - 9 / 255) < 1e-6, `offset texel 9, received ${output[0] * 255}`);
        }
        finally
        {
            texture.destroy();
        }
    });

    test(`${method} rejects runtime texel offsets`, () =>
    {
        assert.throws(() => compile(`Texture2D T; SamplerState S;
            float4 ps(float2 uv:TEXCOORD0):SV_Target { return T.${method}(S, uv${extra}, int2(uv)); }`), /offset.*constant.*not supported yet/u);
    });
}

test("packoffset reads the declared register and component", async () =>
{
    const result = compile(`cbuffer C:register(b0) { float a:packoffset(c3.y); };
        float4 ps():SV_Target { return float4(a,0,0,1); }`);
    const source = pixel(result);
    // Upload distinguishable data at byte 0 and the declared byte 52.
    const device = await getDevice();
    const buffer = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    try
    {
        const data = new Float32Array(16);
        data[0] = 3;
        data[13] = 17;
        device.queue.writeBuffer(buffer, 0, data);
        assert.deepEqual(await draw(source, [{ binding: 0, resource: { buffer } }]), [17, 0, 0, 1]);
    }
    finally
    {
        buffer.destroy();
    }
});

test("packoffset layout preserves backward declarations and used-member placements", () =>
{
    const { state, ok, messages } = parse("cbuffer C { float high:packoffset(c3.y); float low:packoffset(c0.z); };");
    assert.equal(ok, true, messages.join("\n"));
    const declaration = state.GetTree().GetChild(0);
    const struct = declaration.GetSymbol();
    struct.definition = declaration;
    const layout = CjsFxHlslPacking.structLayout(struct);
    for (const member of layout.members.keys())
    {
        member.used = true;
    }
    const offsets = value => [...value.members.values()].map(member => member.offset);
    assert.deepEqual(offsets(layout), [52, 8]);
    assert.equal(layout.size, 56);
    assert.deepEqual(offsets(CjsFxHlslPacking.usedMembersLayout(struct)), [52, 8]);
});

test("StructuredBuffer<float3> preserves tight element stride or explicitly rejects it", async () =>
{
    let result;
    try
    {
        result = compile("StructuredBuffer<float3> Data; float4 ps():SV_Target { return float4(Data[1],1); }");
    }
    catch (error)
    {
        assert.match(error.message, /structured buffer.*not supported yet/u);
        return;
    }
    const source = pixel(result);
    const device = await getDevice();
    const buffer = device.createBuffer({ size: 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    try
    {
        device.queue.writeBuffer(buffer, 0, new Float32Array([1,2,3,4,5,6,7,8]));
        assert.deepEqual(await draw(source, [{ binding: 0, resource: { buffer } }]), [4,5,6,1]);
    }
    finally
    {
        buffer.destroy();
    }
});

test("matrix compound multiplication is componentwise or explicitly rejected", async () =>
{
    let result;
    try
    {
        result = compile(`float4 ps():SV_Target { float2x2 m=float2x2(1,2,3,4);
            m*=float2x2(5,6,7,8); return float4(mul(m,float2(1,0)),0,1); }`);
    }
    catch (error)
    {
        assert.match(error.message, /component-wise matrix.*not supported yet/u);
        return;
    }
    assert.deepEqual(await draw(pixel(result)), [5,21,0,1]);
});

for (const [modifier, expected] of [["noperspective", 0.25], ["nointerpolation", 0]])
{
    test(`${modifier} matches across vertex and fragment stages in GPU readback`, async () =>
    {
        const result = compile(`struct V { float4 p:SV_Position; ${modifier} float uv:TEXCOORD0; };
            V vs(uint id:SV_VertexID) {
                V o; float w=id==0?1:(id==1?2:4);
                o.p=float4((id==1?3:-1)*w,(id==2?3:-1)*w,0,w);
                o.uv=id==1?1:0; return o;
            }
            float4 ps(V v):SV_Target { return float4(v.uv,0,0,1); }`,
        "VertexShader = compile vs_5_0 vs(); PixelShader = compile ps_5_0 ps();");
        const output = await draw(pixel(result), [], result.pass.stages.find(stage => stage.type === 0).shaderData);
        assert.ok(Math.abs(output[0] - expected) < 1e-6, `${modifier}: expected ${expected}, received ${output[0]}`);
    });
}

test("scalar compound swizzle assignment validates and keeps HLSL values", async () =>
{
    const result = compile("float4 ps():SV_Target { float2 uv=float2(3,4); uv.xy*=2; return float4(uv,0,1); }");
    assert.deepEqual(await draw(pixel(result)), [6,8,0,1]);
});

for (const [expression, expected] of [
    ["float4(mul(float2(2,3),float2(5,7)),0,0,1)", [31,0,0,1]],
    ["float4(mul(float2(2,3),float3(5,7,11)),0,0,1)", [31,0,0,1]],
    ["float4(mul(int2(2,3),int2(5,7)),0,0,1)", [31,0,0,1]],
    ["float4(mul(2.0,3.0),mul(2.0,float2(3,4)),1)", [6,6,8,1]],
    ["float4(mul(float2(3,4),2.0),0,1)", [6,8,0,1]],
    ["float4(mul(mul(2.0,float2x2(1,2,3,4)),float2(1,0)),0,1)", [2,6,0,1]],
    ["float4(mul(mul(float2x2(1,2,3,4),2.0),float2(1,0)),0,1)", [2,6,0,1]],
    ["float4(mul(float2x2(1,2,3,4),float2(5,7)),0,1)", [19,43,0,1]],
    ["float4(mul(float2(5,7),float2x2(1,2,3,4)),0,1)", [26,38,0,1]],
    ["float4(mul(mul(float2x2(1,2,3,4),float2x2(5,6,7,8)),float2(1,0)),0,1)", [19,43,0,1]]
])
{
    test(`mul overload readback: ${expression}`, async () =>
    {
        assert.deepEqual(await draw(pixel(compile(`float4 ps():SV_Target { return ${expression}; }`))), expected);
    });
}

test("compute numthreads becomes a valid WGSL workgroup size", async () =>
{
    const result = compile("[numthreads(8,4,1)] void cs(uint3 id:SV_DispatchThreadID) { uint x=id.x; }",
        "ComputeShader = compile cs_5_0 cs();");
    assert.deepEqual(result.messages, []);
    assert.ok(result.bytes);
    const stage = result.pass.stages[0];
    assert.deepEqual(await wgslErrors(stage.shaderData), []);
    assert.match(stage.shaderData, /@workgroup_size\(8, 4, 1\)/u);
    assert.deepEqual(stage.threadGroupSize, [8,4,1]);
});

test("Sample offsets expand local const arithmetic into WGSL const expressions", async () =>
{
    const result = compile(`Texture2D T; SamplerState S;
        float4 ps():SV_Target { const int2 offset=int2((1+1),-2); return T.Sample(S,float2(0,0),offset); }`);
    assert.deepEqual(await wgslErrors(pixel(result)), []);
});

test("Sample offsets expand constant swizzles but reject uniform components", async () =>
{
    const result = compile(`Texture2D T; SamplerState S;
        float4 ps():SV_Target { const int3 offset=int3(1,2,3); return T.Sample(S,float2(0,0),offset.xy); }`);
    assert.deepEqual(await wgslErrors(pixel(result)), []);
    assert.throws(() => compile(`Texture2D T; SamplerState S; int4 Offset;
        float4 ps():SV_Target { return T.Sample(S,float2(0,0),Offset.xy); }`), /offset.*constant.*not supported yet/u);
});

test("Sample rejects mutable initialized offsets and extra overload arguments", () =>
{
    assert.throws(() => compile(`Texture2D T; SamplerState S;
        float4 ps():SV_Target { int2 offset=int2(1,2); return T.Sample(S,float2(0,0),offset); }`), /offset.*constant.*not supported yet/u);
    assert.throws(() => compile(`Texture2D T; SamplerState S;
        float4 ps():SV_Target { return T.Sample(S,float2(0,0),int2(1,2),0); }`), /Sample.*not supported yet/u);
});

for (const [texture, coordinate, offset] of [["Texture2DArray", "float3(0,0,1)", "int2(1,2)"], ["Texture3D", "float3(0,0,0)", "int3(1,2,3)"]])
{
    test(`${texture} SampleLevel offsets validate with spatial coordinates`, async () =>
    {
        const result = compile(`${texture} T; SamplerState S;
            float4 ps():SV_Target { return T.SampleLevel(S,${coordinate},0,${offset}); }`);
        assert.deepEqual(await wgslErrors(pixel(result)), []);
    });
}

test("global packoffset agrees with reflection and default bytes", () =>
{
    const result = compile("float4 Tint:packoffset(c3)=float4(1,2,3,4); float4 ps():SV_Target { return Tint; }");
    pixel(result);
    const stage = result.pass.stages[0];
    assert.deepEqual(stage.constants.map(c => [c.name,c.offset,c.size]), [["Tint",48,16]]);
    const defaults = new DataView(stage.defaultValues.buffer, stage.defaultValues.byteOffset, stage.defaultValues.byteLength);
    assert.deepEqual([0,1,2,3].map(i => defaults.getFloat32(48 + i * 4, true)), [1,2,3,4]);
});

for (const type of ["float", "float2", "float4"])
{
    test(`StructuredBuffer<${type}> records its compatible stride`, async () =>
    {
        const result = compile(`StructuredBuffer<${type}> Data; float4 ps():SV_Target { return Data[1].xxxx; }`);
        assert.deepEqual(await wgslErrors(pixel(result)), []);
        const binding = readBackendBlock(result.pass.backendBlock).bindGroups[0].bindings[0];
        assert.equal(binding.structureStride, type === "float" ? 4 : type === "float2" ? 8 : 16);
    });
}

test("packoffset places automatic globals after manual declarations regardless of source order", () =>
{
    const result = compile(`float automatic=7; float4 manual:packoffset(c3)=float4(1,2,3,4);
        float unused; float4 ps():SV_Target { return manual+automatic; }`);
    pixel(result);
    assert.deepEqual(result.pass.stages[0].constants.map(c => [c.name,c.offset]), [["automatic",64],["manual",48]]);
});

for (const declarations of [
    "float3 v:packoffset(c2.z);",
    "float v:packoffset(c2.xy);",
    "float4 v:packoffset(c0); float4 w:packoffset(c0);",
    "float v[2]:packoffset(c0.y);"
])
{
    test(`invalid packoffset is rejected: ${declarations}`, () =>
    {
        const { state, ok, messages } = parse(`cbuffer C { ${declarations} };`);
        assert.equal(ok, true, messages.join("\n"));
        const declaration = state.GetTree().GetChild(0);
        const symbol = declaration.GetSymbol();
        symbol.definition = declaration;
        assert.throws(() => CjsFxHlslPacking.structLayout(symbol), /packoffset.*not supported yet/u);
    });
}

test("packoffset preserves matrix and array register strides", () =>
{
    const { state, ok, messages } = parse("cbuffer C { float values[2]:packoffset(c4); float2x2 m:packoffset(c1); };");
    assert.equal(ok, true, messages.join("\n"));
    const declaration = state.GetTree().GetChild(0);
    const symbol = declaration.GetSymbol();
    symbol.definition = declaration;
    const layout = CjsFxHlslPacking.structLayout(symbol);
    assert.deepEqual([...layout.members.values()].map(member => [member.offset,member.size,member.stride]), [[64,20,16],[16,24,32]]);
    assert.equal(layout.size, 84);
});

for (const method of ["SampleCmp", "SampleCmpLevelZero"])
{
    test(`${method} remains explicitly unsupported`, () =>
    {
        assert.throws(() => compile(`Texture2D T; SamplerComparisonState S;
            float4 ps():SV_Target { return T.${method}(S,float2(0,0),0.5,int2(1,2)); }`), /texture method.*not supported yet/u);
    });
}
