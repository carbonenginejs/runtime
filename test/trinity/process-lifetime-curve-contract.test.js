import assert from "node:assert/strict";
import test from "node:test";
import { ProcessLifetime, ProcessLifetimeData, SplineTunnelGroup, DroneAgent, Tr2CurveVector3 } from "../../npm/dist/trinity/index.js";

function fixture()
{
  const behavior = new ProcessLifetime();
  const group = new SplineTunnelGroup();
  group.tunnelGroupType = SplineTunnelGroup.TunnelGroupType.ENTRANCE_TUNNELS;
  const curve = new Tr2CurveVector3();
  curve.Length = () => 2;
  curve.GetValue = (_time, out) => { out.set([1, 2, 3]); return out; };
  group.curveSets.push(curve);
  behavior.splineTunnels.push(group);
  const drone = new DroneAgent();
  const data = new ProcessLifetimeData();
  const pos = new Float32Array(3);
  return { behavior, group, curve, drone, data, pos, run: () => behavior._FindInitialSpawnPoint(drone, data, pos, []) };
}

for (const method of ["Length", "GetValue"])
{
  test(`initial spawn requires curve ${method}`, () =>
  {
    const value = fixture();
    value.curve[method] = undefined;
    assert.throws(value.run, TypeError, "ProcessLifetime.cpp:360-374");
  });
}

test("initial spawn consumes the required returned vector", () =>
{
  const value = fixture();
  value.curve.GetValue = () => undefined;
  assert.throws(value.run, TypeError);
});

test("initial spawn does not replace an invalid length getter result", () =>
{
  const value = fixture();
  value.curve.Length = () => NaN;
  assert.equal(value.run(), true);
  assert.equal(Number.isNaN(value.drone.lifetime), true);
});

test("initial spawn preserves Carbon's zero-length division quirk", () =>
{
  const value = fixture();
  value.curve.Length = () => 0;
  assert.equal(value.run(), true);
  assert.deepEqual(Array.from(value.drone.position), [1, 2, 3]);
  assert.equal(Number.isNaN(value.drone.lifetime), true, "ProcessLifetime.cpp:376 divides zero by zero");
  assert.equal(Number.isNaN(value.data.tunnelPoint), true, "JS stores NaN; native float-to-int conversion is undefined");
});

test("initial spawn keeps native absent-tunnel and empty-curve guards", () =>
{
  const value = fixture();
  value.group.curveSets.length = 0;
  assert.equal(value.run(), false);
  value.behavior.splineTunnels.length = 0;
  assert.equal(value.run(), false);
});
