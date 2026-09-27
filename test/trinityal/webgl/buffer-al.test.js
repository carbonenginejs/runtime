import assert from "node:assert/strict";
import { test } from "node:test";

import { Tr2BufferALWebgl, DATA_TEXTURE_WIDTH } from "../../../npm/dist/trinityal/webgl/index.js";
import { ALResult, Tr2BufferDescriptionAL } from "../../../npm/dist/trinityal/index.js";
import { PixelFormat, Tr2CpuUsage, Tr2GpuUsage } from "../../../npm/dist/global/consts/renderContext/index.js";
import { FakeRenderContext, FakeWebgl } from "./fakeWebgl.js";

const floats = values => new Float32Array(values);
const bytesOf = view => new Uint8Array(view.buffer, view.byteOffset, view.byteLength);

function created(desc, initialData = null)
{
    const { gl, calls } = FakeWebgl();
    const context = FakeRenderContext(gl);
    const buffer = new Tr2BufferALWebgl();
    const result = buffer.Create(desc, initialData, context);
    return { gl, calls, context, buffer, result };
}

test("an immutable buffer needs its contents at Create, as dx11 requires", () =>
{
    const desc = Tr2BufferDescriptionAL.FromStride(16, 4, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.NONE);
    const { buffer, result } = created(desc);

    assert.equal(result, ALResult.E_INVALIDARG);
    assert.equal(buffer.IsValid(), false);
});

test("an immutable vertex buffer uploads its contents STATIC_DRAW through the copy target", () =>
{
    const desc = Tr2BufferDescriptionAL.FromStride(8, 2, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.NONE);
    const { gl, calls, buffer, result } = created(desc, floats([ 1, 2, 3, 4 ]));

    assert.equal(result, ALResult.S_OK);
    assert.equal(buffer.IsValid(), true);
    assert.equal(buffer.GetSize(), 16);

    const upload = calls.find(call => call[0] === "bufferData");
    assert.equal(upload[1], gl.COPY_WRITE_BUFFER);
    assert.equal(upload[4], gl.STATIC_DRAW);
    assert.deepEqual(upload[3], bytesOf(floats([ 1, 2, 3, 4 ])));

    // The type-fixing bind used the real target and restored the previous binding.
    const binds = calls.filter(call => call[0] === "bindBuffer" && call[1] === gl.ARRAY_BUFFER);
    assert.equal(binds[0][2], buffer.GetGpuResource());
    assert.equal(binds[1][2], null);
});

test("an index buffer fixes its type with no vertex array bound, then restores it", () =>
{
    const desc = Tr2BufferDescriptionAL.FromFormat(PixelFormat.PIXEL_FORMAT_R16_UINT, 3, Tr2GpuUsage.INDEX_BUFFER, Tr2CpuUsage.NONE);
    const { gl, calls } = FakeWebgl();
    const vao = { kind: "vao" };
    gl.bindVertexArray(vao);

    const buffer = new Tr2BufferALWebgl();
    assert.equal(buffer.Create(desc, new Uint16Array([ 0, 1, 2 ]), FakeRenderContext(gl)), ALResult.S_OK);

    const vertexArrays = calls.filter(call => call[0] === "bindVertexArray").map(call => call[1]);
    assert.deepEqual(vertexArrays, [ vao, null, vao ]);
    assert.ok(calls.some(call => call[0] === "bindBuffer" && call[1] === gl.ELEMENT_ARRAY_BUFFER && call[2] === buffer.GetGpuResource()));
});

test("unordered access is refused: WebGL2 has no storage buffers", () =>
{
    const desc = Tr2BufferDescriptionAL.FromStride(16, 4, Tr2GpuUsage.UNORDERED_ACCESS, Tr2CpuUsage.WRITE);
    const { buffer, result } = created(desc);

    assert.equal(result, ALResult.E_INVALIDARG);
    assert.equal(buffer.IsValid(), false);
});

test("WRITE_OFTEN maps CPU memory and orphans the storage on unmap, dx11's WRITE_DISCARD", () =>
{
    const desc = Tr2BufferDescriptionAL.FromStride(4, 4, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE_OFTEN);
    const { gl, calls, context, buffer } = created(desc);

    const { result, data } = buffer.MapForWriting(context);
    assert.equal(result, ALResult.S_OK);
    data.set([ 9, 8, 7, 6 ]);
    buffer.UnmapForWriting(context);

    const last = calls.filter(call => call[0] === "bufferData").at(-1);
    assert.equal(last[4], gl.DYNAMIC_DRAW);
    assert.deepEqual(Array.from(last[3].subarray(0, 4)), [ 9, 8, 7, 6 ]);
});

test("NON_SYNCRONIZED_WRITE keeps the storage and writes over it, dx11's WRITE_NO_OVERWRITE", () =>
{
    const cpu = Tr2CpuUsage.WRITE_OFTEN | Tr2CpuUsage.NON_SYNCRONIZED_WRITE;
    const desc = Tr2BufferDescriptionAL.FromStride(4, 2, Tr2GpuUsage.VERTEX_BUFFER, cpu);
    const { calls, context, buffer } = created(desc);

    buffer.MapForWriting(context);
    buffer.UnmapForWriting(context);

    assert.equal(calls.filter(call => call[0] === "bufferData").length, 1, "only the Create upload");
    assert.ok(calls.some(call => call[0] === "bufferSubData" && call[3] === 0));
});

