import { addChild, removeChild } from "../../npm/dist/global/blue/children.js";
import assert from "node:assert/strict";
import test from "node:test";

import { blue } from "../../npm/dist/global/blue/index.js";
import {
  gTriDev,
  Tr2RenderContext_GetMainThreadRenderContext,
  Tr2Renderer,
  TriDevice,
  Tr2GpuParticleSystem, EveSpaceScene, EveUpdateContext, EveShip2, Tr2Effect
} from "../../npm/dist/trinity/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";


/**
 * A device on the ambient context with a live stub backend, torn down after.
 *
 * The ambient context and `blue.os` are both process-wide, so anything that
 * creates a device has to put them back or the next test inherits a registered
 * device and a frame counter that already moved.
 */
function withDevice(body)
{
  const previousDevice = gTriDev.device;
  const renderContext = Tr2RenderContext_GetMainThreadRenderContext();
  renderContext.SetRenderContextAL(new Tr2RenderContextALStub());

  const device = new TriDevice();
  gTriDev.device = device;

  try
  {
    body(device, renderContext);
  }
  finally
  {
    blue.os.UnregisterForTicks(device, TriDevice.TICK_COOKIE);
    gTriDev.device = previousDevice;
  }
}


test("CreateSimpleDevice brings a device up and starts it ticking", () =>
{
  withDevice((device) =>
  {
    assert.equal(device.DeviceExists(), false, "no backend device before creation");

    assert.equal(device.CreateSimpleDevice({ canvas: true }, 800, 600), true);

    assert.equal(device.DeviceExists(), true);
    assert.equal(device.width, 800);
    assert.equal(device.height, 600);

    // The last line of Carbon's CreateSimpleDevice, and the reason the path
    // matters: a device that was never created is never ticked.
    assert.equal(blue.os.IsRegisteredForTicks(device), true);
  });
});


test("creation fills the viewport and the present parameters from its arguments", () =>
{
  withDevice((device) =>
  {
    device.CreateSimpleDevice({ canvas: true }, 640, 480);

    assert.equal(device.viewport.width, 640);
    assert.equal(device.viewport.height, 480);
    assert.equal(device.viewport.minZ, 0);
    assert.equal(device.viewport.maxZ, 1);

    const pp = device.GetPresentParameters();
    assert.equal(pp.mode.width, 640);
    assert.equal(pp.mode.height, 480);
    assert.equal(pp.windowed, true);
    assert.equal(pp.software, false);

    // No backend here reports a variable refresh rate, and the device records
    // that rather than refusing to be created over it.
    assert.equal(pp.variableRefreshRateSupported, false);
  });
});


test("a fullscreen device is refused, naming what is missing", () =>
{
  withDevice((device) =>
  {
    assert.throws(
      () => device.CreateSimpleDevice({ canvas: true }, 800, 600, TriDevice.DeviceScreenType.FULLSCREEN),
      /display-mode enumeration/u
    );
    assert.equal(blue.os.IsRegisteredForTicks(device), false, "and nothing was registered");
  });
});


test("SetPresentation adopts parameters and registers; null tears down", () =>
{
  withDevice((device) =>
  {
    const accepted = device.SetPresentation(0, {
      mode: { width: 1024, height: 768 },
      outputWindow: { canvas: true }
    });

    assert.equal(accepted, true);
    assert.equal(device.width, 1024);
    assert.equal(device.height, 768);
    assert.equal(device.adapter, 0);
    assert.equal(blue.os.IsRegisteredForTicks(device), true);

    // Carbon's null branch: the App saying it is done.
    assert.equal(device.SetPresentation(0, null), true);
    assert.equal(blue.os.IsRegisteredForTicks(device), false);
    assert.equal(device.width, 0);
    assert.equal(device.height, 0);
    assert.equal(device.GetOutputWindow(), null);
  });
});


test("the pump runs the whole frame: update, present, then the frame body", () =>
{
  withDevice((device) =>
  {
    device.CreateSimpleDevice({ canvas: true }, 320, 240);

    const order = [];
    device.SetRenderJobs({
      RunUpdate: () => order.push("RunUpdate"),
      Run: () => order.push("Run")
    });
    device.AddPostUpdateCallback(() => order.push("postUpdate"));

    const before = Tr2Renderer.GetCurrentFrameCounter();
    blue.os.PumpOS();

    assert.equal(Tr2Renderer.GetCurrentFrameCounter(), before + 1, "one frame per pump");

    // TriDeviceStub.cpp:16-28. The update pass and the post-update callbacks
    // run first, then the PREVIOUS frame is presented, then Render draws the
    // new one - which is why Run comes last.
    assert.deepEqual(order, [ "RunUpdate", "postUpdate", "Run" ]);
  });
});


