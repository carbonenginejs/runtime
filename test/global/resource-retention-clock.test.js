import assert from "node:assert/strict";
import test from "node:test";
import { blue, BlueOS, BlueResMan, IBlueEvents } from "../../npm/dist/blue/index.js";
import { TriDevice, Tr2DeviceResource, Tr2Renderer } from "../../npm/dist/trinity/index.js";

/** Isolated real pump, with only the host clock controlled by the test. */
function clock(t)
{
  let now = 1000;
  const oldActiveTime = BlueOS.activeTime;
  BlueOS.activeTime = 0;
  t.after(() => { BlueOS.activeTime = oldActiveTime; });
  t.mock.method(BlueOS, "monotonic", () => now);
  const os = new BlueOS(), previous = blue.os;
  blue.os = os;
  t.after(() => { blue.os = previous; });
  return { os, advance: ms => { now += ms; }, frame: ms => { now += ms; os.PumpOS(); } };
}

test("retention excludes stopped frames and clamps the first resumed delta", t =>
{
  const { os, advance, frame } = clock(t);
  advance(60000); os.PumpOS();
  assert.equal(BlueOS.activeTime, 0, "startup loading is not disuse");
  frame(16);
  assert.equal(BlueOS.activeTime, 160000);
  advance(60000);
  assert.equal(BlueOS.activeTime, 160000, "no frames means no aging");
  os.PumpOS();
  assert.equal(BlueOS.activeTime, 1160000, "resumed delta is capped at 100 ms");
  frame(0);
  assert.equal(BlueOS.activeTime, 1160000);
  frame(-100);
  assert.equal(BlueOS.activeTime, 1160000, "backwards host clocks cannot reduce age");
  os.frameClock = { Sample: () => [1e15] };
  frame(10);
  assert.equal(BlueOS.activeTime, 1260000, "simulation rebasing cannot change retention");
});

test("manager and device retention share active time, survive suspension, and still expire idle resources", t =>
{
  const { os, advance, frame } = clock(t);
  const manager = new BlueResMan();
  const previous = blue.resMan;
  blue.resMan = manager;
  t.after(() => { blue.resMan = previous; });
  manager.SetAutoPurgePolicy({ intervalMilliseconds: 0, maxIdleMilliseconds: 30000 });
  const oldResources = TriDevice._resourcesRegistered, oldGenerations = TriDevice._registeredGenerations;
  TriDevice._resourcesRegistered = []; TriDevice._registeredGenerations = [];
  t.after(() => { TriDevice._resourcesRegistered = oldResources; TriDevice._registeredGenerations = oldGenerations; });
  t.mock.method(Tr2Renderer, "IsResourceCreationAllowed", () => true);
  const device = new TriDevice();
  const previousDeviceTime = TriDevice.activeTime;
  t.after(() => { TriDevice.activeTime = previousDeviceTime; });
  t.mock.method(device, "Update", () => {});
  t.mock.method(device, "HandleRenderTick", () => {});
  os.RegisterForTicks(manager);
  os.RegisterForTicks(device);
  const gpu = Object.create(Tr2DeviceResource.prototype);
  let releases = 0;
  gpu._OnPrepareResources = () => true;
  gpu.ReleaseResources = () => { releases++; };
  os.PumpOS();
  manager.motherLode.Insert("res:/idle", {});
  manager.motherLode.Insert("res:/used", {});
  gpu.KeepAlive(); device._PreparePendingResources();
  assert.equal(gpu.IsGood(), true);
  advance(35000);
  manager.PumpAutoPurge(); device.CollectResources();
  assert.equal(manager.motherLode.HasKey("res:/idle"), true);
  assert.equal(releases, 0);
  os.PumpOS(); manager.PumpAutoPurge(); device.CollectResources();
  assert.equal(manager.motherLode.HasKey("res:/idle"), true, "resume must not purge");
  assert.equal(releases, 0);
  assert.equal(manager.motherLode.GetActivityTime() * 10000, BlueOS.activeTime);
  for (let i = 0; i < 311; i++)
  {
    frame(100);
    manager.motherLode.KeepAlive("res:/used");
    manager.PumpAutoPurge(); device.CollectResources();
  }
  assert.equal(manager.motherLode.HasKey("res:/idle"), false, "active disuse still expires");
  assert.equal(manager.motherLode.HasKey("res:/used"), true, "renewed resources stay alive");
  assert.equal(releases, 1);
  assert.equal(gpu.IsGood(), false);
  device._PreparePendingResources();
  assert.equal(gpu.IsGood(), true, "legitimate expiry remains recoverable");
});

test("active time measures seconds rather than frame count", t =>
{
  const { os, frame } = clock(t);
  os.PumpOS();
  for (let i = 0; i < 100; i++) frame(10);
  assert.equal(BlueOS.activeTime, 10000000);
  for (let i = 0; i < 50; i++) frame(20);
  assert.equal(BlueOS.activeTime, 20000000);
});

/** Records the tick contract without changing the existing first three arguments. */
class TickRecorder extends IBlueEvents
{
  values = null;
  OnTick(realTime, simTime, cookie, activeTime)
  {
    this.values = { realTime, simTime, cookie, activeTime };
  }
}

test("optional active time preserves old arguments and survives replacing/restoring OS", t =>
{
  const { os, advance, frame } = clock(t);
  const recorder = new TickRecorder(), token = Symbol("registration");
  const manager = new BlueResMan();
  const previous = blue.resMan;
  blue.resMan = manager;
  t.after(() => { blue.resMan = previous; });
  os.frameClock = { Sample: () => [123456789] };
  os.RegisterForTicks(recorder, token);
  os.RegisterForTicks(manager);
  os.PumpOS(); frame(20);
  assert.deepEqual(recorder.values, { realTime: 123456789, simTime: 123456789, cookie: token, activeTime: 200000 });
  assert.equal(manager.activityTime, 20);
  manager.motherLode.Insert("res:/retained", {});
  const replacement = new BlueOS();
  blue.os = replacement;
  replacement.RegisterForTicks(manager);
  advance(60000); replacement.PumpOS();
  assert.equal(manager.activityTime, 20, "new OS does not reset retained-resource epoch");
  advance(20); replacement.PumpOS();
  assert.equal(manager.activityTime, 40);
  blue.os = os;
  os.PumpOS();
  assert.equal(manager.activityTime, 140, "restoring the old OS only adds a capped resumed delta");
  manager.PumpAutoPurge({ time: manager.activityTime });
  assert.equal(manager.motherLode.HasKey("res:/retained"), true);
  advance(35000);
  manager.OnTick(0, 0, token);
  assert.equal(manager.activityTime, 140, "legacy three-argument ticks do not age resources");
});


test("a newly constructed manager stamps pre-tick resources in the existing active-time domain", t =>
{
  const { os, frame } = clock(t);
  os.PumpOS();
  for (let i = 0; i < 400; i++) frame(100);
  const manager = new BlueResMan();
  manager.motherLode.Insert("res:/new-manager", {});
  manager.OnTick(0, 0, null, BlueOS.activeTime);
  assert.equal(manager.motherLode.HasKey("res:/new-manager"), true);
  assert.equal(manager.motherLode.GetActivityTime(), 40000);
});
