import test from "node:test";
import assert from "node:assert/strict";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { vec4 } from "../../npm/dist/global/math/vec4.js";
import { EveTriggerVolume } from "../../npm/dist/trinity/eve/EveTriggerVolume.js";
import { EveSphereVolume } from "../../npm/dist/trinity/eve/volume/EveSphereVolume.js";


const assertVecNear = (actual, expected, epsilon = 1e-5) =>
{
  for (let index = 0; index < expected.length; index++)
  {
    assert.ok(Math.abs(actual[index] - expected[index]) <= epsilon,
      `component ${index}: expected ${expected[index]}, received ${actual[index]}`);
  }
};

function sphereVolume(position, radius, innerRadius = radius)
{
  const volume = new EveSphereVolume();
  vec3.copy(volume.position, position);
  volume.radius = radius;
  volume.innerRadius = innerRadius;
  return volume;
}


test("EveTriggerVolume fires edge-triggered callbacks with exclusion subtraction", async () =>
{
  const trigger = new EveTriggerVolume();
  trigger.name = "docking-perimeter";
  trigger.volumes.push(sphereVolume([ 0, 0, 0 ], 10));
  trigger.exclusionVolumes.push(sphereVolume([ 8, 0, 0 ], 3));

  const tracked = vec3.fromValues(100, 0, 0);
  trigger.trackedPositionCurve = {
    Update(_time, out)
    {
      vec3.copy(out, tracked);
    }
  };

  const calls = [];
  trigger.SetCallback((name, entered) => calls.push([ name, entered ]));
  assert.equal(trigger.Initialize(), true);

  // Outside: no transition, intensity 0.
  trigger.UpdateSyncronous({ currentTime: 0 });
  assert.deepEqual(calls, []);
  assert.equal(trigger.intensity, 0);
  assert.equal(trigger.IsInside(), false);

  // Enter: one callback with the trigger name, not one per frame.
  vec3.set(tracked, 0, 0, 0);
  trigger.UpdateSyncronous({ currentTime: 1 });
  trigger.UpdateSyncronous({ currentTime: 2 });
  assert.deepEqual(calls, [ [ "docking-perimeter", true ] ]);
  assert.equal(trigger.intensity, 1);
  assert.equal(trigger.IsInside(), true);

  // The exclusion volume subtracts its intensity: inside its solid core the
  // net intensity floors at 0 and the trigger reports an exit.
  vec3.set(tracked, 8, 0, 0);
  trigger.UpdateSyncronous({ currentTime: 3 });
  assert.deepEqual(calls, [ [ "docking-perimeter", true ], [ "docking-perimeter", false ] ]);
  assert.equal(trigger.intensity, 0);

  // Leaving entirely from an already-outside state fires nothing further.
  vec3.set(tracked, 100, 0, 0);
  trigger.UpdateSyncronous({ currentTime: 4 });
  assert.equal(calls.length, 2);

  // A throwing callback must not break the update loop.
  trigger.SetCallback(() =>
  {
    throw new Error("script error");
  });
  vec3.set(tracked, 0, 0, 0);
  assert.doesNotThrow(() => trigger.UpdateSyncronous({ currentTime: 5 }));
  assert.equal(trigger.GetLastCallbackError()?.message, "script error");
});


test("EveTriggerVolume transforms, merges bounding spheres, and floors pickable bounds", () =>
{
  const trigger = new EveTriggerVolume();
  // Two disjoint unit-20 spheres 40 apart merge into one enclosing sphere.
  trigger.volumes.push(sphereVolume([ -20, 0, 0 ], 10));
  trigger.volumes.push(sphereVolume([ 20, 0, 0 ], 10));
  trigger.translationCurve = {
    Update(_time, out)
    {
      vec3.set(out, 0, 100, 0);
    }
  };
  const halfSqrt = Math.SQRT1_2;
  trigger.rotationCurve = {
    Update(_time, out)
    {
      // 90 degrees about +Z
      out[0] = 0; out[1] = 0; out[2] = halfSqrt; out[3] = halfSqrt;
    }
  };
  assert.equal(trigger.Initialize(), true);

  const sphere = vec4.create();
  assert.equal(trigger.GetBoundingSphere(sphere), true);
  // Merged local sphere: centre [0,0,0], radius 30; rotation then placement.
  assertVecNear(sphere, [ 0, 100, 0, 30 ]);

  const transform = trigger.GetLocalToWorldTransform(mat4.create());
  // Row-vector RotationMatrix * TranslationMatrix: rotate about the origin,
  // THEN translate - the translation is not rotated.
  assertVecNear([ transform[12], transform[13], transform[14] ], [ 0, 100, 0 ]);
  const rotated = vec3.transformMat4(vec3.create(), [ 1, 0, 0 ], transform);
  assertVecNear(rotated, [ 0, 101, 0 ]);

  const rotation = trigger.GetWorldRotation();
  assert.ok(Math.abs(Math.abs(rotation[2] * halfSqrt + rotation[3] * halfSqrt) - 1) < 1e-5);

  const center = trigger.GetModelCenterWorldPosition(vec3.create());
  assertVecNear(center, [ 0, 100, 0 ]);

  // With no volumes the local box falls back to a pickable unit box.
  const empty = new EveTriggerVolume();
  empty.Initialize();
  const min = vec3.create();
  const max = vec3.create();
  assert.equal(empty.GetLocalBoundingBox(min, max), true);
  assertVecNear(min, [ -1, -1, -1 ]);
  assertVecNear(max, [ 1, 1, 1 ]);
  const emptySphere = vec4.create();
  empty.GetBoundingSphere(emptySphere);
  assert.equal(emptySphere[3], 1);
});
