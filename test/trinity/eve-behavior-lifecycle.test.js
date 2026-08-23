import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { quat } from "../../npm/dist/global/math/quat.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import {
  BELIST_INSERTED,
  BELIST_LOADFINISHED,
  BELIST_REMOVED,
  ProcessLifetime,
  ProcessLifetimeData,
  ProcessPriority,
  SplineTunnel,
  SplineTunnelGroup,
  SplineTunnelPoint,
  TunnelGroupType
} from "../../npm/dist/trinity/index.js";


function createLinearCurve(length = 3)
{
  return {
    Length: () => length,
    GetValue(time, out)
    {
      return vec3.set(out, time, time * 2, 0);
    }
  };
}


test("lifecycle and tunnel records own Carbon defaults, enums, and maintained paths", () =>
{
  const lifetime = new ProcessLifetime();
  const tunnel = new SplineTunnel();
  const point = new SplineTunnelPoint();
  assert.equal(ProcessLifetime.ProcessPriority, ProcessPriority);
  assert.equal(SplineTunnelGroup.TunnelGroupType, TunnelGroupType);
  assert.equal(CjsSchema.getField(ProcessLifetime, "behaviorPriority")?.enum?.enumType, "ProcessPriority");
  assert.equal(CjsSchema.getField(SplineTunnelGroup, "tunnelGroupType")?.enum?.enumType, "TunnelGroupType");
  assert.equal(CjsSchema.getField(SplineTunnelGroup, "tunnels"), null);
  assert.equal(tunnel.tunnelID, -1);
  assert.equal(tunnel.cylWidth, 20);
  assert.equal(tunnel.pullSize, 50);
  assert.equal(tunnel.pointOfNoReturnSize, 20);
  assert.equal(tunnel.accelerationMultiplier, 1);
  assert.equal(point.accelerationMultiplier, 1);

  const first = lifetime.InitializeScratch();
  const second = lifetime.InitializeScratch();
  assert.ok(first instanceof ProcessLifetimeData);
  assert.ok(second instanceof ProcessLifetimeData);
  assert.notEqual(first, second);
  assert.equal(first.assignedLifeTimeTunnel, 0);

  for (const path of [
    "../../src/trinity/eve/child/behaviors/lifecycle/ProcessLifetime.js",
    "../../src/trinity/eve/child/behaviors/lifecycle/ProcessLifetimeData.js",
    "../../src/trinity/eve/child/behaviors/tunnels/SplineTunnelGroup.js",
    "../../src/trinity/eve/child/behaviors/tunnels/SplineTunnel.js",
    "../../src/trinity/eve/child/behaviors/tunnels/SplineTunnelPoint.js",
    "../../src/trinity/eve/child/behaviors/enums.js"
  ])
  {
    assert.equal(existsSync(new URL(path, import.meta.url)), true, path);
  }
  for (const path of [
    "../../src/trinity/generated/eve/child/behaviors/ProcessLifetime.js",
    "../../src/trinity/generated/eve/child/behaviors/SplineTunnelGroup.js",
    "../../src/trinity/generated/eve/child/behaviors/enums.js"
  ])
  {
    assert.equal(existsSync(new URL(path, import.meta.url)), false, path);
  }
});


test("SplineTunnelGroup samples exact points and survives a failed rebuild", () =>
{
  const group = new SplineTunnelGroup();
  group.breakPoints = 2;
  group.tunnelWidth = 7;
  group.entrancePullSize = 8;
  group.entrySize = 9;
  group.tunnelGroupType = TunnelGroupType.ENTRANCE_TUNNELS;
  group.curveSets.push(createLinearCurve());
  assert.equal(group.Initialize(), true);
  assert.equal(group.tunnels.length, 1);
  const tunnel = group.tunnels[0];
  assert.deepEqual(tunnel.splinePoints.map(point => Array.from(point.pos)), [
    [0, 0, 0],
    [1, 2, 0],
    [2, 4, 0],
    [3, 6, 0]
  ]);
  assert.deepEqual(tunnel.splinePoints.map(point => Array.from(point.rot)), [
    [1, 2, 0],
    [1, 2, 0],
    [1, 2, 0],
    [1, 2, 0]
  ]);
  assert.equal(tunnel.cylWidth, 7);
  assert.equal(tunnel.pullSize, 8);
  assert.equal(tunnel.pointOfNoReturnSize, 9);
  assert.equal(tunnel.tunnelGroupType, TunnelGroupType.ENTRANCE_TUNNELS);

  group.curveSets = [{ Length: () => 1, GetValue: () => { throw new Error("decode"); } }];
  assert.throws(() => group.createSplineTunnels(), /decode/);
  group.curveSets = [createLinearCurve(1)];
  assert.equal(group.createSplineTunnels().length, 1);
});


test("tunnel list callbacks rebuild only for Carbon list events", () =>
{
  const group = new SplineTunnelGroup();
  const curve = createLinearCurve(1);
  group.curveSets.push(curve);
  let changes = 0;
  group.SetSystemTunnelFunctionReferenceAndColor(() => changes++, 0xff123456);
  const initial = changes;
  group.OnListModified(BELIST_INSERTED, 0, 0, curve, group.curveSets);
  group.OnListModified(BELIST_REMOVED, 0, 0, curve, group.curveSets);
  group.OnListModified(BELIST_LOADFINISHED, 0, 0, curve, group.curveSets);
  assert.equal(changes, initial + 3);
  group.OnListModified(0x05, 0, 0, curve, group.curveSets);
  group.OnListModified(BELIST_INSERTED, 0, 0, curve, []);
  assert.equal(changes, initial + 3);
});


