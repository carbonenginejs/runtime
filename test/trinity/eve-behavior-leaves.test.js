import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import {
  CollisionAvoidance,
  InclusionVolume,
  ProcessPriority,
  Wander,
} from "../../npm/dist/trinity/index.js";


test("behavior leaf priorities retain their shared enum metadata", () =>
{
  assert.deepEqual(ProcessPriority, {
    LEAST_PRIORITY: 0,
    LESS_PRIORITY: 1,
    MORE_PRIORITY: 3,
    MOST_PRIORITY: 4,
    COUNT: 5,
  });

  for (const Type of [CollisionAvoidance, InclusionVolume, Wander])
  {
    const instance = new Type();
    assert.equal(Type.ProcessPriority, ProcessPriority);
    instance.behaviorPriority = ProcessPriority.MORE_PRIORITY;
    assert.equal(instance.GetProcessPriority(), ProcessPriority.MORE_PRIORITY);
    assert.equal(
      CjsSchema.getField(Type, "behaviorPriority")?.enum?.enumType,
      "ProcessPriority"
    );
  }
});


test("CollisionAvoidance applies Carbon's center-weighted exclusion force", () =>
{
  const behavior = new CollisionAvoidance();
  const agent = {
    position: vec3.fromValues(2, 0, 0),
    acceleration: vec3.create(),
  };
  behavior.exclusionVolumes.push({
    GetBoundingSphere: () => ({ center: vec3.create(), radius: 10 }),
    GetIntensity: () => 0.5,
  });

  assert.deepEqual(
    behavior.CalculateBehavior([agent], null, 0, {}, {}, []),
    []
  );
  assert.deepEqual(Array.from(agent.acceleration), [12, 0, 0]);

  behavior.enabled = false;
  vec3.set(agent.acceleration, 1, 2, 3);
  behavior.CalculateBehavior([agent], null, 0, {}, {}, []);
  assert.deepEqual(Array.from(agent.acceleration), [1, 2, 3]);
});


test("InclusionVolume pulls falloff-shell agents toward the volume center", () =>
{
  const behavior = new InclusionVolume();
  const agent = {
    position: vec3.fromValues(2, 0, 0),
    acceleration: vec3.create(),
  };
  let intensity = 0.5;
  behavior.inclusionVolumes.push({
    GetBoundingSphere: () => ({ center: vec3.create(), radius: 10 }),
    GetIntensity: () => intensity,
  });

  behavior.CalculateBehavior(
    [agent],
    null,
    0,
    { collectForces: false, GetBoundingSphereRadius: () => 2 },
    {},
    []
  );
  assert.deepEqual(Array.from(agent.acceleration), [-60, 0, 0]);

  intensity = 1;
  vec3.set(agent.acceleration, 0, 0, 0);
  behavior.CalculateBehavior(
    [agent],
    null,
    0,
    { collectForces: false, GetBoundingSphereRadius: () => 2 },
    {},
    []
  );
  assert.deepEqual(Array.from(agent.acceleration), [0, 0, 0]);
});


test("Wander applies deterministic finite noise and honors its enabled gate", () =>
{
  const behavior = new Wander();
  const agent = {
    id: 7,
    lifetime: 3.25,
    position: vec3.create(),
    acceleration: vec3.create(),
  };
  const group = {
    collectForces: false,
    GetBoundingSphereRadius: () => 2,
  };

  behavior.CalculateBehavior([agent], null, 0, group, {}, []);
  assert.equal(agent.acceleration.every(Number.isFinite), true);
  assert.equal(vec3.squaredLength(agent.acceleration) > 0, true);

  behavior.enabled = false;
  vec3.set(agent.acceleration, 1, 2, 3);
  behavior.CalculateBehavior([agent], null, 0, group, {}, []);
  assert.deepEqual(Array.from(agent.acceleration), [1, 2, 3]);
});


test("volume behaviors publish and delegate their Carbon debug options", () =>
{
  const parentWorldLocation = mat4.fromTranslation(mat4.create(), [3, 4, 5]);

  for (const [behavior, property, option] of [
    [new CollisionAvoidance(), "exclusionVolumes", "ExclusionVolumes"],
    [new InclusionVolume(), "inclusionVolumes", "InclusionVolumes"],
  ])
  {
    const calls = [];
    behavior[property].push({
      RenderDebugInfo: (...args) => calls.push(args),
    });
    assert.deepEqual([...behavior.GetDebugOptions()], [option]);

    const renderer = {
      HasOption: (owner, name) => owner === behavior && name === option,
    };
    behavior.RenderDebugInfo(renderer, [], parentWorldLocation);
    assert.deepEqual(calls, [[renderer, parentWorldLocation]]);

    calls.length = 0;
    behavior.RenderDebugInfo({ HasOption: () => false }, [], parentWorldLocation);
    assert.deepEqual(calls, []);
  }
});
