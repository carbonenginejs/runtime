import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { quat } from "../../npm/dist/global/math/quat.js";
import { BlueList } from "../../npm/dist/global/blue/BlueList.js";
import { CjsBlackPropertyReaders } from "../../npm/dist/resource/formats/black/core/CjsBlackPropertyReaders.js";
import * as trinity from "../../npm/dist/trinity/index.js";
import { CjsBlueReader } from "../../npm/dist/resource/format/CjsBlueReader.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { BLUELISTEVENT } from "../../npm/dist/global/consts/blue.js";
import {
  BehaviorGroup,
  DroneAgent,
  EveChildBehaviorSystem,
  EveChildInstanceContainer,
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
  assert.equal(CjsSchema.getField(ProcessLifetime, "behaviorPriority")?.enum?.enumType, "trinity.IBehavior.ProcessPriority");
  assert.equal(CjsSchema.getField(SplineTunnelGroup, "tunnelGroupType")?.enum?.enumType, "trinity.SplineTunnelGroup.TunnelGroupType");
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
  group.OnListModified(BLUELISTEVENT.BELIST_INSERTED, 0, 0, curve, group.curveSets);
  group.OnListModified(BLUELISTEVENT.BELIST_REMOVED, 0, 0, curve, group.curveSets);
  group.OnListModified(BLUELISTEVENT.BELIST_LOADFINISHED, 0, 0, curve, group.curveSets);
  assert.equal(changes, initial + 3);
  group.OnListModified(0x05, 0, 0, curve, group.curveSets);
  group.OnListModified(BLUELISTEVENT.BELIST_INSERTED, 0, 0, curve, []);
  assert.equal(changes, initial + 3);
});


/** A real spline tunnel group with one curve, so it builds one tunnel. */
function TunnelGroup()
{
  const group = new SplineTunnelGroup();
  group.breakPoints = 0;
  group.curveSets.push(createLinearCurve(1));
  group.Initialize();
  return group;
}

/** A real behavior system whose own tunnel groups give it these system tunnels. */
function SystemWithTunnels(...groups)
{
  const system = new EveChildBehaviorSystem();
  system.splineTunnels.push(...groups);
  system.UpdateTunnelRegistry();
  return system;
}

test("ProcessLifetime wires groups and repairs stable tunnel IDs and empty boundaries", () =>
{
  const tunnelGroup = TunnelGroup();
  const lifetime = new ProcessLifetime();
  lifetime.firstSpawnAtRandomPlaces = false;
  lifetime.splineTunnels.push(tunnelGroup);
  lifetime.Initialize();
  // Wiring the group rebuilds its tunnels (SetSystemTunnelFunctionReferenceAndColor), so take the tunnel after it.
  const [ localTunnel ] = tunnelGroup.GetTunnels();
  assert.equal(typeof tunnelGroup._changeSystemTunnelRegistry, "function");
  assert.equal(tunnelGroup._debugColor, 0xff5555aa);

  const system = SystemWithTunnels(TunnelGroup(), TunnelGroup());
  const [ systemTunnelA, systemTunnelB ] = system.GetTunnels();
  lifetime.CalculateBehavior([], [], 0, new BehaviorGroup(), system, []);
  assert.equal(systemTunnelA.tunnelID, 0);
  assert.equal(systemTunnelB.tunnelID, 1);
  assert.equal(localTunnel.tunnelID, 2);

  const emptyLifetime = new ProcessLifetime();
  emptyLifetime.firstSpawnAtRandomPlaces = false;
  emptyLifetime.Initialize();
  const scratch = emptyLifetime.InitializeScratch();
  const agent = new DroneAgent();
  agent.lifetime = 1;
  emptyLifetime.CalculateBehavior([ agent ], [ scratch ], 0, new BehaviorGroup(), new EveChildBehaviorSystem(), []);
  assert.equal(scratch.hasUsedEntryTunnel, true);
});


