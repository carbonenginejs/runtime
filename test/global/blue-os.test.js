import assert from "node:assert/strict";
import test from "node:test";

// Everything comes from the built package, and deliberately from ONE copy of
// it: `blue` is a holder, so a test reaching it through two module instances
// would register a device on one holder and pump the other.
import { BeInfo, blue, CjsBlueOS, IBlueEvents, IBlueOS, ISimTimeRebaseNotify } from "../../npm/dist/global/blue/index.js";
import { gTriDev, Tr2Renderer, TriDevice } from "../../npm/dist/trinity/index.js";


// A registrant has to BE an IBlueEvents, not merely own an OnTick - Carbon's
// RegisterForTicks takes `IBlueEvents*` and the type system refuses anything
// else, so the test builds real ones rather than duck-typed stand-ins.
class TestTicker extends IBlueEvents
{
  constructor(onTick) { super(); this.onTick = onTick; }
  OnTick(realTime, simTime, cookie) { return this.onTick(realTime, simTime, cookie); }
}


test("blue.os starts filled and answers its clock before anything composes it", () =>
{
  // The same argument as CjsBluePaths: an unconfigured clock can answer
  // truthfully, where an unconfigured resource manager cannot.
  assert.ok(blue.os instanceof CjsBlueOS);

  const first = blue.os.GetActualTime();
  assert.ok(first > 0, "Blue UTC is a positive tick count");

  // 2020-01-01 and 2100-01-01 in FILETIME ticks: a sanity range that catches a
  // missing epoch offset or a seconds/ticks mix-up, both of which would land
  // orders of magnitude outside it.
  assert.ok(first > 132223104000000000, "after 2020");
  assert.ok(first < 157754496000000000, "before 2100");
});


test("the frame clock is cached and moves only when the pump runs", () =>
{
  const os = new CjsBlueOS();
  const frame = os.GetCurrentFrameTime();

  // Busy-wait rather than sleep: the point is that real time passes while the
  // FRAME time does not.
  const until = CjsBlueOS.Monotonic() + 2;
  while (CjsBlueOS.Monotonic() < until) { /* spin */ }

  assert.ok(os.GetActualTime() > frame, "the wallclock moved");
  assert.equal(os.GetCurrentFrameTime(), frame, "the frame clock did not");

  os.PumpOS();
  assert.ok(os.GetCurrentFrameTime() > frame, "the pump moved it");
});


test("the pump drives a registrant and stops when it unregisters", () =>
{
  const os = new CjsBlueOS();
  const seen = [];
  const ticker = new TestTicker((realTime, simTime, cookie) => seen.push([ realTime, simTime, cookie ]));

  os.RegisterForTicks(ticker, "Trinity");
  assert.equal(os.IsRegisteredForTicks(ticker), true);

  os.PumpOS();
  assert.equal(seen.length, 1);
  assert.equal(seen[0][2], "Trinity", "the cookie comes back");
  assert.equal(seen[0][0], seen[0][1], "simulation time equals real time with no load manager");

  // Registration is set membership, as Carbon's is - not a count.
  os.RegisterForTicks(ticker, "Trinity");
  os.PumpOS();
  assert.equal(seen.length, 2, "registering twice does not tick twice");

  os.UnregisterForTicks(ticker, "Trinity");
  os.PumpOS();
  assert.equal(seen.length, 2, "and nothing after unregistering");
});


test("the cookie is part of the registration, as it is in Carbon's signature", () =>
{
  const os = new CjsBlueOS();
  let ticks = 0;
  const ticker = new TestTicker(() => ticks++);

  os.RegisterForTicks(ticker, "Trinity");
  os.UnregisterForTicks(ticker, "Something else");

  os.PumpOS();
  assert.equal(ticks, 1, "unregistering with the wrong cookie removes nothing");
});


test("a registrant that throws does not rob the others of their tick", () =>
{
  const os = new CjsBlueOS();
  let reached = false;

  os.RegisterForTicks(new TestTicker(() => { throw new Error("first"); }), null);
  os.RegisterForTicks(new TestTicker(() => { reached = true; }), null);

  assert.throws(() => os.PumpOS(), /first/u, "the first failure is rethrown");
  assert.equal(reached, true, "and the second registrant still ticked");
});


