import test from "node:test";
import assert from "node:assert/strict";
import { Tr2CameraFollowCurveKey } from "../../npm/dist/trinity/curves/key/Tr2CameraFollowCurveKey.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/core/context/Tr2RenderContext.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";

const context = Tr2RenderContext_GetMainThreadRenderContext();

function close(actual, expected)
{
  assert.equal(actual.length, expected.length);
  for (let i = 0; i < expected.length; i++)
  {
    assert.ok(Math.abs(actual[i] - expected[i]) < 0.0001, `component ${i}: ${actual[i]} != ${expected[i]}`);
  }
}

function camera(aspect = 1, near = 1, inverseView = mat4.create(), fov = Math.PI / 2)
{
  const projection = mat4.create();
  projection[0] = 1 / aspect;
  projection[5] = 1;
  projection[10] = -1;
  projection[14] = -near;
  context.SetProjection(projection, fov);
  context.SetViewTransform(mat4.invert(mat4.create(), inverseView));
}

test("camera key tolerates the initial unconfigured projection", () =>
{
  assert.equal(context.GetProjection(), null);
  const key = new Tr2CameraFollowCurveKey();
  assert.equal(key.Initialize(), true);
  close(key.boxPosition, [0, 0, 0]);
});

test("camera framing transforms bounds, signed offset and coordinate tangents", () =>
{
  // A quarter-turn around Z followed by translation gives (10-y, 20+x, 30+z).
  const inverse = new Float32Array([0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 10, 20, 30, 1]);
  camera(1, 1, inverse);
  const key = new Tr2CameraFollowCurveKey();
  key.angleZero = 0;
  key.objectBounds.set([3, 4, 2]);
  key.offset.set([1, 2, 3]);
  key.leftTangent.set([1, 2, 3]);
  key.rightTangent.set([-1, -2, -3]);
  const along = 10 / (2 - Math.SQRT2);
  const from = along * (Math.SQRT2 - 1);
  const output = new Float32Array(3);
  assert.equal(key.GetValue(output), output);
  close(output, [8, 26 + from, 25 - along]);
  close(key.GetLeftTangent(new Float32Array(3)), [8, 21, 33]);
  close(key.GetRightTangent(new Float32Array(3)), [12, 19, 27]);
  key.angle = Math.PI / 2;
  key.CalculateBoxPosition();
  close(key.boxPosition, [13 + from, 21, 25 - along]);
});

test("camera framing enforces the near-plane distance", () =>
{
  camera();
  const key = new Tr2CameraFollowCurveKey();
  key.angleZero = 0;
  key.objectBounds.set([0, 0, 20]);
  key.CalculateBoxPosition();
  close(key.boxPosition, [1 + 21 * (Math.SQRT2 - 1), 0, -41]);
});

test("disabled keys freeze copied camera state while aspect remains live", () =>
{
  const inverse = mat4.create();
  inverse[12] = 10;
  camera(1, 1, inverse);
  const key = new Tr2CameraFollowCurveKey();
  key.angleZero = 0;
  key.enabled = false;
  key.OnModified("enabled");
  camera(4, 7, mat4.create(), Math.PI / 3);
  key.CalculateBoxPosition();
  const along = 8 / (2 - Math.SQRT2);
  close(key.boxPosition, [14 + along * (Math.SQRT2 - 1), 0, -along]);
  key.enabled = true;
  key.OnModified("enabled");
  key.enabled = false;
  camera();
  key.CalculateBoxPosition();
  assert.equal(key._lastEnabledFrontClip, 7);
  assert.ok(key.boxPosition[2] < -40);
});

test("notifications are field-specific and equal cones retain cached outputs", () =>
{
  camera();
  const key = new Tr2CameraFollowCurveKey();
  key.boxPosition.set([3, 4, 5]);
  key.rotatedLeftTangent.set([6, 7, 8]);
  key.rotatedRightTangent.set([9, 10, 11]);
  key.fovMultiplication = 2;
  key.OnModified("offset");
  assert.equal(key.fovMultiplication, 2);
  key.OnModified("fovMultiplication");
  assert.equal(key.fovMultiplication, 0.999);
  close(key.boxPosition, [3, 4, 5]);
  key.fovMultiplication = 1;
  key.CalculateBoxPosition();
  assert.equal(key._minDistanceAlongViewAngle, 0);
  assert.equal(key._minDistanceFromViewAngle, 0);
  close(key.boxPosition, [3, 4, 5]);
  close(key.rotatedLeftTangent, [6, 7, 8]);
  close(key.rotatedRightTangent, [9, 10, 11]);
});
