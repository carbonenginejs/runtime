import assert from "node:assert/strict";
import { test } from "node:test";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { quat } from "../../npm/dist/global/math/quat.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import {
  Allign,
  ApproachGroup,
  BackAndForth,
  BehaviorGroup,
  BehaviorGroupBooster,
  DroneAvoidance,
  EveKDdroneManagementTree,
  FollowASpline,
  Formation,
  Inertia,
  SeekTarget,
} from "../../npm/dist/trinity/index.js";

const DRAW_METHODS = [
  "DrawLine", "DrawBox__MinMax", "DrawSphere__CenterRadius", "DrawSphere__TransformRadius",
  "DrawCylinder__TransformCaps", "DrawSphereArrow", "DrawAxis",
];

/**
 * A debug renderer that enables the named options and records every draw as
 * { variant, owner, color, args }.
 */
function recordingRenderer(enabled)
{
  const calls = [];
  const renderer = {
    calls,
    HasOption: (_owner, option) => enabled.includes(option),
  };
  for (const variant of DRAW_METHODS)
  {
    renderer[variant] = (owner, ...args) =>
    {
      const color = args.at(-1);
      calls.push({ variant, owner, color, args: args.map(a => (ArrayBuffer.isView(a) ? Array.from(a) : a)) });
    };
  }
  return renderer;
}

const PARENT = mat4.fromTranslation(mat4.create(), [10, 0, 0]);

test("vision-range behaviors draw one Lerp-tinted sphere per agent", () =>
{
  // Lerp( white, 0xff1111ff, visionRange / divisor ) encoded as ARGB.
  for (const [Type, visionRange, expectedColor] of [
    [Allign, 75, 0xfff3f3ff], // 75 / 1500
    [ApproachGroup, 150, 0xffe7e7ff], // 150 / 1500
    [DroneAvoidance, 5, 0xfffbfbff], // 5 / 300
  ])
  {
    const behavior = new Type();
    behavior.visionRange = visionRange;

    const options = new Set();
    behavior.GetDebugOptions(options);
    assert.deepEqual([...options], ["BehaviorVisionRanges"]);

    const renderer = recordingRenderer(["BehaviorVisionRanges"]);
    behavior.RenderDebugInfo(renderer, [{ position: vec3.fromValues(1, 2, 3) }], PARENT);
    assert.equal(renderer.calls.length, 1);
    const [call] = renderer.calls;
    assert.equal(call.variant, "DrawSphere__TransformRadius");
    assert.equal(call.owner.object, behavior);
    assert.equal(call.color.color, expectedColor);
    assert.deepEqual(call.args[0].slice(12, 15), [11, 2, 3]);
    assert.deepEqual(call.args.slice(1, 4), [visionRange, 6, 0]);

    behavior.visionRange = 0;
    renderer.calls.length = 0;
    behavior.RenderDebugInfo(renderer, [{ position: vec3.create() }], PARENT);
    assert.equal(renderer.calls.length, 0);
  }
});

test("Inertia keeps an empty RenderDebugInfo and IBehavior's empty options", () =>
{
  const behavior = new Inertia();
  const options = new Set();
  behavior.GetDebugOptions(options);
  assert.equal(options.size, 0);

  const renderer = recordingRenderer(["BehaviorVisionRanges"]);
  behavior.RenderDebugInfo(renderer, [{ position: vec3.create() }], PARENT);
  assert.equal(renderer.calls.length, 0);
});

