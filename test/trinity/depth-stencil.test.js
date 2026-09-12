import test from "node:test";
import assert from "node:assert/strict";

import { Tr2DepthStencil, Tr2RenderContext } from "../../npm/dist/trinity/core/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { DepthStencilFormat, PixelFormat, Tr2GpuUsage } from "../../npm/dist/global/consts/renderContext/index.js";
import { ConvertDepthStencilFormat } from "../../npm/dist/global/consts/renderContext/index.js";

/** A context with the stub backend, which is the device you get without webgpu or webgl. */
function stubContext()
{
  const al = new Tr2RenderContextALStub();

  al.CreateDevice({ mode: { width: 64, height: 64 } });

  const context = new Tr2RenderContext();

  context.SetRenderContextAL(al);
  return context;
}

test("a fresh depth stencil is invalid and hands out no texture", () =>
{
  const ds = new Tr2DepthStencil();

  assert.equal(ds.IsValid(), false);
  assert.equal(ds.IsReadable(), false);
  assert.equal(ds.GetTexture(), null);
  assert.equal(ds.GetDepthStencil(), null);
  assert.equal(ds.GetWidth(), 0);
  assert.equal(ds.GetHeight(), 0);
});

test("Create makes a sampleable surface and republishes the read projection", () =>
{
  const context = stubContext();
  const ds = new Tr2DepthStencil();

  assert.equal(ds.Create(512, 256, DepthStencilFormat.DSFMT_D32F, 1, 0, 0, context), true);

  assert.equal(ds.IsValid(), true);
  // Carbon always asks for DEPTH_STENCIL | SHADER_RESOURCE, which is what makes
  // the surface sampleable and therefore what IsReadable reports (cpp:51).
  assert.equal(ds.IsReadable(), true);
  assert.equal(ds.GetWidth(), 512);
  assert.equal(ds.GetHeight(), 256);
  // Carbon's GetMipCount is a literal 1 (cpp:164-167).
  assert.equal(ds.GetMipCount(), 1);

  // The @io.read properties are the Blue projection of those accessors, and
  // must not drift from them.
  assert.equal(ds.width, 512);
  assert.equal(ds.height, 256);
  assert.equal(ds.isValid, true);
  assert.equal(ds.isReadable, true);
});

test("GetTexture guards on readability; GetDepthStencil does not", () =>
{
  // Carbon splits these deliberately: GetTexture refuses a surface without
  // SHADER_RESOURCE (cpp:76-83) because its caller is binding a shader input,
  // while the conversion operator hands out the surface itself for a caller
  // rendering INTO it.
  const context = stubContext();
  const ds = new Tr2DepthStencil();

  ds.Create(64, 64, DepthStencilFormat.DSFMT_D24S8, 1, 0, 0, context);

  assert.notEqual(ds.GetDepthStencil(), null);
  assert.equal(ds.GetTexture(), ds.GetDepthStencil());
  assert.equal((ds.GetDepthStencil().GetGpuUsage() & Tr2GpuUsage.DEPTH_STENCIL) !== 0, true);
});

test("Destroy releases the surface and resets the format to Carbon's default", () =>
{
  const context = stubContext();
  const ds = new Tr2DepthStencil();

  ds.Create(64, 64, DepthStencilFormat.DSFMT_D32F, 1, 0, 0, context);
  ds.Destroy();

  assert.equal(ds.IsValid(), false);
  assert.equal(ds.GetTexture(), null);
  assert.equal(ds.GetWidth(), 0);
  assert.equal(ds.width, 0);
  // Carbon resets to DSFMT_AUTO, not DSFMT_UNKNOWN (cpp:106).
  assert.equal(ds.GetFormat(), DepthStencilFormat.DSFMT_AUTO);
});

test("a create with no context destroys rather than leaving half a surface", () =>
{
  // Carbon's `else Destroy()` (cpp:69-72). Without it a caller could read a
  // stale width off an object whose texture never came back.
  const ds = new Tr2DepthStencil();

  ds.name = "shadow";

  assert.equal(ds.Create(128, 128, DepthStencilFormat.DSFMT_D32F), false);
  assert.equal(ds.IsValid(), false);
  assert.equal(ds.width, 0);
});

test("texture-change listeners fire on create and on destroy", () =>
{
  const context = stubContext();
  const ds = new Tr2DepthStencil();
  const seen = [];
  const stop = ds.OnTextureChange(surface => seen.push(surface.IsValid()));

  ds.Create(64, 64, DepthStencilFormat.DSFMT_D32F, 1, 0, 0, context);
  ds.Destroy();

  assert.deepEqual(seen, [ true, false ]);

  stop();
  ds.Create(64, 64, DepthStencilFormat.DSFMT_D32F, 1, 0, 0, context);

  assert.equal(seen.length, 2);
});

test("the depth-stencil format table is Carbon's", () =>
{
  // Tr2RenderContextEnum.cpp:177-193. AUTO and READABLE share a case with the
  // explicit D24 formats, which is Carbon's choice rather than an inference.
  assert.equal(ConvertDepthStencilFormat(DepthStencilFormat.DSFMT_D24S8), PixelFormat.PIXEL_FORMAT_D24_UNORM_S8_UINT);
  assert.equal(ConvertDepthStencilFormat(DepthStencilFormat.DSFMT_AUTO), PixelFormat.PIXEL_FORMAT_D24_UNORM_S8_UINT);
  assert.equal(ConvertDepthStencilFormat(DepthStencilFormat.DSFMT_READABLE), PixelFormat.PIXEL_FORMAT_D24_UNORM_S8_UINT);
  assert.equal(ConvertDepthStencilFormat(DepthStencilFormat.DSFMT_D16), PixelFormat.PIXEL_FORMAT_D16_UNORM);
  assert.equal(ConvertDepthStencilFormat(DepthStencilFormat.DSFMT_D32F), PixelFormat.PIXEL_FORMAT_D32_FLOAT);
  // The lockable formats no backend here creates resolve to UNKNOWN, and a
  // texture create refuses that.
  assert.equal(ConvertDepthStencilFormat(DepthStencilFormat.DSFMT_D15S1), PixelFormat.PIXEL_FORMAT_UNKNOWN);
  assert.equal(ConvertDepthStencilFormat(DepthStencilFormat.DSFMT_D24X4S4), PixelFormat.PIXEL_FORMAT_UNKNOWN);
});
