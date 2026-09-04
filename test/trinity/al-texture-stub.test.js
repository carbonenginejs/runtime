import assert from "node:assert/strict";
import test from "node:test";

import {
  ALResult,
  Tr2BitmapDimensions,
  Tr2MsaaDesc,
  Tr2RenderContextALStub,
  Tr2TextureALStub,
  Tr2TextureSubresource
} from "../../npm/dist/trinity/core/index.js";
import {
  PixelFormat,
  TextureType,
  Tr2CpuUsage,
  Tr2GpuUsage
} from "../../npm/dist/global/consts/renderContext/index.js";

const context = () =>
{
  const al = new Tr2RenderContextALStub();

  al.CreateDevice();

  return al;
};

/** A plain 2D colour texture the GPU can render into. */
const colour = (width = 64, height = 64, mipCount = 1) =>
  Tr2BitmapDimensions.Texture2D(width, height, mipCount, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM);

const create = (texture, desc, options, al) => texture.Create(desc, options, al);


test("a texture refuses to create against a context with no device", () =>
{
  const texture = new Tr2TextureALStub();
  const al = new Tr2RenderContextALStub();

  assert.equal(
    create(texture, colour(), { gpuUsage: Tr2GpuUsage.RENDER_TARGET }, al),
    ALResult.E_FAIL
  );

  assert.equal(texture.IsValid(), false);

  texture.Destroy();
});

test("a render target creates, and reads its size and format back", () =>
{
  const texture = new Tr2TextureALStub();

  assert.equal(
    create(texture, colour(128, 64), { gpuUsage: Tr2GpuUsage.RENDER_TARGET }, context()),
    ALResult.S_OK
  );

  assert.equal(texture.IsValid(), true);
  assert.equal(texture.GetWidth(), 128);
  assert.equal(texture.GetHeight(), 64);
  assert.equal(texture.GetFormat(), PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM);
  assert.equal(texture.GetGpuUsage(), Tr2GpuUsage.RENDER_TARGET);

  texture.Destroy();
});

test("buffer usage on a texture is refused", () =>
{
  // A texture is not a buffer; the two families do not share a create.
  const texture = new Tr2TextureALStub();

  assert.equal(
    create(texture, colour(), { gpuUsage: Tr2GpuUsage.VERTEX_BUFFER }, context()),
    ALResult.E_INVALIDARG
  );

  texture.Destroy();
});

test("a texture nothing can ever write and that arrives empty is refused", () =>
{
  // THE REFUSAL WORTH HAVING. Shader-resource-only, no CPU write, no initial
  // data: this texture would sample black for its whole life, and without this
  // check it would create cleanly and be blamed on the shader.
  const texture = new Tr2TextureALStub();

  assert.equal(
    create(texture, colour(), { gpuUsage: Tr2GpuUsage.SHADER_RESOURCE }, context()),
    ALResult.E_INVALIDARG
  );

  // The same texture with pixels is fine.
  assert.equal(
    create(texture, colour(), { gpuUsage: Tr2GpuUsage.SHADER_RESOURCE, initialData: [ {} ] }, context()),
    ALResult.S_OK
  );

  texture.Destroy();
});

test("a cube must have exactly six faces", () =>
{
  const al = context();
  const texture = new Tr2TextureALStub();

  const cube = (arraySize) => new Tr2BitmapDimensions({
    type: TextureType.TEX_TYPE_CUBE,
    format: PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM,
    width: 32,
    height: 32,
    depth: 1,
    mipCount: 1,
    arraySize
  });

  assert.equal(create(texture, cube(5), { gpuUsage: Tr2GpuUsage.RENDER_TARGET }, al), ALResult.E_INVALIDARG);
  assert.equal(create(texture, cube(6), { gpuUsage: Tr2GpuUsage.RENDER_TARGET }, al), ALResult.S_OK);

  texture.Destroy();
});