test("Formation draws its centre, heading and grid spheres while forming", () =>
{
  const behavior = new Formation();
  const options = new Set();
  behavior.GetDebugOptions(options);
  assert.deepEqual([...options], ["Formation"]);

  behavior._isFormalizing = true;
  vec3.set(behavior._formationPosition, 1, 0, 0);
  vec3.set(behavior._lastFormationAcceleration, 0, 2, 0);
  behavior._formationGrid.push(vec3.fromValues(0, 0, 5));

  const renderer = recordingRenderer(["Formation"]);
  behavior.RenderDebugInfo(renderer, [], PARENT);
  assert.equal(renderer.calls.length, 3);
  for (const call of renderer.calls)
  {
    assert.equal(call.variant, "DrawSphere__TransformRadius");
    assert.equal(call.owner.object, behavior);
    assert.equal(call.color.color, 0xffff1111);
    assert.deepEqual(call.args.slice(1, 4), [20, 8, 0]);
  }
  assert.deepEqual(renderer.calls[1].args[0].slice(12, 15), [11, 100, 0]);
  assert.deepEqual(renderer.calls[2].args[0].slice(12, 15), [11, 0, 5]);

  behavior._isFormalizing = false;
  renderer.calls.length = 0;
  behavior.RenderDebugInfo(renderer, [], PARENT);
  assert.equal(renderer.calls.length, 0);
});

test("FollowASpline draws its target points and delegates to its tunnel groups", () =>
{
  const behavior = new FollowASpline();
  const options = new Set();
  behavior.GetDebugOptions(options);
  assert.deepEqual([...options], ["SplineTunnels"]);

  const delegated = [];
  behavior.splineTunnels.push({ RenderDebugInfo: (...args) => delegated.push(args) });
  behavior._targetPointVector.push(vec3.fromValues(0, 1, 0));

  const renderer = recordingRenderer(["SplineTunnels"]);
  behavior.RenderDebugInfo(renderer, [], PARENT);
  assert.equal(renderer.calls.length, 1);
  assert.equal(renderer.calls[0].variant, "DrawSphere__TransformRadius");
  assert.equal(renderer.calls[0].owner.object, behavior);
  assert.equal(renderer.calls[0].color.color, 0xff114444);
  assert.deepEqual(renderer.calls[0].args.slice(1, 4), [2, 6, 0]);
  assert.equal(delegated.length, 1);
  assert.equal(delegated[0][0], renderer);
  assert.equal(delegated[0][1], PARENT);
});

test("SeekTarget and BackAndForth draw a sphere arrow per locator, owned by the locator list", () =>
{
  const locators = [{ position: vec3.fromValues(0, 0, 1), direction: quat.create() }];

  const seek = new SeekTarget();
  const seekOptions = new Set();
  seek.GetDebugOptions(seekOptions);
  assert.deepEqual([...seekOptions], ["SeekTarget", "Locators"]);
  seek.locatorSet = { GetLocators: () => locators };

  const seekRenderer = recordingRenderer(["Locators"]);
  seek.RenderDebugInfo(seekRenderer, [], PARENT);
  assert.equal(seekRenderer.calls.length, 1);
  const [seekCall] = seekRenderer.calls;
  assert.equal(seekCall.variant, "DrawSphereArrow");
  assert.equal(seekCall.owner.object, locators);
  assert.equal(seekCall.owner.area, 0);
  assert.equal(seekCall.color.color, 0x990088ff);
  assert.deepEqual(seekCall.args, [[10, 0, 1], [0, 1, 0], 5, 8, 2, seekCall.color]);

  const shuttle = new BackAndForth();
  const shuttleOptions = new Set();
  shuttle.GetDebugOptions(shuttleOptions);
  assert.deepEqual([...shuttleOptions], ["Locators", "Locator Radius"]);
  shuttle.locatorSet.push({ GetLocators: () => locators });

  const shuttleRenderer = recordingRenderer(["Locators", "Locator Radius"]);
  shuttle.RenderDebugInfo(shuttleRenderer, [], PARENT);
  assert.deepEqual(shuttleRenderer.calls.map(c => c.variant), [
    "DrawSphereArrow", "DrawSphere__CenterRadius", "DrawSphere__CenterRadius", "DrawSphere__CenterRadius",
  ]);
  assert.equal(shuttleRenderer.calls[0].owner.object, locators);
  assert.equal(shuttleRenderer.calls[0].args[2], 20);
  assert.equal(shuttleRenderer.calls[1].owner.object, shuttle);
  assert.deepEqual(shuttleRenderer.calls.slice(1).map(c => c.color.color), [0xffff00ff, 0xff0000ff, 0xff86d2fd]);
});

