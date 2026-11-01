import assert from "node:assert/strict";
import test from "node:test";
import { CjsSchema } from "../../npm/dist/blue/schema/index.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { quat } from "../../npm/dist/global/math/quat.js";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { Tr2BoneMatrixCurve, Tr2CurveVector3Lerp, Tr2ObjectFollowCurveKey, Tr2ObjectFollowCurveKeyRotationSetting, Tr2ScalarExprKey, TriColorSequencer, TriVectorSequencer } from "../../npm/dist/trinity/index.js";
import { TRIOPERATOR } from "../../npm/dist/global/consts/graphics/index.js";
import { MarkerTag } from "../support/markerTags.js";

/** Child color function returning one fixed color for both time overloads. */
function Child(r, g, b, a)
{
  return {
    GetValueAt(_time, out) { out.set([r, g, b, a]); return out; },
    GetValueAt__Ticks(_time, out) { out.set([r, g, b, a]); return out; }
  };
}

test("TriColorSequencer private GetValueAtAdd/GetValueAtMult keep Carbon's per-overload seeds", () =>
{
  const sequencer = new TriColorSequencer();
  sequencer.functions = [Child(0.5, 0.25, 0.125, 0.5), Child(1, 2, 3, 4)];
  const out = new Float32Array(4);

  // TriSequencer.cpp:392-406: the double overload seeds white, so the sum is offset by one.
  assert.deepEqual([...sequencer._GetValueAtAdd(0, out)], [2.5, 3.25, 4.125, 5.5]);
  // TriSequencer.cpp:349-362: the Be::Time overload seeds zero.
  assert.deepEqual([...sequencer._GetValueAtAdd__Ticks(0, out)], [1.5, 2.25, 3.125, 4.5]);
  assert.deepEqual([...sequencer._GetValueAtMult(0, out)], [0.5, 0.5, 0.375, 2]);
  assert.deepEqual([...sequencer._GetValueAtMult__Ticks(0, out)], [0.5, 0.5, 0.375, 2]);

  // GetValueAt routes on the operator exactly as cpp:322-330 and cpp:364-372.
  sequencer.operator = TRIOPERATOR.TRIOP_MULTIPLY;
  assert.deepEqual([...sequencer.GetValueAt(0, out)], [0.5, 0.5, 0.375, 2]);
  assert.deepEqual([...sequencer.GetValueAt__Ticks(0, out)], [0.5, 0.5, 0.375, 2]);
  sequencer.operator = TRIOPERATOR.TRIOP_ADD;
  assert.deepEqual([...sequencer.GetValueAt(0, out)], [2.5, 3.25, 4.125, 5.5]);
  assert.deepEqual([...sequencer.GetValueAt__Ticks(0, out)], [1.5, 2.25, 3.125, 4.5]);
  assert.equal(typeof TriVectorSequencer, "function");
});

test("Tr2CurveVector3Lerp GetAutoTangent is declared-only in Carbon and throws", () =>
{
  assert.equal(MarkerTag("Tr2CurveVector3Lerp", "_GetAutoTangent"), "notUsed");
  assert.throws(() => new Tr2CurveVector3Lerp()._GetAutoTangent(), /deliberately does not use/);
});

test("Tr2BoneMatrixCurve AddKey_ appends an unsorted key carrying spherical-linear interpolation", () =>
{
  const curve = new Tr2BoneMatrixCurve();
  const first = mat4.fromTranslation(mat4.create(), [1, 2, 3]);
  curve._AddKey_(5, first);
  curve._AddKey_(1, mat4.create());
  assert.deepEqual(curve.keys.map(key => key.time), [5, 1], "appended in call order, no Sort");
  assert.deepEqual([...curve.keys[0].value], [...first]);
  assert.notEqual(curve.keys[0].value, first, "the matrix is copied");
  assert.equal(curve.GetKeyInterpolation(0), 4);
  assert.equal(curve.GetKeyInterpolation(1), 4);
  assert.equal(curve.AddKey(3, first), 1, "AddKey still sorts after appending");
  assert.equal(curve.GetKeyCount(), 3);
});

test("Tr2ObjectFollowCurveKey rotation matrices follow RotationMatrix(Quaternion)", () =>
{
  const key = new Tr2ObjectFollowCurveKey();
  const out = mat4.create();
  assert.deepEqual([...key._GetLocatorRotation(out)], [...mat4.create()], "no locator: identity");
  assert.deepEqual([...key._GetModelRotation(out)], [...mat4.create()], "no object: identity");

  // Matrix_inline.h:365-386, evaluated on a non-normalized direction (GetLocatorRotation normalizes it).
  const direction = quat.fromEuler(quat.create(), 20, 35, 50);
  key._locator = { direction: quat.scale(quat.create(), direction, 2), position: vec3.create() };
  key._GetLocatorRotation(out);
  const [x, y, z, w] = direction;
  const expected = [
    1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0,
    2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0,
    2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0,
    0, 0, 0, 1
  ];
  for (let i = 0; i < 16; i++) assert.ok(Math.abs(out[i] - expected[i]) < 1e-6, `element ${i}`);

  // GetValue applies it through TransformCoord to the offset and both tangents.
  key.object = {};
  key.rotationSetting = Tr2ObjectFollowCurveKeyRotationSetting.LOCATOR_ROTATION;
  key.offset.set([1, 0, 0]);
  key.leftTangent.set([0, 1, 0]);
  const value = key.GetValue(vec3.create());
  const rotatedOffset = vec3.transformQuat(vec3.create(), [1, 0, 0], direction);
  const rotatedTangent = vec3.transformQuat(vec3.create(), [0, 1, 0], direction);
  for (let i = 0; i < 3; i++)
  {
    assert.ok(Math.abs(key.rotatedLeftTangent[i] - rotatedTangent[i]) < 1e-5);
    assert.ok(Math.abs(value[i] - rotatedOffset[i]) < 1e-5, "an object without IWorldPosition adds no world position");
  }
});

test("Tr2ScalarExprKey SetExpression compiles, clears, and keeps the old program on a failed parse", () =>
{
  const key = new Tr2ScalarExprKey();
  assert.equal(key.SetExpression(null, ""), null, "empty expression clears the program");
  const program = key.SetExpression(null, "time + 1");
  assert.equal(program.IsValid(), true);
  assert.deepEqual([...program.GetVariableNames()], ["time"]);
  assert.equal(key.SetExpression(program, "time +* (("), program, "a failed parse hands the passed program back");
  assert.equal(key.SetExpression(null, "time +* (("), null);
  assert.equal(key.Evaluate("time + 1", -1, { time: 2 }), 3);
  assert.equal(key.Evaluate("time +* ((", -1, { time: 2 }), -1);
});
