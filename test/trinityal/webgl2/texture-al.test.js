import assert from "node:assert/strict";
import { test } from "node:test";

import { Tr2TextureALWebgl2 } from "../../../npm/dist/trinityal/webgl2/index.js";
import { ALResult, Tr2BitmapDimensions, Tr2MsaaDesc, Tr2SubresourceData } from "../../../npm/dist/trinityal/index.js";
import { PixelFormat, TextureType, Tr2ColorSpace, Tr2GpuUsage } from "../../../npm/dist/global/consts/renderContext/index.js";
import { FakeRenderContext, FakeWebgl2 } from "./fakeWebgl2.js";

const S3TC = { COMPRESSED_RGBA_S3TC_DXT1_EXT: 0x83f1 };

function dims(type, format, width, height, depth = 1, mips = 1, arraySize = 1)
{
    return new Tr2BitmapDimensions({ type, format, width, height, depth, mipCount: mips, arraySize });
}

function data(bytes, pitch = 0, slicePitch = 0)
{
    const level = new Tr2SubresourceData();
    level.m_sysMem = bytes;
    level.m_sysMemPitch = pitch;
    level.m_sysMemSlicePitch = slicePitch;
    return level;
}

function create(desc, options, extensions = {})
{
    const { gl, calls } = FakeWebgl2();
    gl.extensions = extensions;
    const texture = new Tr2TextureALWebgl2();
    const result = texture.Create(desc, options, FakeRenderContext(gl));
    return { gl, calls, texture, result };
}

const called = (calls, name) => calls.filter(call => call[0] === name);

test("dx11's refusals hold: a cube must have six faces", () =>
{
    const { result } = create(dims(TextureType.TEX_TYPE_CUBE, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM, 4, 4, 1, 1, 4),
        { gpuUsage: Tr2GpuUsage.SHADER_RESOURCE | Tr2GpuUsage.RENDER_TARGET });
    assert.equal(result, ALResult.E_INVALIDARG);
});

test("WebGL2 refuses unordered access and a multisampled shader resource", () =>
{
    const uav = create(dims(TextureType.TEX_TYPE_2D, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM, 4, 4),
        { gpuUsage: Tr2GpuUsage.UNORDERED_ACCESS | Tr2GpuUsage.RENDER_TARGET });
    assert.equal(uav.result, ALResult.E_INVALIDARG);

    const msaa = new Tr2MsaaDesc();
    msaa.samples = 4;
    const sampled = create(dims(TextureType.TEX_TYPE_2D, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM, 4, 4),
        { gpuUsage: Tr2GpuUsage.RENDER_TARGET | Tr2GpuUsage.SHADER_RESOURCE, msaa });
    assert.equal(sampled.result, ALResult.E_INVALIDARG);
});

test("a multisampled render target is a multisampled renderbuffer", () =>
{
    const msaa = new Tr2MsaaDesc();
    msaa.samples = 4;
    const { gl, calls, texture, result } = create(dims(TextureType.TEX_TYPE_2D, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM, 8, 8),
        { gpuUsage: Tr2GpuUsage.RENDER_TARGET, msaa });

    assert.equal(result, ALResult.S_OK);
    assert.ok(texture.GetRenderbuffer());
    assert.equal(texture.GetGpuResource(), null);
    const [ , , samples, internalFormat, width, height ] = called(calls, "renderbufferStorageMultisample")[0];
    assert.deepEqual([ samples, internalFormat, width, height ], [ 4, gl.RGBA8, 8, 8 ]);
});

test("BC1 with the S3TC extension uploads its blocks compressed", () =>
{
    const blocks = new Uint8Array(8);
    const { calls, result } = create(dims(TextureType.TEX_TYPE_2D, PixelFormat.PIXEL_FORMAT_BC1_UNORM, 4, 4),
        { gpuUsage: Tr2GpuUsage.SHADER_RESOURCE, initialData: [ data(blocks, 8) ] },
        { WEBGL_compressed_texture_s3tc: S3TC });

    assert.equal(result, ALResult.S_OK);
    assert.equal(called(calls, "texStorage2D")[0][3], 0x83f1);
    const upload = called(calls, "compressedTexSubImage2D")[0];
    assert.equal(upload[7], 0x83f1);
    assert.equal(called(calls, "texSubImage2D").length, 0);
});

test("a BC3 volume is always decompressed: no extension fills a TEXTURE_3D with blocks", () =>
{
    const blocks = new Uint8Array(16 * 2);
    const { gl, calls, result } = create(dims(TextureType.TEX_TYPE_3D, PixelFormat.PIXEL_FORMAT_BC3_UNORM, 4, 4, 2),
        { gpuUsage: Tr2GpuUsage.SHADER_RESOURCE, initialData: [ data(blocks, 16, 16) ] },
        { WEBGL_compressed_texture_s3tc: S3TC });

    assert.equal(result, ALResult.S_OK);
    assert.equal(called(calls, "texStorage3D")[0][3], gl.RGBA8);
    const upload = called(calls, "texSubImage3D")[0];
    assert.deepEqual([ upload[6], upload[7], upload[8] ], [ 4, 4, 2 ], "width, height, depth");
    assert.equal(upload[11].length, 4 * 4 * 2 * 4, "RGBA8 for every slice");
    assert.equal(called(calls, "compressedTexSubImage3D").length, 0);
});

