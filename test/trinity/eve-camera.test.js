import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { quat } from "../../npm/dist/global/math/quat.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { EveCamera } from "../../npm/dist/trinity/eve/camera/EveCamera.js";


function closeArray(actual, expected, epsilon = 1e-6)
{
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < expected.length; index++)
  {
    assert.ok(
      Math.abs(actual[index] - expected[index]) <= epsilon,
      `index ${index}: expected ${expected[index]}, received ${actual[index]}`
    );
  }
}


test("EveCamera owns Carbon's scalar Blue distance and maintained tree", () =>
{
  const camera = new EveCamera();
  assert.equal(camera.translationFromParent, 20);
  assert.equal(CjsSchema.getField(EveCamera, "translationFromParent")?.type?.kind, "float32");
  assert.equal(existsSync(new URL("../../src/trinity/eve/camera/EveCamera.js", import.meta.url)), true);
  assert.equal(existsSync(new URL("../../src/trinity/generated/eve/EveCamera.js", import.meta.url)), false);
});


test("EveCamera projection helpers preserve Carbon's right-handed matrix bytes", () =>
{
  const projection = mat4.create();
  EveCamera.CalculateProjectionMatrix(projection, 1, Math.PI / 2, 0, 0, 1, 11);
  closeArray(projection, [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, -1.1, -1,
    0, 0, -1.1, 0
  ]);
  assert.ok(Math.abs(EveCamera.CalculateFovFromProjection(projection) - Math.PI / 2) < 1e-6);

  const shifted = EveCamera.AddCenterOffset(projection, 0.25, -0.5, 2, 22);
  assert.ok(Math.abs(shifted[8] - 0.25) < 1e-6);
  assert.ok(Math.abs(shifted[9] + 0.5) < 1e-6);
  assert.ok(Math.abs(shifted[10] + 1.1) < 1e-6);
  assert.equal(shifted[11], -1);
});


test("EveCamera update reproduces Carbon orbit, view-basis slots, and listeners", () =>
{
  const camera = new EveCamera();
  const parentPosition = vec3.fromValues(3, 4, 5);
  camera.parent = {
    GetValueAt(_time, out)
    {
      return vec3.copy(out, parentPosition);
    }
  };
  camera.frontClip = 1;
  camera.translationFromParent = 10;
  camera.SetOrbit(0.4, -0.2);

  const placements = [];
  camera.audio2Listener = {
    UpdatePlacement(front, up, position)
    {
      placements.push([
        Array.from(front),
        Array.from(up),
        Array.from(position)
      ]);
    }
  };

  assert.equal(camera.Update(0, 1.5, 0), true);
  const rotation = quat.fromYawPitchRoll(quat.create(), 0.4, -0.2, 0);
  const expectedPosition = vec3.transformQuat(vec3.create(), [0, 0, 10], rotation);
  vec3.add(expectedPosition, expectedPosition, parentPosition);
  const direction = vec3.normalize(vec3.create(), vec3.subtract(vec3.create(), parentPosition, expectedPosition));
  const expectedInterest = vec3.scaleAndAdd(vec3.create(), expectedPosition, direction, 100);
  const expectedUp = vec3.transformQuat(vec3.create(), [0, 1, 0], rotation);
  vec3.normalize(expectedUp, expectedUp);
  const expectedView = mat4.lookAt(mat4.create(), expectedPosition, expectedInterest, expectedUp);

  closeArray(camera.pos, expectedPosition, 1e-5);
  closeArray(camera.intr, expectedInterest, 1e-5);
  closeArray(camera.viewMatrix.transform, expectedView, 1e-5);
  closeArray(camera.viewVec, [expectedView[2], expectedView[6], expectedView[10]]);
  closeArray(camera.upVec, [expectedView[1], expectedView[5], expectedView[9]]);
  closeArray(camera.rightVec, [expectedView[0], expectedView[4], expectedView[8]]);
  assert.equal(placements.length, 1);
  closeArray(placements[0][2], expectedPosition, 1e-5);
  assert.equal(camera.projectionMatrix.transform[11], -1);
});


test("EveCamera composes a nonidentity rotation of interest in Carbon's row-vector order", () =>
{
  const camera = new EveCamera();
  camera.frontClip = 1;
  camera.translationFromParent = 10;
  camera.SetOrbit(0.4, -0.2);
  camera.SetRotationOnOrbit(0.25, -0.1);
  camera.Update(0, 1, 0);

  const orbit = quat.fromYawPitchRoll(quat.create(), 0.4, -0.2, 0);
  const position = vec3.transformQuat(vec3.create(), [0, 0, 10], orbit);
  const direction = vec3.normalize(vec3.create(), vec3.negate(vec3.create(), position));
  const interest = vec3.scaleAndAdd(vec3.create(), position, direction, 100);
  const up = vec3.normalize(vec3.create(), vec3.transformQuat(vec3.create(), [0, 1, 0], orbit));
  const view = mat4.lookAt(mat4.create(), position, interest, up);
  const interestRotation = quat.invert(
    quat.create(),
    quat.fromYawPitchRoll(quat.create(), 0.25, -0.1, 0)
  );
  const rotationMatrix = mat4.fromQuat(mat4.create(), interestRotation);
  const expected = mat4.multiply(mat4.create(), rotationMatrix, view);

  closeArray(camera.viewMatrix.transform, expected, 1e-5);
});


test("EveCamera derives notified orbit rotation and edge-triggers invalid-state errors", () =>
{
  const camera = new EveCamera();
  const authored = quat.fromYawPitchRoll(quat.create(), 0.7, -0.35, 0);
  quat.copy(camera.rotationAroundParent, authored);
  assert.equal(camera.UpdateValues({ skipEvents: true }), true);
  camera.frontClip = 1;
  camera.translationFromParent = 5;
  camera.Update(0, 1, 0);
  closeArray(camera.rotationAroundParent, authored, 1e-5);

  let errors = 0;
  camera.errorHandler = { HandleEvent: () => errors++ };
  camera.translationFromParent = Number.NaN;
  assert.equal(camera.Update(1, 1, 1), false);
  camera.translationFromParent = Number.NaN;
  assert.equal(camera.Update(2, 1, 2), false);
  assert.equal(errors, 1);
  camera.translationFromParent = 5;
  assert.equal(camera.Update(3, 1, 3), true);
  camera.translationFromParent = Number.NaN;
  assert.equal(camera.Update(4, 1, 4), false);
  assert.equal(errors, 2);
});


test("EveCamera notifications preserve active spring targets", () =>
{
  const camera = new EveCamera();
  camera.frontClip = 1;
  camera.translationFromParent = 5;
  camera.SetOrbit(0, 0);
  camera.OrbitParent(1, 0);

  quat.copy(camera.rotationAroundParent, quat.fromYawPitchRoll(quat.create(), 0.2, 0, 0));
  camera.UpdateValues({ skipEvents: true });
  camera.Update(1, 1, 1);

  assert.ok(Math.abs(camera.yaw - 0.06875) < 1e-5);
});
