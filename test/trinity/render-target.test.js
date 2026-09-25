import assert from "node:assert/strict";
import { test } from "node:test";

import { ALResult, Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { Tr2RenderContext } from "../../npm/dist/trinity/core/index.js";
import { Tr2RenderTarget } from "../../npm/dist/trinity/core/device/Tr2RenderTarget.js";
import { ExFlag, PixelFormat, TextureType, Tr2GpuUsage } from "../../npm/dist/global/consts/renderContext/index.js";

// Carbon Tr2RenderTarget (Tr2RenderTarget.cpp): one Tr2TextureAL made through
// the render context, with usage from GetUsage, and every getter read off it.

function stubContext()
{
  const al = new Tr2RenderContextALStub();
  al.CreateDevice({ mode: { width: 64, height: 64 } });
  const context = new Tr2RenderContext();
  context.SetRenderContextAL(al);
  return context;
}

test("CreateArray makes a cube with six faces per element, writable when asked", () =>
{
  const context = stubContext();
  const target = new Tr2RenderTarget();

  const result = target.CreateArray(256, 256, 1, 8, PixelFormat.PIXEL_FORMAT_R16G16B16A16_FLOAT,
    ExFlag.EX_BIND_UNORDERED_ACCESS, TextureType.TEX_TYPE_CUBE, context);

  assert.equal(result, ALResult.S_OK);
  assert.equal(target.GetArraySize(), 6, "cpp:154-157: arraySize *= 6 for a cube");
  assert.equal(target.GetMipCount(), 8);
  assert.equal(target.GetType(), TextureType.TEX_TYPE_CUBE);
  const usage = target.GetRenderTarget().GetGpuUsage();
  assert.ok(usage & Tr2GpuUsage.RENDER_TARGET);
  assert.ok(usage & Tr2GpuUsage.SHADER_RESOURCE);
  assert.ok(usage & Tr2GpuUsage.UNORDERED_ACCESS, "GetUsage adds UAV for EX_BIND_UNORDERED_ACCESS");
  assert.equal(target.GetTexture(), target.GetRenderTarget(), "readable, so GetTexture answers");
  assert.equal(target.arraySize, 6, "the READ projection follows the texture");
});

test("Destroy releases the texture and raises the change event; Attach references another", () =>
{
  const context = stubContext();
  const target = new Tr2RenderTarget();
  const changes = [];
  target.OnTextureChange(changed => changes.push(changed));

  target.Create(64, 64, 1, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM, 1, 0, ExFlag.EX_NONE, TextureType.TEX_TYPE_2D, context);
  assert.equal(target.IsValid(), true);
  assert.equal(changes.length, 0, "Create raises no change; only CreateManual does (cpp:231)");

  target.Destroy();
  assert.equal(target.IsValid(), false);
  assert.equal(target.GetRenderTarget(), null);
  assert.equal(changes.length, 1);

  const other = new Tr2RenderTarget();
  other.Create(32, 32, 1, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM, 1, 0, ExFlag.EX_NONE, TextureType.TEX_TYPE_2D, context);
  target.Attach(other.GetRenderTarget(), other);
  assert.equal(target.IsAttached(), true);
  assert.equal(target.GetRenderTarget(), other.GetRenderTarget());
  assert.equal(target.GetWidth(), 32);
  assert.equal(target.Create(8, 8, 1, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM, 1, 0, ExFlag.EX_NONE, TextureType.TEX_TYPE_2D, context),
    ALResult.E_INVALIDARG, "an attached target refuses Create");
});