test("EveKDdroneManagementTree draws its outer box and each split plane with an unowned reference", () =>
{
  const tree = new EveKDdroneManagementTree();
  const agents = [0, 1, 2].map(id => ({ id, position: vec3.fromValues(id, id, id) }));
  tree.CreateTree(agents, 1);

  const renderer = recordingRenderer([]);
  tree.RenderDebugInfo(renderer, PARENT);
  assert.deepEqual(renderer.calls.map(c => c.variant), [
    "DrawBox__MinMax", "DrawBox__MinMax", "DrawLine", "DrawLine", "DrawLine", "DrawLine",
  ]);
  for (const call of renderer.calls)
  {
    assert.equal(call.owner.object, null);
  }
  assert.equal(renderer.calls[0].color.color, 0xff555555);
  // The root splits on Z, which Carbon draws in red (0xffff2222).
  assert.deepEqual(renderer.calls.slice(1).map(c => c.color.color), Array(5).fill(0xffff2222));
  assert.equal(tree.debugSquareSize, Math.fround(1.5));
});

test("BehaviorGroup collects its options and draws per-agent bounding spheres", () =>
{
  const group = new BehaviorGroup();
  const options = new Set();
  group.GetDebugOptions(options);
  assert.deepEqual([...options], ["AgentsKDTree", "Bounding Sphere", "DebugBehaviors", "AgentRotation"]);

  group.GetAgents().push({ position: vec3.fromValues(0, 3, 0), rotation: quat.create() });
  const renderer = recordingRenderer(["Bounding Sphere"]);
  group.RenderDebugInfo(renderer, PARENT);
  assert.equal(renderer.calls.length, 1);
  const [call] = renderer.calls;
  assert.equal(call.variant, "DrawSphere__TransformRadius");
  assert.equal(call.owner.object, group);
  assert.equal(call.color.color, 0xffff00ff);
  assert.deepEqual(call.args.slice(1, 4), [group.boundingSphereRadius * group.scale, 8, 0]);
  assert.deepEqual(call.args[0].slice(12, 15), [10, 3, 0]);

  const axisRenderer = recordingRenderer(["AgentRotation"]);
  group.RenderDebugInfo(axisRenderer, PARENT);
  assert.deepEqual(axisRenderer.calls.map(c => c.variant), ["DrawAxis"]);
  assert.equal(axisRenderer.calls[0].owner.object, group);
  assert.equal(axisRenderer.calls[0].args[0][0], 100);

  // "DebugBehaviors" starts force collection; switching it off stops it.
  group.RenderDebugInfo(recordingRenderer(["DebugBehaviors"]), PARENT);
  assert.equal(group.collectForces, true);
  group.RenderDebugInfo(recordingRenderer([]), PARENT);
  assert.equal(group.collectForces, false);
});

test("BehaviorGroupBooster draws its booster cylinder and light sphere for the given owner", () =>
{
  const booster = new BehaviorGroupBooster();
  const owner = { object: "owner", area: 0 };
  const renderer = recordingRenderer([]);

  booster.RenderBoosterDebug(renderer, owner, PARENT);
  booster.RenderLightDebug(renderer, owner, PARENT);
  assert.deepEqual(renderer.calls.map(c => c.variant), ["DrawCylinder__TransformCaps", "DrawSphere__TransformRadius"]);

  const [cylinder, sphere] = renderer.calls;
  assert.equal(cylinder.owner, owner);
  assert.equal(cylinder.color.color, 0x88ffff00);
  assert.equal(cylinder.color.zFailColor, 0x22ffff00);
  assert.deepEqual(cylinder.args.slice(1, 6), [[0, 0, 0], [0, 0, -1], 1, 8, 2]);

  assert.equal(sphere.owner, owner);
  assert.equal(sphere.color.color, 0x80ffffff);
  assert.deepEqual(sphere.args.slice(1, 4), [booster.lightRadius, 10, 1]);
});
