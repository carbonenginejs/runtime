import assert from "node:assert/strict";
import { test } from "node:test";

import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { quat } from "../../npm/dist/global/math/quat.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import * as core from "../../npm/dist/trinity/core/index.js";
import * as generatedCore from "../../npm/dist/trinity/generated/trinityCore/index.js";
import * as trinity from "../../npm/dist/trinity/index.js";


const EPSILON = 1e-5;

function assertArrayNear(actual, expected, message = "array")
{
  assert.equal(actual.length, expected.length, `${message} length`);
  for (let index = 0; index < expected.length; index++)
  {
    assert.ok(Math.abs(actual[index] - expected[index]) <= EPSILON,
      `${message}[${index}]: expected ${expected[index]}, received ${actual[index]}`);
  }
}

function makeRenderContext(viewPosition = [ 13, -7, 19 ], fieldOfView = 1.07)
{
  const view = mat4.lookAt(mat4.create(), viewPosition, [ 1, 2, 3 ], [ 0, 1, 0 ]);
  const inverseView = mat4.invert(mat4.create(), view);
  return {
    GetFieldOfView: () => fieldOfView,
    GetInverseViewTransform: () => inverseView,
    GetViewPosition: () => viewPosition,
    GetViewTransform: () => view
  };
}

test("Tr2Transform is one maintained nominal base with Carbon defaults and stable setters", () =>
{
  const transform = new core.Tr2Transform();
  assert.equal(trinity.Tr2Transform, core.Tr2Transform);
  assert.equal("Tr2Transform" in generatedCore, false);
  assert.equal(transform.modifier, core.Tr2Transform.Tr2TransformModifier.TR2TM_NONE);
  assert.deepEqual(Array.from(transform.scaling), [ 1, 1, 1 ]);
  assert.deepEqual(Array.from(transform.rotation), [ 0, 0, 0, 1 ]);
  assert.deepEqual(Array.from(transform.translation), [ 0, 0, 0 ]);
  assert.equal(transform.display, true);
  assert.equal(transform.update, true);
  assert.equal(transform.useDistanceBasedScale, false);
  assert.equal(transform.IsVisible(), true);
  assert.throws(() => transform.GetPerObjectData(), /must be implemented/u);

  const scale = new Float32Array([ 2, 3, 4 ]);
  const rotation = new Float32Array([ 0.1, 0.2, 0.3, 0.9 ]);
  const translation = new Float32Array([ 5, 6, 7 ]);
  transform.SetScaling(scale);
  transform.SetRotation(rotation);
  transform.SetTranslation(translation);
  scale.fill(0);
  rotation.fill(0);
  translation.fill(0);
  assert.deepEqual(Array.from(transform.scaling), [ 2, 3, 4 ]);
  assertArrayNear(transform.rotation, [ 0.1, 0.2, 0.3, 0.9 ], "rotation");
  assert.deepEqual(Array.from(transform.translation), [ 5, 6, 7 ]);
});

test("Tr2Transform updates curve sets directly and preserves parent-local history", () =>
{
  const transform = new core.Tr2Transform();
  const renderContext = makeRenderContext();
  const calls = [];
  transform.curveSets.push({
    Update(time, simTime, context)
    {
      calls.push([ time, simTime, context ]);
    }
  });
  transform.Update(3, renderContext);
  assert.deepEqual(calls, [[ 3, undefined, renderContext ]]);
  transform.update = false;
  transform.Update(4, renderContext);
  assert.equal(calls.length, 1);

  transform.update = true;
  transform.scaling.set([ 5, 6, 7 ]);
  transform.translation.set([ 1, 2, 3 ]);
  const parent = mat4.fromRotationTranslationScale(
    mat4.create(),
    quat.setAxisAngle(quat.create(), [ 0, 0, 1 ], Math.PI / 2),
    [ 10, 20, 30 ],
    [ 2, 3, 4 ]
  );
  transform.UpdateViewDependentData(renderContext, parent);
  assertArrayNear(transform.worldTransform, [
    0, 10, 0, 0,
    -18, 0, 0, 0,
    0, 0, 28, 0,
    4, 22, 42, 1
  ], "world");
  assertArrayNear(transform.lastWorldTransform, mat4.create(), "previous world");

  const firstWorld = mat4.clone(transform.worldTransform);
  transform.translation.set([ 2, 4, 6 ]);
  transform.UpdateViewDependentData(renderContext, parent);
  assertArrayNear(transform.lastWorldTransform, firstWorld, "second-frame previous world");
});