test("UpdateBuffer on a WRITE buffer is a sub-data upload at the offset", () =>
{
    const desc = Tr2BufferDescriptionAL.FromStride(4, 4, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE);
    const { calls, context, buffer } = created(desc);

    assert.equal(buffer.UpdateBuffer(4, 4, new Uint8Array([ 1, 2, 3, 4 ]), context), ALResult.S_OK);

    const write = calls.find(call => call[0] === "bufferSubData");
    assert.equal(write[3], 4);
    assert.deepEqual(Array.from(write[4]), [ 1, 2, 3, 4 ]);
    assert.equal(buffer.UpdateBuffer(14, 4, new Uint8Array(4), context), ALResult.E_INVALIDARG, "past the end");
});

test("UpdateBuffer on a buffer the CPU cannot write is refused", () =>
{
    const desc = Tr2BufferDescriptionAL.FromStride(4, 1, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.NONE);
    const { context, buffer } = created(desc, new Uint8Array(4));

    assert.equal(buffer.UpdateBuffer(0, 4, new Uint8Array(4), context), ALResult.E_INVALIDCALL);
});

test("MapForReading reads the device buffer back, whole or ranged", () =>
{
    const cpu = Tr2CpuUsage.READ | Tr2CpuUsage.WRITE;
    const desc = Tr2BufferDescriptionAL.FromStride(1, 8, Tr2GpuUsage.VERTEX_BUFFER, cpu);
    const { context, buffer } = created(desc, new Uint8Array([ 0, 1, 2, 3, 4, 5, 6, 7 ]));

    const whole = buffer.MapForReading(context);
    assert.equal(whole.result, ALResult.S_OK);
    assert.deepEqual(Array.from(whole.data), [ 0, 1, 2, 3, 4, 5, 6, 7 ]);
    buffer.UnmapForReading(context);

    const ranged = buffer.MapForReading(context, 2, 3);
    assert.deepEqual(Array.from(ranged.data), [ 2, 3, 4 ]);
    buffer.UnmapForReading(context);

    assert.equal(buffer.MapForReading(context, 6, 4).result, ALResult.E_INVALIDARG, "past the end");
});

test("reading a buffer without READ is refused", () =>
{
    const desc = Tr2BufferDescriptionAL.FromStride(4, 1, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE);
    const { context, buffer } = created(desc);

    assert.equal(buffer.MapForReading(context).result, ALResult.E_INVALIDCALL);
});

test("an R32_FLOAT shader-resource buffer is an R32F data texture, rebuilt only when its bytes change", () =>
{
    const desc = Tr2BufferDescriptionAL.FromFormat(PixelFormat.PIXEL_FORMAT_R32_FLOAT, 3, Tr2GpuUsage.SHADER_RESOURCE, Tr2CpuUsage.WRITE);
    const { gl, calls, context, buffer } = created(desc);

    const texture = buffer.GetShaderResourceTexture();
    assert.ok(texture);

    let uploads = calls.filter(call => call[0] === "texImage2D");
    assert.equal(uploads.length, 1);
    const [ , target, , , internalFormat, width, height, , format, type, source ] = uploads[0];
    assert.equal(target, texture);
    assert.deepEqual([ internalFormat, width, height, format, type ], [ gl.R32F, 3, 1, gl.RED, gl.FLOAT ]);
    assert.ok(source instanceof Float32Array);

    buffer.GetShaderResourceTexture();
    assert.equal(calls.filter(call => call[0] === "texImage2D").length, 1, "clean: no second upload");

    buffer.UpdateBuffer(0, 4, floats([ 5 ]), context);
    buffer.GetShaderResourceTexture();
    uploads = calls.filter(call => call[0] === "texImage2D");
    assert.equal(uploads.length, 2);
    assert.equal(uploads[1][10][0], 5);
});

test("a structured buffer is read four words to a texel, rows of the emitter's width", () =>
{
    const count = DATA_TEXTURE_WIDTH + 1;
    const desc = Tr2BufferDescriptionAL.FromStride(16, count, Tr2GpuUsage.SHADER_RESOURCE, Tr2CpuUsage.WRITE);
    const { gl, calls, buffer } = created(desc);

    buffer.GetShaderResourceTexture();
    const [ , , , , internalFormat, width, height ] = calls.find(call => call[0] === "texImage2D");
    assert.deepEqual([ internalFormat, width, height ], [ gl.RGBA32F, DATA_TEXTURE_WIDTH, 2 ]);
});

test("a raw (non-structured) shader-resource buffer is viewed as R32_UINT, as dx11 views it", () =>
{
    const gpu = Tr2GpuUsage.VERTEX_BUFFER | Tr2GpuUsage.SHADER_RESOURCE;
    const desc = Tr2BufferDescriptionAL.FromStride(4, 4, gpu, Tr2CpuUsage.WRITE);
    const { gl, calls, buffer } = created(desc);

    buffer.GetShaderResourceTexture();
    const [ , , , , internalFormat ] = calls.find(call => call[0] === "texImage2D");
    assert.equal(internalFormat, gl.R32UI);
});

test("Destroy deletes the device objects", () =>
{
    const desc = Tr2BufferDescriptionAL.FromFormat(PixelFormat.PIXEL_FORMAT_R32_FLOAT, 1, Tr2GpuUsage.SHADER_RESOURCE, Tr2CpuUsage.WRITE);
    const { calls, buffer } = created(desc);
    const device = buffer.GetGpuResource();
    const texture = buffer.GetShaderResourceTexture();

    buffer.Destroy();

    assert.equal(buffer.IsValid(), false);
    assert.ok(calls.some(call => call[0] === "deleteBuffer" && call[1] === device));
    assert.ok(calls.some(call => call[0] === "deleteTexture" && call[1] === texture));
});