test("multisampling excludes compute writes, CPU access and mips", () =>
{
  const al = context();
  const texture = new Tr2TextureALStub();
  const msaa = new Tr2MsaaDesc(4);

  assert.equal(
    create(texture, colour(), { msaa, gpuUsage: Tr2GpuUsage.UNORDERED_ACCESS }, al),
    ALResult.E_INVALIDARG,
    "a multisampled UAV is not a thing"
  );

  assert.equal(
    create(texture, colour(), { msaa, gpuUsage: Tr2GpuUsage.RENDER_TARGET, cpuUsage: Tr2CpuUsage.READ }, al),
    ALResult.E_INVALIDARG,
    "the CPU cannot reach a multisampled surface"
  );

  assert.equal(
    create(texture, colour(64, 64, 4), { msaa, gpuUsage: Tr2GpuUsage.RENDER_TARGET }, al),
    ALResult.E_INVALIDARG,
    "a multisampled surface has no mip chain"
  );

  assert.equal(create(texture, colour(), { msaa, gpuUsage: Tr2GpuUsage.RENDER_TARGET }, al), ALResult.S_OK);
  assert.equal(texture.GetMsaaDesc().samples, 4);

  texture.Destroy();
});

test("a depth stencil takes no CPU access and no mip chain", () =>
{
  const al = context();
  const texture = new Tr2TextureALStub();

  assert.equal(
    create(texture, colour(), { gpuUsage: Tr2GpuUsage.DEPTH_STENCIL, cpuUsage: Tr2CpuUsage.READ }, al),
    ALResult.E_INVALIDARG
  );

  assert.equal(
    create(texture, colour(64, 64, 4), { gpuUsage: Tr2GpuUsage.DEPTH_STENCIL }, al),
    ALResult.E_INVALIDARG
  );

  assert.equal(create(texture, colour(), { gpuUsage: Tr2GpuUsage.DEPTH_STENCIL }, al), ALResult.S_OK);

  texture.Destroy();
});

test("a render target the CPU can write is refused", () =>
{
  const texture = new Tr2TextureALStub();

  assert.equal(
    create(
      texture,
      colour(),
      { gpuUsage: Tr2GpuUsage.RENDER_TARGET, cpuUsage: Tr2CpuUsage.WRITE },
      context()
    ),
    ALResult.E_INVALIDARG
  );

  texture.Destroy();
});

test("mapping needs the usage it was created with", () =>
{
  // The CPU-read test runs BEFORE validity, so the code says "you never asked
  // for this" rather than "something is wrong", which is a different repair.
  const al = context();
  const texture = new Tr2TextureALStub();

  create(texture, colour(), { gpuUsage: Tr2GpuUsage.RENDER_TARGET }, al);

  const region = Tr2TextureSubresource.ForMipLevel(0);
  const mapped = texture.MapForReading(region, true, al);

  assert.equal(mapped.result, ALResult.E_INVALIDCALL);
  assert.equal(mapped.data, null);

  texture.Destroy();
});

test("a map hands back a real buffer at the mip pitch", () =>
{
  // This is what "headless but carrying correct data" means in practice: the
  // buffer is the size a device would give, so a caller reading pixels back
  // reads the same shape.
  const al = context();
  const texture = new Tr2TextureALStub();

  const result = create(
    texture,
    colour(64, 32, 1),
    { gpuUsage: Tr2GpuUsage.SHADER_RESOURCE, cpuUsage: Tr2CpuUsage.WRITE },
    al
  );

  assert.equal(result, ALResult.S_OK);

  const mapped = texture.MapForWriting(Tr2TextureSubresource.ForMipLevel(0), al);

  assert.equal(mapped.result, ALResult.S_OK);
  assert.equal(mapped.pitch, 64 * 4);
  assert.equal(mapped.data.length, 64 * 4 * 32);

  mapped.data[0] = 7;

  texture.UnmapForWriting();

  // Not a WRITE_OFTEN texture, so the buffer went with the unmap.
  const remapped = texture.MapForWriting(Tr2TextureSubresource.ForMipLevel(0), al);

  assert.equal(remapped.data[0], 0, "the buffer was released rather than kept");

  texture.Destroy();
});

test("a texture mapped often keeps its buffer across an unmap", () =>
{
  const al = context();
  const texture = new Tr2TextureALStub();

  create(
    texture,
    colour(16, 16, 1),
    { gpuUsage: Tr2GpuUsage.SHADER_RESOURCE, cpuUsage: Tr2CpuUsage.WRITE_OFTEN },
    al
  );

  const mapped = texture.MapForWriting(Tr2TextureSubresource.ForMipLevel(0), al);

  mapped.data[0] = 7;
  texture.UnmapForWriting();

  const remapped = texture.MapForWriting(Tr2TextureSubresource.ForMipLevel(0), al);

  assert.equal(remapped.data[0], 7);

  texture.Destroy();
});