test("a registered device stops being ticked once it is invalidated", () =>
{
  withDevice((device) =>
  {
    device.CreateSimpleDevice({ canvas: true }, 320, 240);

    const before = Tr2Renderer.GetCurrentFrameCounter();
    blue.os.PumpOS();
    assert.equal(Tr2Renderer.GetCurrentFrameCounter(), before + 1);

    device.InvalidateAndUnregisterForTicks();

    blue.os.PumpOS();
    assert.equal(Tr2Renderer.GetCurrentFrameCounter(), before + 1, "the clock stopped with it");
    assert.equal(device.DeviceExists(), false, "and the render context went with it");
  });
});


test("the device resource registry is prepared and released with the device", () =>
{
  const events = [];
  const resource = {
    PrepareResources: () => events.push("prepare"),
    ReleaseResources: (storage) => events.push([ "release", storage ])
  };

  TriDevice.RegisterResource(resource);
  assert.ok(TriDevice.GetResourcesRegistered().includes(resource));

  try
  {
    withDevice((device) =>
    {
      device.CreateSimpleDevice({ canvas: true }, 64, 64);
      assert.ok(events.includes("prepare"), "creation prepares registered resources");

      events.length = 0;
      device.InvalidateAndUnregisterForTicks();

      // TRISTORAGE_ALL, because the device itself is going away.
      assert.deepEqual(events, [ [ "release", 3 ] ]);
    });
  }
  finally
  {
    TriDevice.UnregisterResource(resource);
  }

  assert.equal(TriDevice.GetResourcesRegistered().includes(resource), false);
});


test("OnSimClockRebase carries the device's simulation clock with the move", () =>
{
  const device = new TriDevice();
  device.OnTick(10000000, 10000000);
  assert.equal(device.simTime, 10000000);

  // The server moved simulation time forward by one second.
  device.OnSimClockRebase(10000000, 20000000);
  assert.equal(device.simTime, 20000000);
});


test("Update advances playing curve sets and drops the finished ones", () =>
{
  const device = new TriDevice();
  const updated = [];

  const playing = {
    Update: (realTime, simTime) => updated.push([ "playing", realTime, simTime ]),
    IsPlaying: () => true
  };
  const finished = {
    Update: () => updated.push([ "finished" ]),
    IsPlaying: () => false
  };

  device.curveSets = [ playing, finished ];
  device.Update(5, 7);

  // Both are updated, because Carbon updates before it prunes.
  assert.deepEqual(updated, [ [ "playing", 5, 7 ], [ "finished" ] ]);
  assert.deepEqual(device.curveSets, [ playing ], "and only the playing one survives");
});

test("device registry snapshots cannot mutate membership and retain their original contents", () =>
{
  const resource = { PrepareResources() {}, ReleaseResources() {} };
  TriDevice.RegisterResource(resource);
  try
  {
    const before = TriDevice.GetResourcesRegistered();
    assert.ok(Array.isArray(before), "approved snapshot contract for native TriDevice.cpp:1061-1065");
    assert.ok(before.includes(resource));
    const independent = TriDevice.GetResourcesRegistered();
    independent.length = 0;
    assert.ok(TriDevice.GetResourcesRegistered().includes(resource), "editing a snapshot cannot unregister resources");
    TriDevice.UnregisterResource(resource);
    assert.ok(before.includes(resource), "existing snapshot is not live");
    assert.equal(TriDevice.GetResourcesRegistered().includes(resource), false);
  }
  finally { TriDevice.UnregisterResource(resource); }
});

