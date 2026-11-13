import assert from "node:assert/strict";
import test from "node:test";
import { Tr2DeviceResource, Tr2Renderer, TriDevice } from "../../npm/dist/trinity/index.js";
import { TriTextureRes } from "../../npm/dist/resource/index.js";
import { Tr2DepthStencil, Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/core/index.js";
import { Tr2RenderTarget } from "../../npm/dist/trinity/core/device/Tr2RenderTarget.js";
import { Tr2RuntimeTextureParameter } from "../../npm/dist/trinity/shader/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { DepthStencilFormat, PixelFormat } from "../../npm/dist/global/consts/renderContext/index.js";
import { ALResult } from "../../npm/dist/trinityal/index.js";
import { TriStorageFlags } from "../../npm/dist/global/consts/graphics/index.js";

// Tr2RenderTarget and Tr2DepthStencil are Tr2DeviceResources (Tr2RenderTarget.h:18-20, Tr2DepthStencil.h:19-21).
// Ours expire by disuse: creating, sampling or rendering into one is a use and renews it; an idle one is released
// by TriDevice.CollectResources and loses its pixels. A read never creates storage (a getter may run with no GPU):
// it answers null and registers the target again, and the device tick recreates it from the kept parameters
// (Tr2RenderTarget.cpp:498-508, Tr2DepthStencil.cpp:186-202) on the main-thread context.

const SECOND = 10000000;

/** A device with an empty registry, a settable clock, and the stub backend on the main-thread context. */
function setup(t)
{
  const oldResources = TriDevice._resourcesRegistered, oldGenerations = TriDevice._registeredGenerations;
  const previousActiveTime = TriDevice.activeTime, previousStorage = TriDevice.resourceSweepStorage;
  const context = Tr2RenderContext_GetMainThreadRenderContext(), previousAL = context.GetRenderContextAL();

  TriDevice._resourcesRegistered = [];
  TriDevice._registeredGenerations = [];
  TriDevice.activeTime = 1000 * SECOND;

  const al = new Tr2RenderContextALStub();
  al.CreateDevice({ mode: { width: 64, height: 64 } });
  context.SetRenderContextAL(al);
  t.mock.method(Tr2Renderer, "IsResourceCreationAllowed", () => true);

  t.after(() =>
  {
    context.SetRenderContextAL(previousAL);
    TriDevice.activeTime = previousActiveTime;
    TriDevice.resourceSweepStorage = previousStorage;
    TriDevice._resourcesRegistered = oldResources;
    TriDevice._registeredGenerations = oldGenerations;
  });

  return { device: new TriDevice(), at: seconds => { TriDevice.activeTime = (1000 + seconds) * SECOND; } };
}

const registered = resource => TriDevice.GetResourcesRegistered().includes(resource);

function renderTarget(size = 16)
{
  const target = new Tr2RenderTarget();
  target.Create(size, size, 1, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM);
  return target;
}

/** Sweeps every `step` seconds for `total` seconds, calling `use` before each sweep. */
function sweepWhile(device, at, total, step, use)
{
  for (let seconds = step; seconds <= total; seconds += step)
  {
    at(seconds);
    use();
    device.CollectResources();
  }
}

test("Tr2RenderTarget takes the device-resource base and registers on creation", t =>
{
  setup(t);
  const target = new Tr2RenderTarget();
  assert.equal(target.KeepAlive, Tr2DeviceResource.prototype.KeepAlive);
  assert.equal(registered(target), false, "nothing is registered before a use");

  target.Create(16, 16, 1, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM);
  assert.equal(registered(target), true, "creation is its first use");
  assert.notEqual(target._neverPurge, true, "a render target may expire");

  const texture = target._renderTarget;
  target.Destruct();
  assert.equal(registered(target), false, "the base's teardown unregisters");
  assert.equal(texture.IsValid(), false, "_Destructor releases the owned texture");
  target.Destruct();
});

test("a render target sampled each frame survives sweeps", t =>
{
  const { device, at } = setup(t), target = renderTarget();
  const texture = target.GetTexture();

  sweepWhile(device, at, 4 * TriDevice.resourceIdleRule, 10, () => target.GetTexture());

  assert.equal(target.GetTexture(), texture, "the same texture, never released");
  assert.equal(texture.IsValid(), true);
});

test("a render target only rendered into survives sweeps", t =>
{
  const { device, at } = setup(t), target = renderTarget();
  const texture = target.GetRenderTarget();

  sweepWhile(device, at, 4 * TriDevice.resourceIdleRule, 10, () => target.GetRenderTarget());

  assert.equal(target._renderTarget, texture);
  assert.equal(texture.IsValid(), true);
});

test("a render target nothing reads expires and loses its pixels; a read registers it and the device tick recreates it", t =>
{
  const { device, at } = setup(t), target = renderTarget(32);
  const texture = target.GetRenderTarget();
  let changes = 0;
  const listener = { Changed() { changes += 1; } };
  target.OnTextureChange().RegisterListener(listener, listener.Changed);

  at(TriDevice.resourceIdleRule + 1);
  device.CollectResources();

  assert.equal(target._renderTarget, null, "the sweep released the owned texture");
  assert.equal(texture.IsValid(), false, "its pixels are gone");
  assert.equal(registered(target), false);
  assert.equal(changes, 1, "release raises the change event (cpp:493)");

  assert.equal(target.GetRenderTarget(), null, "a read creates nothing");
  assert.equal(target.GetTexture(), null);
  assert.equal(target.GenerateMipMaps(), ALResult.E_FAIL, "no surface fails, as an invalid Tr2TextureAL does");
  assert.equal(registered(target), true, "but use registers it again");
  assert.equal(changes, 1);

  device._PreparePendingResources();
  const recreated = target.GetRenderTarget();
  assert.ok(recreated && recreated.IsValid(), "the device tick prepared it");
  assert.notEqual(recreated, texture, "a new, blank texture");
  assert.deepEqual([ recreated.GetWidth(), recreated.GetHeight(), recreated.GetFormat() ], [ 32, 32, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM ]);
  assert.equal(changes, 2, "preparing raises the change event (cpp:505)");
});

test("the sweep frees by TriDevice.resourceSweepStorage, ALL by default", t =>
{
  const { device, at } = setup(t), target = renderTarget();
  const texture = target.GetRenderTarget();
  assert.equal(TriDevice.resourceSweepStorage, TriStorageFlags.TRISTORAGE_ALL);

  // The stub reports managed memory, as Carbon's backends do, so the reset mask leaves it alone.
  TriDevice.resourceSweepStorage = TriStorageFlags.TRISTORAGE_VIDEOMEMORY;
  at(TriDevice.resourceIdleRule + 1);
  device.CollectResources();
  assert.equal(registered(target), false, "the idle target is unregistered either way");
  assert.equal(texture.IsValid(), true, "but the video-memory mask does not free a managed texture");
});

test("a texture resource wrapping a render target keeps the target alive while the resource is renewed", t =>
{
  const { device, at } = setup(t), target = renderTarget();
  const texture = target.GetRenderTarget();
  const resource = new TriTextureRes();
  resource.SetTextureFromRT(target);

  sweepWhile(device, at, 4 * TriDevice.resourceIdleRule, 10, () => resource.KeepAlive());

  assert.equal(texture.IsValid(), true, "renewing the wrapper renewed the target");
  assert.equal(resource.GetTexture(), texture);
});

test("a runtime texture parameter bound to a render target keeps it alive", t =>
{
  const { device, at } = setup(t), target = renderTarget();
  const texture = target.GetRenderTarget();
  const parameter = new Tr2RuntimeTextureParameter();
  parameter.texture = target;

  sweepWhile(device, at, 4 * TriDevice.resourceIdleRule, 10, () => parameter.KeepAlive());

  assert.equal(target._renderTarget, texture);
  assert.equal(texture.IsValid(), true);
});

test("Tr2DepthStencil takes the base, expires idle, and is recreated from its kept parameters", t =>
{
  const { device, at } = setup(t);
  const depth = new Tr2DepthStencil();
  assert.equal(depth.KeepAlive, Tr2DeviceResource.prototype.KeepAlive);
  assert.equal(depth.GetDepthStencil(), null, "nothing to recreate before Create");

  assert.equal(depth.Create(32, 16, DepthStencilFormat.DSFMT_D24S8, 1, 0, 0, Tr2RenderContext_GetMainThreadRenderContext()), true);
  assert.equal(registered(depth), true, "creation is its first use");
  assert.equal(depth.GetFormat(), DepthStencilFormat.DSFMT_D24S8, "m_format is the format asked for (cpp:63)");
  const surface = depth.GetDepthStencil();

  sweepWhile(device, at, 2 * TriDevice.resourceIdleRule, 10, () => depth.GetDepthStencil());
  assert.equal(surface.IsValid(), true, "a surface rendered into each frame survives");

  let changes = 0;
  const listener = { Changed() { changes += 1; } };
  depth.OnTextureChange().RegisterListener(listener, listener.Changed);
  at(3 * TriDevice.resourceIdleRule + 1);
  device.CollectResources();
  assert.equal(surface.IsValid(), false, "an idle surface is released");
  assert.equal(depth.IsValid(), false);
  assert.equal(changes, 1);

  assert.equal(depth.GetTexture(), null, "a read creates nothing");
  assert.equal(depth.GetDepthStencil(), null);
  assert.equal(registered(depth), true, "but use registers it again");
  device._PreparePendingResources();
  const recreated = depth.GetTexture();
  assert.ok(recreated && recreated.IsValid(), "the device tick prepared it");
  assert.deepEqual([ depth.GetWidth(), depth.GetHeight(), depth.GetFormat() ], [ 32, 16, DepthStencilFormat.DSFMT_D24S8 ]);
  assert.equal(changes, 2);

  depth.Destruct();
  assert.equal(recreated.IsValid(), false, "_Destructor releases the surface");
  assert.equal(registered(depth), false);
});