test("a registrant may unregister from inside its own tick", () =>
{
  const os = new CjsBlueOS();
  let ticks = 0;
  const ticker = new TestTicker(() =>
  {
    ticks++;
    os.UnregisterForTicks(ticker, null);
  });

  os.RegisterForTicks(ticker, null);
  os.PumpOS();
  os.PumpOS();

  assert.equal(ticks, 1, "the list is iterated over a copy");
});


test("registering something without an OnTick is refused at the door", () =>
{
  const os = new CjsBlueOS();
  assert.throws(() => os.RegisterForTicks({}), /IBlueEvents/u);

  // The point of the identity check: owning the method is not being the
  // interface, which is exactly what Carbon's signature enforces.
  assert.throws(() => os.RegisterForTicks({ OnTick() {} }), /IBlueEvents/u);
  assert.throws(() => os.RegisterForSimTimeRebase({}), /ISimTimeRebaseNotify/u);
});


test("the half that is not ported refuses rather than answering wrongly", () =>
{
  const os = new CjsBlueOS();

  // Inherited from IBlueOS, where compose.abstract installed the refusal.
  assert.throws(() => os.SetError(-1), /IBlueOS\.SetError/u);
  assert.throws(() => os.Startup(0), /IBlueOS\.Startup/u);
  assert.throws(() => os.HasStartupArg("x"), /IBlueOS\.HasStartupArg/u);

  assert.ok(os instanceof IBlueOS, "a single displaced interface is ordinary extends");
});


test("GetInfo hands back a snapshot with the clocks and the pump count filled", () =>
{
  const os = new CjsBlueOS();
  os.PumpOS();
  os.PumpOS();

  const info = os.GetInfo();
  assert.ok(info instanceof BeInfo);
  assert.equal(info.pumpTicksTotal, 2);
  assert.ok(info.realTime > 0);
  assert.equal(info.simTime, info.realTime);

  // A snapshot, not Carbon's live pointer: this is the divergence recorded on
  // GetInfo, and a consumer holding the record would never see it move.
  const held = os.GetInfo();
  os.PumpOS();
  assert.equal(held.pumpTicksTotal, 2, "the held record did not follow the pump");
});


test("the pump drives the device tick, which is what advances the animation clock", () =>
{
  // This is the whole point of the port: Carbon's TriDevice hands ITSELF to
  // BeOS->RegisterForTicks( this, TRINITY ) (TriDevice.cpp:310), so the pump
  // is what moves the clock the render path reads.
  const device = new TriDevice();
  const previousDevice = gTriDev.device;
  gTriDev.device = device;

  try
  {
    blue.os.RegisterForTicks(device, TriDevice.TICK_COOKIE);

    assert.equal(Tr2Renderer.GetCurrentFrameCounter(), 0);
    assert.equal(Tr2Renderer.GetAnimationTime(), 0);

    blue.os.PumpOS();
    assert.equal(Tr2Renderer.GetCurrentFrameCounter(), 1, "one frame per pump");

    blue.os.PumpOS();
    assert.equal(Tr2Renderer.GetCurrentFrameCounter(), 2);

    device.InvalidateAndUnregisterForTicks();
    blue.os.PumpOS();
    assert.equal(Tr2Renderer.GetCurrentFrameCounter(), 2, "and none after unregistering");
  }
  finally
  {
    blue.os.UnregisterForTicks(device, TriDevice.TICK_COOKIE);
    gTriDev.device = previousDevice;
  }
});


test("OnTick takes Be::Time, not seconds, and clamps the animation delta at one second", () =>
{
  const device = new TriDevice();

  // 100ns ticks: half a second, then another half.
  device.OnTick(5000000, 5000000);
  assert.equal(device.GetAnimationTime(), 0.5, "five million ticks is half a second");

  device.OnTick(10000000, 10000000);
  assert.equal(device.GetAnimationTime(), 1);

  // A stall. Carbon clamps the SECONDS delta at one (TriDevice.cpp:817-822) so
  // a hitch does not jump every animation forward.
  device.OnTick(1000000000, 1000000000);
  assert.equal(device.GetAnimationTime(), 2, "a ninety-second gap advances one second");

  // Time going backwards advances nothing rather than rewinding.
  device.OnTick(0, 0);
  assert.equal(device.GetAnimationTime(), 2);

  assert.equal(device.GetCurrentFrameCounter(), 4, "every tick is still a frame");
});