test("particle final-owner Destroy detaches nine effect stores once and unregisters immediately", () =>
{
  const system = new Tr2GpuParticleSystem();
  const other = new Tr2GpuParticleSystem();
  const events = [];
  const slots = [ "emit", "update", "render", "clear", "setDrawParameters", "setSortParameters", "sort", "sortStep", "sortInner" ];
  for (const slot of slots)
  {
    system[slot] = {
      StartUpdate() { events.push([ slot, "start" ]); },
      SetVariableStore(store) { events.push([ slot, "store", store ]); },
      EndUpdate() { events.push([ slot, "end" ]); }
    };
  }
  try
  {
    assert.ok(TriDevice.GetResourcesRegistered().includes(system));
    system.ReleaseResources(3);
    assert.ok(TriDevice.GetResourcesRegistered().includes(system), "cpp:180-198 device reset is not object destruction");
    assert.notEqual(system._variableStore, null);
    assert.equal(system.PrepareResources(), true, "an active resource remains preparable after reset");
    system.Destroy();
    assert.equal(TriDevice.GetResourcesRegistered().includes(system), false, "Tr2DeviceResource.cpp:15-18 base destructor unregisters");
    assert.ok(TriDevice.GetResourcesRegistered().includes(other), "unrelated resources stay registered");
    assert.equal(system._variableStore, null);
    assert.deepEqual(events, slots.flatMap(slot => [ [ slot, "start" ], [ slot, "store", null ], [ slot, "end" ] ]), "Tr2GpuParticleSystem.cpp:106-119 preserves every effect update boundary");
    system.Destroy();
    assert.equal(events.length, 27, "explicit teardown is idempotent");
  }
  finally
  {
    TriDevice.UnregisterResource(system);
    TriDevice.UnregisterResource(other);
  }
});


test("scene and context setters preserve a shared system until its final caller tears down", () =>
{
  const scene = new EveSpaceScene(), context = new EveUpdateContext();
  const shared = new Tr2GpuParticleSystem(), replacement = new Tr2GpuParticleSystem();
  const slots = ["emit", "update", "render", "clear", "setDrawParameters", "setSortParameters", "sort", "sortStep", "sortInner"];
  for (const slot of slots) { shared[slot] = new Tr2Effect(); shared.SetVariableStore(shared[slot]); }
  const store = shared._variableStore;
  const effects = slots.map(slot => shared[slot]);
  try
  {
    scene.SetGpuParticleSystem(shared); context.SetGpuParticleSystem(shared);
    scene.SetGpuParticleSystem(replacement);
    assert.ok(context.GetGpuParticleSystem() === shared, "EveUpdateContext.h:74 retains shared Tr2GpuParticleSystemPtr meaning");
    assert.ok(TriDevice.GetResourcesRegistered().includes(shared));assert.ok(shared._variableStore === store);
    for (const slot of slots) assert.ok(shared[slot].variableStore === store, "other owner's effects remain connected");
    scene.SetGpuParticleSystem(shared);context.SetGpuParticleSystem(replacement);
    assert.ok(scene.GetGpuParticleSystem() === shared, "EveSpaceScene.h:526 forwards the same shared assignment");
    assert.ok(TriDevice.GetResourcesRegistered().includes(shared));assert.ok(shared._variableStore === store);
    const oldHull = new EveShip2(), nextHull = new EveShip2();
    addChild(scene, "objects", oldHull, { listNotify: scene });addChild(scene, "objects", nextHull, { listNotify: scene });removeChild(scene, "objects", oldHull, { listNotify: scene });
    assert.ok(scene.GetGpuParticleSystem() === shared, "ordinary hull swap leaves scene-owned particles alive");
    assert.ok(TriDevice.GetResourcesRegistered().includes(shared));assert.ok(shared._variableStore === store);
    // This caller owns the only remaining scene reference. Mirror the existing
    // demo.dispose boundary after its rendering loop has been stopped.
    const finalSystem = scene.GetGpuParticleSystem();scene.SetGpuParticleSystem(null);
    assert.ok(TriDevice.GetResourcesRegistered().includes(finalSystem), "even final setter is assignment only");
    finalSystem.Destroy();
    assert.equal(scene.GetGpuParticleSystem(), null);assert.equal(TriDevice.GetResourcesRegistered().includes(shared), false);
    assert.equal(shared._variableStore, null);for (const slot of slots) assert.equal(shared[slot].variableStore, null);
    assert.ok(context.GetGpuParticleSystem() === replacement && TriDevice.GetResourcesRegistered().includes(replacement), "other system remains owned and registered");
    assert.ok(slots.every((slot, i) => shared[slot] === effects[i]), "final owner detaches effect stores without destroying shared effect objects");
    finalSystem.Destroy();assert.equal(TriDevice.GetResourcesRegistered().includes(shared), false);
  }
  finally {scene.SetGpuParticleSystem(null);context.SetGpuParticleSystem(null);shared.Destroy();replacement.Destroy();}
});
