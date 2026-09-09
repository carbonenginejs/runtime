import assert from "node:assert/strict";
import { test } from "node:test";

import { CjsWebgpuDevice } from "../../../npm/dist/trinityal/webgpu/index.js";
import { CjsWebgpuRenderContextAL, CjsWebgpuTextureAL } from "../../../npm/dist/trinityal/webgpu/internal.js";
import { ALResult, Tr2BitmapDimensions } from "../../../npm/dist/trinityal/index.js";
import { PixelFormat, TextureType, Tr2CpuUsage, Tr2GpuUsage } from "../../../npm/dist/global/consts/renderContext/index.js";

// Carbon creates a texture with one Tr2SubresourceData per (mip, layer),
// indexed mip + layer * mipCount (Tr2ImageIOHelpers.cpp:104-128), and Metal
// keeps a format-reinterpreting sRGB view beside it (MetalContext.mm:342-357).
// These pin the WebGPU texture's creation, upload order, and views.

const SHADER_STAGE = Object.freeze({ VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 });
const TEXTURE_USAGE = Object.freeze({ TEXTURE_BINDING: 4, COPY_DST: 2, RENDER_ATTACHMENT: 16 });

function composed()
{
  const calls = { textures: [], writes: [], views: [] };
  const device = {
    createTexture(descriptor)
    {
      calls.textures.push(descriptor);

      return {
        kind: "texture",
        descriptor,
        destroy() { calls.destroyed = true; },
        createView(view)
        {
          calls.views.push(view);

          return { kind: "view", ...view };
        }
      };
    },
    queue: { writeTexture(destination, data, layout, size) { calls.writes.push({ destination, bytes: data.byteLength, layout, size }); } },
    createShaderModule: descriptor => ({ kind: "module", descriptor }),
    pushErrorScope() {},
    popErrorScope() { return Promise.resolve(null); }
  };
  const webgpu = new CjsWebgpuDevice({ device, shaderStage: SHADER_STAGE, textureUsage: TEXTURE_USAGE });
  const al = new CjsWebgpuRenderContextAL({
    webgpu,
    dispatcher: { PrepareAccumulator: () => null, EncodeAccumulator() {} },
    renderTarget: { GetWidth: () => 1, GetHeight: () => 1, GetFormat: () => "bgra8unorm", GetDepthFormat: () => null, GetSampleCount: () => 1 }
  });

  al.CreateDevice();

  return { al, calls };
}

/** A BC1 2D texture with two mips: 8x8 (4 blocks, 32 bytes) and 4x4 (1 block, 8 bytes). */
function bc1Mips()
{
  return [
    { sysMem: new Uint8Array(32), sysMemPitch: 16, sysMemSlicePitch: 32 },
    { sysMem: new Uint8Array(8), sysMemPitch: 8, sysMemSlicePitch: 8 }
  ];
}

test("Create makes the texture with its sRGB sibling declared and uploads one write per subresource", () =>
{
  const { al, calls } = composed();
  const texture = new CjsWebgpuTextureAL();
  const desc = Tr2BitmapDimensions.Texture2D(8, 8, 2, PixelFormat.PIXEL_FORMAT_BC1_UNORM);

  assert.equal(texture.Create(desc, { gpuUsage: Tr2GpuUsage.SHADER_RESOURCE, cpuUsage: Tr2CpuUsage.READ, initialData: bc1Mips() }, al), ALResult.S_OK);
  assert.equal(texture.IsValid(), true);

  const created = calls.textures[0];

  assert.equal(created.format, "bc1-rgba-unorm");
  assert.deepEqual(created.viewFormats, [ "bc1-rgba-unorm-srgb" ], "Metal's sRGB view, declared up front");
  assert.deepEqual(created.size, { width: 8, height: 8, depthOrArrayLayers: 1 });
  assert.equal(created.mipLevelCount, 2);
  assert.equal(created.usage & TEXTURE_USAGE.TEXTURE_BINDING, TEXTURE_USAGE.TEXTURE_BINDING);

  assert.equal(calls.writes.length, 2);
  assert.deepEqual(calls.writes.map(write => [ write.destination.mipLevel, write.bytes, write.layout.bytesPerRow, write.layout.rowsPerImage, write.size.width ]), [
    [ 0, 32, 16, 2, 8 ],
    [ 1, 8, 8, 1, 4 ]
  ]);

  assert.equal(texture.GetWidth(), 8);
  assert.equal(texture.GetMipCount(), 2);
  assert.equal(texture.GetFormat(), PixelFormat.PIXEL_FORMAT_BC1_UNORM);
  assert.equal(texture.GetType(), TextureType.TEX_TYPE_2D);
  assert.equal(texture.GetSrvIndexInHeap(), 0xffffffff);
});