test("without its extension a BC format falls back to the spec decoder: RGBA8, or float for BC6H", () =>
{
    const bc1 = create(dims(TextureType.TEX_TYPE_2D, PixelFormat.PIXEL_FORMAT_BC1_UNORM, 4, 4),
        { gpuUsage: Tr2GpuUsage.SHADER_RESOURCE, initialData: [ data(new Uint8Array(8), 8) ] });
    assert.equal(bc1.result, ALResult.S_OK);
    assert.equal(called(bc1.calls, "texStorage2D")[0][3], bc1.gl.RGBA8);

    const bc7 = create(dims(TextureType.TEX_TYPE_2D, PixelFormat.PIXEL_FORMAT_BC7_UNORM, 4, 4),
        { gpuUsage: Tr2GpuUsage.SHADER_RESOURCE, initialData: [ data(new Uint8Array(16), 16) ] });
    assert.equal(bc7.result, ALResult.S_OK);
    assert.equal(called(bc7.calls, "texStorage2D")[0][3], bc7.gl.RGBA8);

    const bc6h = create(dims(TextureType.TEX_TYPE_2D, PixelFormat.PIXEL_FORMAT_BC6H_UF16, 4, 4),
        { gpuUsage: Tr2GpuUsage.SHADER_RESOURCE, initialData: [ data(new Uint8Array(16), 16) ] });
    assert.equal(bc6h.result, ALResult.S_OK);
    assert.equal(called(bc6h.calls, "texStorage2D")[0][3], bc6h.gl.RGBA16F);
    assert.ok(called(bc6h.calls, "texSubImage2D")[0][9] instanceof Float32Array);
});

test("the fallback decodes to the specification, not Carbon's Metal output", () =>
{
    // BC1 three-colour index 3: the spec says transparent black; Carbon's
    // Metal decompressor keeps color2's RGB (CE-37).
    const block = new Uint8Array(8);
    new DataView(block.buffer).setUint16(0, 0x001f, true);
    new DataView(block.buffer).setUint16(2, 0xf800, true);
    new DataView(block.buffer).setUint32(4, 0xffffffff, true);

    const { calls } = create(dims(TextureType.TEX_TYPE_2D, PixelFormat.PIXEL_FORMAT_BC1_UNORM, 4, 4),
        { gpuUsage: Tr2GpuUsage.SHADER_RESOURCE, initialData: [ data(block, 8) ] });

    const pixels = called(calls, "texSubImage2D")[0][9];
    assert.deepEqual(Array.from(pixels.subarray(0, 4)), [ 0, 0, 0, 0 ]);
});

test("BGRA8 data is swizzled to RGBA on upload", () =>
{
    const bgra = new Uint8Array([ 1, 2, 3, 4 ]);
    const { calls } = create(dims(TextureType.TEX_TYPE_2D, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM, 1, 1),
        { gpuUsage: Tr2GpuUsage.SHADER_RESOURCE, initialData: [ data(bgra, 4) ] });

    const pixels = called(calls, "texSubImage2D")[0][9];
    assert.deepEqual(Array.from(pixels), [ 3, 2, 1, 4 ]);
});

test("the sRGB view is a second texture, built on first request from the initial data", () =>
{
    const { calls, texture } = create(dims(TextureType.TEX_TYPE_2D, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM, 1, 1),
        { gpuUsage: Tr2GpuUsage.SHADER_RESOURCE, initialData: [ data(new Uint8Array(4), 4) ] });

    const linear = texture.GetShaderResourceTexture(Tr2ColorSpace.COLOR_SPACE_LINEAR);
    assert.equal(called(calls, "createTexture").length, 1);

    const srgb = texture.GetShaderResourceTexture(Tr2ColorSpace.COLOR_SPACE_SRGB);
    assert.notEqual(srgb, linear);
    assert.equal(called(calls, "createTexture").length, 2);
    assert.equal(texture.GetShaderResourceTexture(Tr2ColorSpace.COLOR_SPACE_SRGB), srgb, "built once");
});

test("a texture with no initial data answers its linear texture for sRGB, Carbon's fallback", () =>
{
    const { texture } = create(dims(TextureType.TEX_TYPE_2D, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM, 4, 4),
        { gpuUsage: Tr2GpuUsage.SHADER_RESOURCE | Tr2GpuUsage.RENDER_TARGET });

    assert.equal(texture.GetShaderResourceTexture(Tr2ColorSpace.COLOR_SPACE_SRGB), texture.GetGpuResource());
});
