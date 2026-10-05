// The runtime's Blue clock epoch: Carbon's 100ns ticks counted from
// 2026-01-01T00:00:00Z, so every Be::Time is an exact Number and every process
// shares one zero.
import assert from "node:assert/strict";
import test from "node:test";

import {
  CjsBlueOS,
  IBlueEvents,
  CcpTime
} from "../../npm/dist/global/blue/index.js";


class TestTicker extends IBlueEvents
{
  constructor(onTick) { super(); this.onTick = onTick; }
  OnTick(realTime, simTime, cookie) { return this.onTick(realTime, simTime, cookie); }
}


test("the epoch is 2026-01-01T00:00:00Z", () =>
{
  assert.equal(new Date(CcpTime.BLUE_EPOCH_UNIX_MS).toISOString(), "2026-01-01T00:00:00.000Z");
});


test("blue.os time is ticks since the epoch, an exact Number", () =>
{
  const os = new CjsBlueOS();
  const expected = (Date.now() - CcpTime.BLUE_EPOCH_UNIX_MS) * 10000;
  const actual = os.GetActualTime();
  assert.ok(Number.isSafeInteger(actual));
  assert.ok(Math.abs(actual - expected) < 10000 * 1000, "within a second of the wallclock");
});


test("the pump sets the frame's real and sim time, and OnTick receives them", () =>
{
  const os = new CjsBlueOS();
  const seen = [];
  os.RegisterForTicks(new TestTicker((realTime, simTime) => seen.push([ realTime, simTime ])));
  os.PumpOS();

  assert.equal(seen.length, 1);
  const [ realTime, simTime ] = seen[0];
  assert.equal(os.GetRealTime(), realTime);
  assert.equal(os.GetCurrentFrameTime(), simTime, "Carbon's GetCurrentFrameTime is mSimTime (BlueOS.h:51)");
  assert.equal(simTime, realTime, "sim follows real while the sim clock is locked (BlueOS.cpp:556)");
  assert.equal(os.GetInfo().simTime, simTime);
});


test("runtime-epoch times read as stopwatch time and keep full precision", () =>
{
  const os = new CjsBlueOS();
  const time = os.GetActualTime();
  assert.equal(CcpTime.timeIsUTC(time), false);
  assert.equal(CcpTime.timeAsDouble(time + 1) - CcpTime.timeAsDouble(time) > 0, true, "one tick is still visible");
});


test("TimeToFileTime / TimeFromFileTime convert exactly at the UTC boundary", () =>
{
  // FILETIME of 2026-01-01T00:00:00Z: (11644473600000 + 1767225600000) ms * 10000.
  assert.equal(CcpTime.timeToFileTime(0), 134116992000000000n);
  assert.equal(CcpTime.timeToFileTime(12345), 134116992000012345n);
  assert.equal(CcpTime.timeFromFileTime(134116992000012345n), 12345);
  assert.equal(CcpTime.timeFromFileTime(CcpTime.timeToFileTime(-987654321)), -987654321, "times before 2026 are negative");
});


test("an installed frameClock sets the frame's real and sim time (BlueOS.cpp:512, 552, 1109)", () =>
{
  const os = new CjsBlueOS();
  assert.equal(os.frameClock, null);
  os.frameClock = { Sample: () => [ 4242, 0 ] };
  os.PumpOS();
  assert.equal(os.GetRealTime(), 4242, "real time is the smoothed sample");
  assert.equal(os.GetCurrentFrameTime(), 4242, "sim time follows real time while locked");

  os.frameClock = null;
  const before = os.GetActualTime();
  os.PumpOS();
  assert.ok(os.GetRealTime() >= before, "without a frame clock, the actual time");
});