test("views are made per dimension and colour space, once each; sRGB reinterprets the format", () =>
{
  const { al, calls } = composed();
  const texture = new CjsWebgpuTextureAL();

  texture.Create(Tr2BitmapDimensions.Texture2D(8, 8, 1, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM), { initialData: [ { sysMem: new Uint8Array(256), sysMemPitch: 32, sysMemSlicePitch: 256 } ] }, al);

  const linear = texture.GetDeviceTextureView("2d", 0);
  const srgb = texture.GetDeviceTextureView("2d", 1);

  assert.equal(linear.format, undefined, "the texture's own format");
  assert.equal(srgb.format, "rgba8unorm-srgb");
  assert.equal(texture.GetDeviceTextureView("2d", 0), linear, "cached");
  assert.equal(texture.GetDeviceTextureView("2d", 1), srgb);
  assert.equal(calls.views.length, 2);
  assert.equal(texture.GetDeviceTextureView().dimension, "2d", "the texture's own dimension by default");

  // A format with no sRGB sibling answers the linear view for both spaces.
  const single = new CjsWebgpuTextureAL();

  single.Create(Tr2BitmapDimensions.Texture2D(4, 4, 1, PixelFormat.PIXEL_FORMAT_BC5_UNORM), { initialData: [ { sysMem: new Uint8Array(16), sysMemPitch: 16, sysMemSlicePitch: 16 } ] }, al);
  assert.equal(single.GetDeviceTextureView("2d", 1).format, undefined);
  assert.equal(calls.textures[1].viewFormats, undefined);
});

test("a cube uploads six layers in Carbon's mip + layer * mipCount order, and views as a cube", () =>
{
  const { al, calls } = composed();
  const texture = new CjsWebgpuTextureAL();
  const desc = new Tr2BitmapDimensions({ type: TextureType.TEX_TYPE_CUBE, format: PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM, width: 2, height: 2, depth: 1, mipCount: 1, arraySize: 6 });
  const initialData = Array.from({ length: 6 }, (_, face) => ({ sysMem: new Uint8Array(16).fill(face), sysMemPitch: 8, sysMemSlicePitch: 16 }));

  assert.equal(texture.Create(desc, { initialData }, al), ALResult.S_OK);
  assert.deepEqual(calls.textures[0].size, { width: 2, height: 2, depthOrArrayLayers: 6 });
  assert.deepEqual(calls.writes.map(write => write.destination.origin.z), [ 0, 1, 2, 3, 4, 5 ]);
  assert.equal(texture.GetDeviceTextureView().dimension, "cube");
  assert.equal(texture.GetDeviceTextureView("2d-array").dimension, "2d-array", "a cube binds as an array when the layout says so");
});

test("Carbon's refusals: no data for an unwritable texture, an unknown format, a cube that is not faces", () =>
{
  const { al, calls } = composed();
  const texture = new CjsWebgpuTextureAL();

  assert.equal(texture.Create(Tr2BitmapDimensions.Texture2D(8, 8, 1, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM), {}, al), ALResult.E_INVALIDARG, "samples black forever");
  assert.equal(texture.Create(Tr2BitmapDimensions.Texture2D(8, 8, 1, PixelFormat.PIXEL_FORMAT_R32G32B32_FLOAT), { initialData: [ {} ] }, al), ALResult.E_INVALIDARG, "no WebGPU format");
  assert.equal(texture.Create(new Tr2BitmapDimensions({ type: TextureType.TEX_TYPE_CUBE, format: PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM, width: 2, height: 2, mipCount: 1, arraySize: 5 }), { initialData: [ {} ] }, al), ALResult.E_INVALIDARG);
  assert.equal(texture.Create(Tr2BitmapDimensions.Texture2D(8, 8, 1, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM), { initialData: [ {} ] }, { IsValid: () => false }), ALResult.E_FAIL);
  assert.equal(calls.textures.length, 0);
  assert.equal(texture.IsValid(), false);

  // A render target needs no data: the GPU writes it.
  assert.equal(texture.Create(Tr2BitmapDimensions.Texture2D(8, 8, 1, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM), { gpuUsage: Tr2GpuUsage.RENDER_TARGET }, al), ALResult.S_OK);
  assert.equal(calls.textures[0].usage & TEXTURE_USAGE.RENDER_ATTACHMENT, TEXTURE_USAGE.RENDER_ATTACHMENT);

  texture.SetName("hull");
  assert.equal(texture.GetDeviceTexture().label, "hull");
  texture.Destroy();
  assert.equal(calls.destroyed, true);
  assert.equal(texture.IsValid(), false);
});

test("the context creates the backend's texture, and Create accepts Trinity's context", () =>
{
  const { al } = composed();
  const desc = Tr2BitmapDimensions.Texture2D(4, 4, 1, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM);
  const data = [ { sysMem: new Uint8Array(64), sysMemPitch: 16, sysMemSlicePitch: 64 } ];

  assert.ok(al.CreateTexture(desc, { initialData: data }) instanceof CjsWebgpuTextureAL);
  assert.equal(al.CreateTexture(desc, {}), null, "a refused create is null");

  const texture = new CjsWebgpuTextureAL();

  assert.equal(texture.Create(desc, { initialData: data }, { GetRenderContextAL: () => al }), ALResult.S_OK);
});
