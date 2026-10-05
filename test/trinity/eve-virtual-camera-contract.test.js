import assert from "node:assert/strict";
import test from "node:test";
import {
  EveVirtualCamera, EveVirtualCameraSystem, Tr2CurveScalar,
  EveVirtualCameraBehaviourFloatAdd, EveVirtualCameraBehaviourFloatNoise,
  EveVirtualCameraBehaviourVector3MoveBetween, EveVirtualCameraBehaviourVector3MoveForward,
  EveVirtualCameraBehaviourVector3Orbit, EveVirtualCameraBehaviourVector3Shake
} from "../../npm/dist/trinity/index.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";

const cases = [
  ["FloatAdd", EveVirtualCameraBehaviourFloatAdd, "scaleCurve", 129],
  ["FloatNoise", EveVirtualCameraBehaviourFloatNoise, "magnitudeCurve", 178],
  ["Vector3MoveBetween", EveVirtualCameraBehaviourVector3MoveBetween, "interpolationCurve", 295],
  ["Vector3MoveForward", EveVirtualCameraBehaviourVector3MoveForward, "scaleCurve", 441],
  ["Vector3Orbit", EveVirtualCameraBehaviourVector3Orbit, "orbitCurve", 384],
  ["Vector3Shake", EveVirtualCameraBehaviourVector3Shake, "magnitudeCurve", 520]
];

test("FloatAdd constructs Carbon's named constant scale curve", () =>
{
  const behavior = new EveVirtualCameraBehaviourFloatAdd();
  assert.ok(behavior.scaleCurve instanceof Tr2CurveScalar, "EveVirtualCameraBehaviour.cpp:106-113");
  assert.equal(behavior.scaleCurve.GetName(), "Add - Scale Curve");
  for (const time of [0, 0.5, 1]) assert.equal(behavior.scaleCurve.GetValue(time), 1);
});

/** Calls the donor update shape with a real camera and ordinary anchor data. */
function update(behavior, camera, elapsed = 1)
{
  return behavior.Update(camera, vec3.create(), 0, elapsed, vec3.create(), 2, vec3.fromValues(0, 0, 1));
}

for (const [name, Behavior, field, line] of cases)
{
  test(`${name} requires the camera timeline getter`, () =>
  {
    const behavior = new Behavior();
    behavior[field] = new Tr2CurveScalar();
    const camera = new EveVirtualCamera();
    camera.GetAnimationTimelineLength = undefined;
    assert.throws(() => update(behavior, camera), TypeError, `EveVirtualCameraBehaviour.cpp:${line}`);
  });

  test(`${name} does not replace an invalid curve result with a default`, () =>
  {
    const behavior = new Behavior();
    behavior.value = 2;
    behavior[field] = Object.assign(new Tr2CurveScalar(), { GetValue: () => undefined });
    const camera = new EveVirtualCamera();
    camera.animationTimelineLength = 2;
    const result = update(behavior, camera);
    assert.ok(typeof result === "number" ? Number.isNaN(result) : Array.from(result).some(Number.isNaN),
      `EveVirtualCameraBehaviour.cpp:${line} consumes the curve result directly`);
  });

  test(`${name} SetName requires its owned curve`, () =>
  {
    const behavior = new Behavior();
    behavior[field] = null;
    assert.throws(() => behavior.SetName("Contract"), TypeError,
      "EveVirtualCameraBehaviour.cpp:119-122,164-167,271-274,364-368,425-428,504-507");
  });

  if (name !== "Vector3MoveBetween")
  {
    test(`${name} passes Carbon's zero-duration division to its curve`, () =>
    {
      const behavior = new Behavior();
      let received;
      behavior[field] = Object.assign(new Tr2CurveScalar(), { GetValue(time) { received = time; return 1; } });
      const camera = new EveVirtualCamera();
      camera.animationTimelineLength = 0;
      update(behavior, camera);
      assert.equal(received, Infinity, `EveVirtualCameraBehaviour.cpp:${line} has no zero-duration guard`);
    });
  }
}

test("MoveBetween retains Carbon's raw-end zero-duration branch", () =>
{
  const behavior = new EveVirtualCameraBehaviourVector3MoveBetween();
  behavior.end = vec3.fromValues(1, 2, 3);
  behavior.proportional = true;
  behavior.interpolationCurve = Object.assign(new Tr2CurveScalar(), { GetValue() { assert.fail("curve must not run"); } });
  const camera = new EveVirtualCamera();
  camera.animationTimelineLength = 0;
  assert.deepEqual(Array.from(update(behavior, camera)), [1, 2, 3], "EveVirtualCameraBehaviour.cpp:291-304");
});

test("MoveForward retains Carbon's absent-scale-curve branch", () =>
{
  const behavior = new EveVirtualCameraBehaviourVector3MoveForward();
  behavior.scaleCurve = null;
  behavior.value = 3;
  assert.equal(behavior.GetCurrentValue(null, 1, 2), 6, "EveVirtualCameraBehaviour.cpp:438-447");
});

test("camera selection requires registered and external receiver contracts", () =>
{
  const system = new EveVirtualCameraSystem();
  const camera = new EveVirtualCamera();
  camera.SetName("Target");
  system.AddCamera(camera);
  assert.equal(system.GetCameraByName("Target"), camera);
  camera.GetName = undefined;
  assert.throws(() => system.GetCameraByName("Target"), TypeError, "EveVirtualCameraSystem.cpp:78");
  system.cameras.length = 0;
  system.cameras.push(null);
  assert.throws(() => system.GetCameraByName("Target"), TypeError, "EveVirtualCameraSystem.cpp:78 has no null-entry guard");
  system.cameras.length = 0;
  system.externalCamera = null;
  assert.throws(() => system.GetCameraByName("Target"), TypeError, "EveVirtualCameraSystem.cpp:70 calls external camera directly");
});

test("camera update retains only Carbon's external-camera null guard", () =>
{
  const system = new EveVirtualCameraSystem();
  system.externalCamera = null;
  assert.doesNotThrow(() => system.Update(1), "EveVirtualCameraSystem.cpp:146-149");
  system.cameras.push(null);
  assert.throws(() => system.Update(2), TypeError, "EveVirtualCameraSystem.cpp:144 requires each registered camera");
});