test("Tr2Transform distance scaling uses the render context field of view", () =>
{
  const transform = new core.Tr2Transform();
  transform.useDistanceBasedScale = true;
  transform.translation.set([ 0, 0, -10 ]);
  const fieldOfView = Math.PI / 2;
  transform.UpdateViewDependentData(makeRenderContext([ 0, 0, 0 ], fieldOfView));
  const fovHeight = Math.sin(fieldOfView / 2) * 10;
  const expectedScale = transform.distanceBasedScaleArg1
    / Math.pow(fovHeight, transform.distanceBasedScaleArg2)
    * fovHeight;
  assert.ok(Math.abs(transform.worldTransform[0] - expectedScale) <= EPSILON);
  assert.ok(Math.abs(transform.worldTransform[5] - expectedScale) <= EPSILON);
  assert.ok(Math.abs(transform.worldTransform[10] - expectedScale) <= EPSILON);
});

test("every Carbon transform modifier executes with reversed gl-matrix products", () =>
{
  const parent = mat4.fromRotationTranslationScale(
    mat4.create(),
    quat.setAxisAngle(quat.create(), vec3.normalize(vec3.create(), [ 0.3, 1, -0.2 ]), 0.73),
    [ 7, -3, 11 ],
    [ 2, 3, 5 ]
  );
  const rotation = quat.setAxisAngle(
    quat.create(),
    vec3.normalize(vec3.create(), [ -0.4, 0.2, 1 ]),
    0.41
  );
  const context = makeRenderContext();
  const values = Object.values(core.Tr2Transform.Tr2TransformModifier);
  const outputs = new Map();

  for (const modifier of values)
  {
    const transform = new core.Tr2Transform();
    transform.modifier = modifier;
    transform.scaling.set([ 0.75, 1.25, 2.5 ]);
    transform.rotation.set(rotation);
    transform.translation.set([ 1.5, -2.25, 3.75 ]);
    transform.UpdateViewDependentData(context, parent);
    assert.ok(Array.from(transform.worldTransform).every(Number.isFinite), `modifier ${modifier}`);
    outputs.set(modifier, Array.from(transform.worldTransform));
  }

  const modifier = core.Tr2Transform.Tr2TransformModifier;
  assertArrayNear(outputs.get(modifier.TR2TM_FORCE_DWORD), outputs.get(modifier.TR2TM_NONE),
    "unknown modifier falls through to ordinary parent-local composition");
});

test("LOOK_AT_CAMERA preserves Carbon's degenerate zero basis", () =>
{
  const transform = new core.Tr2Transform();
  transform.modifier = core.Tr2Transform.Tr2TransformModifier.TR2TM_LOOK_AT_CAMERA;
  transform.scaling.set([ 2, 3, 4 ]);
  transform.translation.set([ 5, 6, 7 ]);
  transform.UpdateViewDependentData(makeRenderContext([ 5, 6, 7 ]));
  for (const index of [ 0, 1, 2, 4, 5, 6, 8, 9, 10 ])
  {
    assert.equal(Math.abs(transform.worldTransform[index]), 0, `basis ${index}`);
  }
  assert.deepEqual(Array.from(transform.worldTransform.slice(12, 15)), [ 5, 6, 7 ]);
});

test("Tr2Transform camera and mesh contracts fail visibly when malformed", () =>
{
  const transform = new core.Tr2Transform();
  transform.worldTransform[12] = 3;
  transform.worldTransform[13] = 4;
  transform.sortValueMultiplier = 2;
  assert.equal(transform.GetSortValue({ GetViewPosition: () => [ 3, 0, 0 ] }), 8);
  assert.throws(() => transform.GetSortValue(), /GetViewPosition/u);
  transform.mesh = {};
  assert.throws(() => transform.HasTransparentBatches(), /GetAreas/u);
  assert.throws(() => transform.GetBatches({}, 0, null, 0), /GetAreas/u);
});

test("Eve transforms inherit the maintained base and drive particle view state directly", () =>
{
  assert.ok(new trinity.EveTransform() instanceof core.Tr2Transform);
  assert.ok(new trinity.EveRootTransform() instanceof core.Tr2Transform);
  assert.ok(new trinity.EveMissileWarhead() instanceof core.Tr2Transform);

  const transform = new trinity.EveTransform();
  const particles = new trinity.Tr2ParticleSystem();
  particles.aliveCount = 1;
  particles.aabbMin.set([ -1, -2, -3 ]);
  particles.aabbMax.set([ 3, 4, 5 ]);
  transform.particleSystems.push(particles);

  let receivedSphere = null;
  const frustum = {
    IsSphereVisible(sphere)
    {
      receivedSphere = Array.from(sphere);
      return false;
    }
  };
  const renderContext = makeRenderContext();
  transform.scaling.set([ 2, 3, 4 ]);
  transform.translation.set([ 10, 20, 30 ]);
  transform.UpdateViewDependentData({ GetFrustum: () => frustum, renderContext });
  assertArrayNear(receivedSphere, [ 12, 23, 34, 8 ], "particle sorting sphere");
});