test("ProcessLifetime wires groups and repairs stable tunnel IDs and empty boundaries", () =>
{
  const systemTunnelA = new SplineTunnel();
  const systemTunnelB = new SplineTunnel();
  const localTunnel = new SplineTunnel();
  const tunnelGroup = {
    callback: null,
    GetTunnels: () => [localTunnel],
    SetSystemTunnelFunctionReferenceAndColor(callback, color)
    {
      this.callback = callback;
      this.color = color;
    }
  };
  const lifetime = new ProcessLifetime();
  lifetime.firstSpawnAtRandomPlaces = false;
  lifetime.splineTunnels.push(tunnelGroup);
  lifetime.Initialize();
  assert.equal(typeof tunnelGroup.callback, "function");
  assert.equal(tunnelGroup.color, 0xff5555aa);

  lifetime.CalculateBehavior(
    [],
    [],
    0,
    {},
    { GetTunnels: () => [systemTunnelA, systemTunnelB] },
    []
  );
  assert.equal(systemTunnelA.tunnelID, 0);
  assert.equal(systemTunnelB.tunnelID, 1);
  assert.equal(localTunnel.tunnelID, 2);

  const emptyLifetime = new ProcessLifetime();
  emptyLifetime.firstSpawnAtRandomPlaces = false;
  emptyLifetime.Initialize();
  const scratch = emptyLifetime.InitializeScratch();
  const agent = {
    lifetime: 1,
    position: vec3.create(),
    rotation: quat.create(),
    acceleration: vec3.create()
  };
  emptyLifetime.CalculateBehavior(
    [agent],
    [scratch],
    0,
    { collectForces: false, GetBoundingSphereRadius: () => 1 },
    { GetTunnels: () => [], GetSplineTunnels: () => [] },
    []
  );
  assert.equal(scratch.hasUsedEntryTunnel, true);
});


test("ProcessLifetime list callbacks detach removals and detect direct pushes", () =>
{
  const lifetime = new ProcessLifetime();
  const calls = [];
  const first = {
    GetTunnels: () => [],
    SetSystemTunnelFunctionReferenceAndColor(callback, color) { calls.push([this, callback, color]); }
  };
  lifetime.splineTunnels.push(first);
  lifetime.Initialize();
  assert.equal(typeof calls.at(-1)[1], "function");

  lifetime.splineTunnels.splice(0, 1);
  lifetime.OnListModified(BELIST_REMOVED, 0, 0, first, lifetime.splineTunnels);
  assert.equal(calls.findLast(([group]) => group === first)[1], null);

  const second = {
    GetTunnels: () => [],
    SetSystemTunnelFunctionReferenceAndColor(callback, color) { calls.push([this, callback, color]); }
  };
  lifetime.splineTunnels.push(second);
  lifetime.CalculateBehavior(
    [],
    [],
    0,
    {},
    { GetTunnels: () => [] },
    []
  );
  assert.equal(typeof calls.findLast(([group]) => group === second)[1], "function");
});


test("spline tunnel debug output preserves Carbon transform order and option gating", () =>
{
  const group = new SplineTunnelGroup();
  group.breakPoints = 0;
  group.curveSets.push(createLinearCurve(1));
  group.Initialize();
  const parent = mat4.fromRotationTranslationScale(
    mat4.create(),
    quat.fromYawPitchRoll(quat.create(), Math.PI / 2, 0, 0),
    [10, 20, 30],
    [2, 3, 4]
  );
  const spheres = [];
  const cylinders = [];
  const renderer = {
    DrawSphere(_owner, transform, radius, segments, style, color)
    {
      spheres.push([Array.from(transform), radius, segments, style, color]);
    },
    DrawCylinder(_owner, start, end, radius, segments, style, color)
    {
      cylinders.push([Array.from(start), Array.from(end), radius, segments, style, color]);
    }
  };
  group.RenderDebugInfo(renderer, parent);
  assert.equal(spheres.length, 5);
  assert.equal(cylinders.length, 2);
  assert.deepEqual(spheres[0].slice(1), [50, 6, 0, 0xff551111]);
  assert.deepEqual(cylinders[0].slice(2), [15, 8, 0, 0xffffff00]);
  const expectedStart = vec3.transformMat4(vec3.create(), [0, 0, 0], parent);
  const expectedEnd = vec3.transformMat4(vec3.create(), [1, 2, 0], parent);
  assert.deepEqual(cylinders[0][0], Array.from(expectedStart));
  assert.deepEqual(cylinders[0][1], Array.from(expectedEnd));

  const lifetime = new ProcessLifetime();
  lifetime.splineTunnels.push(group);
  let delegated = 0;
  group.RenderDebugInfo = () => delegated++;
  lifetime.RenderDebugInfo({ HasOption: () => false }, [], parent);
  lifetime.RenderDebugInfo({ HasOption: () => true }, [], parent);
  assert.equal(delegated, 1);
  assert.ok(lifetime.GetDebugOptions().has("SplineTunnels"));
});