test("ProcessLifetime list callbacks re-wire removals (Carbon quirk) and detect direct pushes", () =>
{
  const lifetime = new ProcessLifetime();
  const first = TunnelGroup();
  lifetime.splineTunnels.push(first);
  lifetime.Initialize();
  assert.equal(typeof first._changeSystemTunnelRegistry, "function");

  const wired = first._changeSystemTunnelRegistry;
  lifetime.splineTunnels.splice(0, 1);
  lifetime.OnListModified(BLUELISTEVENT.BELIST_REMOVED, 0, 0, first, lifetime.splineTunnels);
  // Carbon quirk (ProcessLifetime.cpp:53-58): the removed group is handed the callback again.
  assert.equal(typeof first._changeSystemTunnelRegistry, "function");
  assert.notEqual(first._changeSystemTunnelRegistry, wired, "re-wired on removal, not left as it was");
  lifetime._shouldReassignTunnelIDs = false;
  first._changeSystemTunnelRegistry();
  assert.equal(lifetime._shouldReassignTunnelIDs, true, "and calling it still rebuilds the removing behavior's registry");

  const second = TunnelGroup();
  lifetime.splineTunnels.push(second);
  lifetime.CalculateBehavior([], [], 0, new BehaviorGroup(), new EveChildBehaviorSystem(), []);
  assert.equal(typeof second._changeSystemTunnelRegistry, "function", "a group pushed without notify is wired on the next update");
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


test("BehaviorGroup hydrates notified behavior lists and regenerates authored agents", () =>
{
  const group = CjsSchema.from("BehaviorGroup", {
    count: 3, behaviors: [{ _type: "ProcessLifetime" }]
  });
  group.behaviors = new BlueList(ProcessLifetime);
  group.behaviors.SetNotify(group);
  CjsBlackPropertyReaders.readNativeList({ ReadU32: () => 1, context: { ReadObject: () => new ProcessLifetime() } }, group.behaviors);
  assert.equal(group.GetSize(), 3);
  assert.equal(group._scratchData[0].length, 3);
  const previous = group.GetAgents()[0];
  group.OnListModified(BLUELISTEVENT.BELIST_LOADFINISHED, 0, 0, null, group.behaviors);
  assert.equal(group.GetSize(), 3);
  assert.notEqual(group.GetAgents()[0], previous);
  assert.equal(group._scratchData[0].length, 3);
});

test("BehaviorGroup list notifications maintain scratch slots and preserve Carbon reset routing", () =>
{
  const group = new BehaviorGroup();
  const first = new ProcessLifetime(), second = new ProcessLifetime();
  group.behaviors = [first];
  group.count = 2;
  group.InitializeGeometryResource();
  group.behaviors.push(second);
  group.OnListModified(BLUELISTEVENT.BELIST_INSERTED, 1, 0, second, group.behaviors);
  assert.equal(group._scratchData.length, 2);
  assert.ok(group._scratchData.every(records => records.length === 2));
  group.behaviors.splice(0, 1);
  group.OnListModified(BLUELISTEVENT.BELIST_REMOVED, 0, 0, first, group.behaviors);
  assert.equal(group._scratchData.length, 1);
  assert.equal(group.GetSize(), 2);

  let resets = 0;
  group.InitializeGeometryResource = () => { resets++; };
  const a = [], b = [];
  group._scratchData = [a, b];
  group.OnListModified(BLUELISTEVENT.BELIST_SWAPPED, 0, 1, null, group.behaviors);
  assert.equal(group._scratchData[0], b);
  group.OnListModified(BLUELISTEVENT.BELIST_INSERTED | BLUELISTEVENT.BELIST_LOADING, 0, 0, null, group.behaviors);
  assert.equal(group._scratchData.length, 2);
  group.OnListModified(BLUELISTEVENT.BELIST_UNLOADSTART, 0, 0, null, []);
  assert.equal(group._scratchData.length, 2);
  group.OnListModified(BLUELISTEVENT.BELIST_UNLOADSTART, 0, 0, null, group.behaviors);
  assert.equal(group._scratchData.length, 0);
  assert.equal(resets, 4, "Carbon always regenerates, even for loading flags and other lists");
});


test("behavior system load notifications defer wiring and instance modifiers invalidate instances", t =>
{
  const system = new EveChildBehaviorSystem();
  t.after(() => system.Destroy());
  system._behaviorGroupLoaded = system._behaviorGroupLoadedForTunnel = true;
  system.OnListModified(BLUELISTEVENT.BELIST_LOADFINISHED, 0, 0, null, system.behaviorGroups);
  system.OnListModified(BLUELISTEVENT.BELIST_LOADFINISHED, 0, 0, null, system.splineTunnels);
  assert.equal(system._behaviorGroupLoaded, false);
  assert.equal(system._behaviorGroupLoadedForTunnel, false);
  const group = new BehaviorGroup();
  group.count = 2;
  system.behaviorGroups.push(group);
  system.OnListModified(BLUELISTEVENT.BELIST_INSERTED, 0, 0, group, system.behaviorGroups);
  assert.equal(group.GetSize(), 2);
  assert.equal(system.instanceCount, 2);
  const instance = new EveChildInstanceContainer();
  instance.reset = false;
  instance.OnListModified(BLUELISTEVENT.BELIST_LOADFINISHED, 0, 0, null, instance.transforms);
  assert.equal(instance.reset, false);
  instance.OnListModified(BLUELISTEVENT.BELIST_LOADFINISHED, 0, 0, null, instance.transformModifiers);
  assert.equal(instance.reset, true);
});


test("BehaviorGroup binary-reader population mutes inserts until all behavior scratch slots exist", () =>
{
  const reader = new CjsBlueReader({ classes: { BehaviorGroup } });
  const group = reader.CreateRuntimeTarget("BehaviorGroup");
  group.count = 2;
  group.InitializeGeometryResource();
  const first = new ProcessLifetime(), second = new ProcessLifetime();
  const list = group.behaviors, events = [];
  const notify = group.OnListModified.bind(group);
  group.OnListModified = (...args) => { events.push(args[0]); return notify(...args); };
  reader.ApplyRuntimeValues(group, { behaviors: [first, second] }, "BehaviorGroup");
  assert.equal(group.behaviors, list);
  assert.deepEqual(Array.from(group.behaviors), [first, second]);
  assert.deepEqual(events, [BLUELISTEVENT.BELIST_LOADFINISHED]);
  assert.equal(group.GetSize(), 2);
  assert.equal(group._scratchData.length, 2);
  assert.ok(group._scratchData.every(records => records.length === 2));
});



test("BehaviorGroup accepts every Carbon-mapped IBehavior during bulk loading", () =>
{
  const names = ["Allign", "ApproachGroup", "BackAndForth", "CollisionAvoidance", "DroneAvoidance",
    "FollowASpline", "Formation", "InclusionVolume", "Inertia", "PlayFX", "ProcessLifetime", "SeekTarget", "SpawnDrones", "Wander"];
  const group = new BehaviorGroup(), list = group.behaviors;
  const behaviors = names.map(name => new trinity[name]());
  const reader = new CjsBlueReader({ classes: { BehaviorGroup } });
  reader.ApplyRuntimeValues(group, { behaviors }, "BehaviorGroup");
  assert.equal(group.behaviors, list);
  assert.deepEqual(Array.from(list), behaviors, "native interface admission must not silently discard a steering behavior");
});


test("invWorldTransform holds Carbon's plain Inverse(world), untransposed, in VS and PS (cpp:604, :608)", () =>
{
  const system = new EveChildBehaviorSystem();
  quat.setAxisAngle(system.rotation, [ 0, 0, 1 ], Math.PI / 3);
  vec3.set(system.translation, 4, 5, 6);
  system.UpdateAsyncronous(new trinity.EveUpdateContext(), { localToWorldTransform: mat4.create() });

  const expected = mat4.invert(mat4.create(), system.worldTransform);
  const { vs, ps } = system.GetPerObjectData();
  assert.deepEqual(Array.from(vs.Get("invWorldTransform")), Array.from(new Float32Array(expected)));
  assert.deepEqual(Array.from(ps.Get("invWorldTransform")), Array.from(new Float32Array(expected)));
  assert.notDeepEqual(Array.from(vs.Get("invWorldTransform")), Array.from(new Float32Array(mat4.transpose(mat4.create(), expected))), "a rotation tells the two layouts apart");
});