test("a compressed mip pitch counts blocks, not pixels", () =>
{
  // The trap this exists for: a BC1 mip below 4x4 still occupies a whole 4x4
  // block, so the chain does not keep halving. A pitch computed as pixels is
  // right at the top and wrong everywhere else.
  const desc = Tr2BitmapDimensions.Texture2D(64, 64, 0, PixelFormat.PIXEL_FORMAT_BC1_UNORM);

  assert.equal(desc.GetTrueMipCount(), 7);
  assert.equal(desc.GetMipWidth(0), 64);
  assert.equal(desc.GetMipPitch(0), 64 / 4 * 8);

  assert.equal(desc.GetMipWidth(5), 4, "a 2x2 mip is still a whole block");
  assert.equal(desc.GetMipWidth(6), 4, "and so is a 1x1 one");
  assert.equal(desc.GetMipPitch(6), 8);
  assert.equal(desc.GetMipSize(6), 8);

  assert.equal(desc.GetMipWidth(7), 0, "past the chain there is nothing");
});

test("an uncompressed mip chain halves and floors at one", () =>
{
  const desc = Tr2BitmapDimensions.Texture2D(8, 4, 0, PixelFormat.PIXEL_FORMAT_R8_UNORM);

  assert.equal(desc.GetTrueMipCount(), 4);
  assert.deepEqual([ 0, 1, 2, 3 ].map(level => desc.GetMipWidth(level)), [ 8, 4, 2, 1 ]);
  assert.deepEqual([ 0, 1, 2, 3 ].map(level => desc.GetMipHeight(level)), [ 4, 2, 1, 1 ]);
});

test("a region past the mip chain is refused rather than mapped", () =>
{
  const al = context();
  const texture = new Tr2TextureALStub();

  // Read-only and never written by the GPU, so it needs pixels at creation -
  // otherwise the create refuses and the map fails on validity instead, which
  // would prove nothing about the region.
  const created = create(
    texture,
    colour(16, 16, 1),
    { gpuUsage: Tr2GpuUsage.SHADER_RESOURCE, cpuUsage: Tr2CpuUsage.READ, initialData: [ {} ] },
    al
  );

  assert.equal(created, ALResult.S_OK);

  const mapped = texture.MapForReading(Tr2TextureSubresource.ForMipLevel(3), true, al);

  assert.equal(mapped.result, ALResult.E_INVALIDARG);

  texture.Destroy();
});

test("a box on a compressed texture cannot be written through a map", () =>
{
  // A partial write into a block format would land mid-block.
  const al = context();
  const texture = new Tr2TextureALStub();

  create(
    texture,
    Tr2BitmapDimensions.Texture2D(64, 64, 1, PixelFormat.PIXEL_FORMAT_BC3_UNORM),
    { gpuUsage: Tr2GpuUsage.SHADER_RESOURCE, cpuUsage: Tr2CpuUsage.WRITE },
    al
  );

  const region = Tr2TextureSubresource.ForMipLevel(0).SetRect(0, 0, 8, 8);
  const mapped = texture.MapForWriting(region, al);

  assert.equal(mapped.result, ALResult.E_INVALIDARG);

  texture.Destroy();
});

test("a whole-to-whole copy succeeds and a cropped one is checked", () =>
{
  const al = context();
  const source = new Tr2TextureALStub();
  const destination = new Tr2TextureALStub();

  create(source, colour(64, 64), { gpuUsage: Tr2GpuUsage.RENDER_TARGET }, al);
  create(destination, colour(64, 64), { gpuUsage: Tr2GpuUsage.RENDER_TARGET }, al);

  const whole = () => new Tr2TextureSubresource();

  assert.equal(
    destination.CopySubresourceRegion(whole(), source, whole(), al),
    ALResult.S_OK
  );

  const region = Tr2TextureSubresource.ForMipLevel(0).SetRect(0, 0, 32, 32);
  const caller = Tr2TextureSubresource.ForMipLevel(0).SetRect(0, 0, 32, 32);

  assert.equal(destination.CopySubresourceRegion(region, source, caller, al), ALResult.S_OK);

  assert.equal(caller.m_box.right, 32, "the caller's region survived the crop unchanged");

  source.Destroy();
  destination.Destroy();
});

