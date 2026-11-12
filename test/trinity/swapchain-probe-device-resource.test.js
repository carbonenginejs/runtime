import assert from "node:assert/strict";
import test from "node:test";
import { Tr2DeviceResource, TriDevice } from "../../npm/dist/trinity/index.js";
import { Tr2RenderContext_GetMainThreadRenderContext, Tr2SwapChain } from "../../npm/dist/trinity/core/index.js";
import { Tr2ReflectionProbe } from "../../npm/dist/trinity/core/Tr2ReflectionProbe.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { PixelFormat } from "../../npm/dist/global/consts/renderContext/index.js";
import { TriStorageFlags } from "../../npm/dist/global/consts/graphics/index.js";

/** Installs the stub backend on the main-thread context, where Carbon's resources prepare. */
function mainContext(t)
{
  const context = Tr2RenderContext_GetMainThreadRenderContext(), previous = context.GetRenderContextAL();
  const al = new Tr2RenderContextALStub();
  al.CreateDevice({ mode: { width: 64, height: 64 } });
  context.SetRenderContextAL(al);
  t.after(() => context.SetRenderContextAL(previous));
  return context;
}

const registered = resource => TriDevice.GetResourcesRegistered().includes(resource);

test("Tr2SwapChain is infrastructure Tr2DeviceResource, created on the main context (Tr2SwapChain.h:16-17, cpp:13-48)", t =>
{
  mainContext(t);
  const chain = new Tr2SwapChain();
  assert.equal(chain.KeepAlive, Tr2DeviceResource.prototype.KeepAlive);
  assert.equal(registered(chain), false);

  chain.CreateForWindow(1);
  assert.equal(registered(chain), true, "creation is its first use");
  assert.equal(chain._neverPurge, true);

  chain.Destruct();
  assert.equal(registered(chain), false);
});

test("Tr2ReflectionProbe is a scene Tr2DeviceResource whose IsValid prepares (Tr2ReflectionProbe.h:15-17, cpp:63-66)", t =>
{
  mainContext(t);
  const probe = new Tr2ReflectionProbe();
  assert.equal(probe.KeepAlive, Tr2DeviceResource.prototype.KeepAlive);
  assert.equal(registered(probe), false);

  probe.IsValid();
  assert.equal(registered(probe), true, "IsValid is its use");
  assert.notEqual(probe._neverPurge, true, "scene content may expire");

  probe.Destruct();
  assert.equal(registered(probe), false);
});

test("the probe's targets may be swept, and its prepare creates again one that lost its surface (cpp:243-321)", t =>
{
  const context = mainContext(t);
  const probe = new Tr2ReflectionProbe();
  t.after(() => probe.Destruct());
  const format = PixelFormat.PIXEL_FORMAT_R16G16B16A16_FLOAT;

  // The stub has no compute stage, so OnPrepareResources stops before this; DoPrepareResources is its body.
  assert.equal(probe.DoPrepareResources(format, context), true);
  const targets = [ ...probe._renderTargets, probe._preFilterTarget, probe.unfilteredTexture, probe.reflectionTexture ];
  for (const target of targets)
  {
    assert.equal(target.IsValid(), true);
    assert.notEqual(target._neverPurge, true, "the probe does not exclude its targets from the idle sweep");
    assert.equal(registered(target), true, "creating a target is its first use");
  }

  // What the idle sweep does to one target under a live probe.
  const face = probe._renderTargets[2], old = face._renderTarget;
  TriDevice.UnregisterResource(face);
  face.ReleaseResources(TriStorageFlags.TRISTORAGE_ALL);
  assert.equal(old.IsValid(), false);

  assert.equal(probe.DoPrepareResources(format, context), true, "asked again, as IsValid does every frame");
  assert.ok(face._renderTarget && face._renderTarget.IsValid() && face._renderTarget !== old, "created again, blank");
  assert.equal(registered(face), true);
});