test("a copy into a texture nothing may write is refused", () =>
{
  const al = context();
  const source = new Tr2TextureALStub();
  const destination = new Tr2TextureALStub();

  create(source, colour(), { gpuUsage: Tr2GpuUsage.RENDER_TARGET }, al);
  create(destination, colour(), { gpuUsage: Tr2GpuUsage.SHADER_RESOURCE, initialData: [ {} ] }, al);

  assert.equal(
    destination.CopySubresourceRegion(new Tr2TextureSubresource(), source, new Tr2TextureSubresource(), al),
    ALResult.E_INVALIDCALL
  );

  source.Destroy();
  destination.Destroy();
});

test("mip generation needs both a render target and a shader resource", () =>
{
  const al = context();
  const texture = new Tr2TextureALStub();

  create(texture, colour(64, 64, 4), { gpuUsage: Tr2GpuUsage.RENDER_TARGET }, al);

  assert.equal(texture.GenerateMipMaps(), ALResult.E_INVALIDCALL);

  create(
    texture,
    colour(64, 64, 4),
    { gpuUsage: Tr2GpuUsage.RENDER_TARGET | Tr2GpuUsage.SHADER_RESOURCE },
    al
  );

  assert.equal(texture.GenerateMipMaps(), ALResult.S_OK);

  texture.Destroy();
});

test("resolving a single-sampled texture falls back to a copy", () =>
{
  const al = context();
  const source = new Tr2TextureALStub();
  const destination = new Tr2TextureALStub();

  create(source, colour(), { gpuUsage: Tr2GpuUsage.RENDER_TARGET }, al);
  create(destination, colour(), { gpuUsage: Tr2GpuUsage.RENDER_TARGET }, al);

  assert.equal(source.Resolve(destination, al), ALResult.S_OK);

  source.Destroy();
  destination.Destroy();
});

test("a resolve into a mismatched target is refused", () =>
{
  const al = context();
  const source = new Tr2TextureALStub();
  const destination = new Tr2TextureALStub();

  create(source, colour(64, 64), { msaa: new Tr2MsaaDesc(4), gpuUsage: Tr2GpuUsage.RENDER_TARGET }, al);
  create(destination, colour(32, 32), { gpuUsage: Tr2GpuUsage.RENDER_TARGET }, al);

  assert.equal(source.Resolve(destination, al), ALResult.E_INVALIDARG);

  source.Destroy();
  destination.Destroy();
});

test("Destroy empties the texture and leaves the resource registry", () =>
{
  const texture = new Tr2TextureALStub();

  create(texture, colour(), { gpuUsage: Tr2GpuUsage.RENDER_TARGET }, context());

  assert.equal(texture.IsRegistered(), true);

  texture.Destroy();

  assert.equal(texture.IsValid(), false);
  assert.equal(texture.IsRegistered(), false);
});

test("the context creates a real back buffer and reports its size", () =>
{
  // The reason the texture was the next thing to port: without it the context
  // stub could hold a bound target but could not answer anything about it.
  const al = new Tr2RenderContextALStub();

  al.CreateDevice({ mode: { width: 1024, height: 768 } });

  assert.equal(al.GetBackBufferFormat(), PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
  assert.equal(al.GetBackBuffer().IsValid(), true);
  assert.equal(al.GetRenderTarget(0), al.GetBackBuffer(), "the back buffer is bound to slot zero");

  const size = al.GetRenderTargetSize(0);

  assert.equal(size.result, ALResult.S_OK);
  assert.equal(size.width, 1024);
  assert.equal(size.height, 768);

  al.ReleaseDeviceResources();
});

test("an empty slot and an out-of-range slot fail differently", () =>
{
  // Carbon separates them on purpose: one is a caller asking about a target
  // that is not bound, the other is a caller indexing past the array.
  const al = new Tr2RenderContextALStub();

  al.CreateDevice({ mode: { width: 256, height: 256 } });

  assert.equal(al.GetRenderTargetSize(1).result, ALResult.E_INVALIDCALL);
  assert.equal(al.GetRenderTargetSize(99).result, ALResult.E_FAIL);

  al.ReleaseDeviceResources();
});

test("releasing device resources unbinds everything", () =>
{
  const al = new Tr2RenderContextALStub();

  al.CreateDevice({ mode: { width: 256, height: 256 } });
  al.ReleaseDeviceResources();

  assert.equal(al.GetRenderTarget(0), null);
  assert.equal(al.GetBackBuffer().IsValid(), false);
});
