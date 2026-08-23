import test from "node:test";
import { TriExtrapolation } from "@carbonenginejs/runtime-utils/graphics";
import { CjsGrannyCurves, Tr2BoneMatrixCurve, Tr2CameraFollowCurveKey, Tr2CurveColor, Tr2CurveColorMixer, Tr2CurveCombiner, Tr2CurveConstant, Tr2CurveEulerRotation, Tr2CurveEulerRotationExpression, Tr2CurveExtrapolation, Tr2CurveInterpolation, Tr2CurveQuaternion, Tr2CurveQuaternionKey, Tr2CurveRandomAxisRotation, Tr2CurveScalar, Tr2CurveScalarExpression, Tr2CurveScalarKey, Tr2CurveSetRange, Tr2CurveVector2, Tr2CurveVector3, Tr2CurveVector3Expression, Tr2CurveVector3Lerp, Tr2CurveVector3LerpKeyInterpolation, Tr2DistanceTracker, Tr2FollowCurve, Tr2FollowCurveKeyInterpolation, Tr2GrannyEventTrack, Tr2GrannyTrack, Tr2GrannyTransformTrack, Tr2GrannyVectorTrack, Tr2MatrixKey, Tr2ObjectFollowCurveKey, Tr2ObjectFollowCurveKeyRotationSetting, Tr2QuaternionLerpCurve, Tr2RotationAdapter, Tr2ScalarExprKey, Tr2ScalarExprKeyCurve, Tr2ScalarFader, Tr2TranslationAdapter, TriColorSequencer, TriCurveSet, TriEventCurve, TriPerlinCurve, TriVectorSequencer } from "../npm/dist/index.js";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { num } from "@carbonenginejs/runtime-utils/num";
import { vec2 } from "@carbonenginejs/runtime-utils/vec2";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";


function assert(condition, message = "assertion failed")
{
  if (!condition)
  {
    throw new Error(message);
  }
}
function assertEquals(actual, expected, message)
{
  if (actual !== expected)
  {
    throw new Error(message || `expected ${String(expected)}, got ${String(actual)}`);
  }
}
function assertAlmostEquals(actual, expected, epsilon = 1e-6)
{
  if (Math.abs(actual - expected) > epsilon)
  {
    throw new Error(`expected ${expected}, got ${actual}`);
  }
}
function assertVector(actual, expected, epsilon = 1e-6)
{
  assertEquals(actual.length, expected.length);
  for (let index = 0; index < expected.length; index++)
  {
    assertAlmostEquals(actual[index], expected[index], epsilon);
  }
}
test("TriVectorSequencer ports Carbon combination and derivative behavior", () =>
{
  const makeFunction = (value, dot, doubleDot) => ({
    GetValueAt: (_time, out) => vec3.copy(out, value),
    GetValueDotAt: (_time, out) => vec3.copy(out, dot),
    GetValueDoubleDotAt: (_time, out) => vec3.copy(out, doubleDot)
  });
  const sequencer = new TriVectorSequencer();
  sequencer.functions = [
    makeFunction([2, 3, 4], [1, 2, 3], [4, 5, 6]),
    makeFunction([0.5, 2, 0.25], [2, 3, 4], [5, 6, 7])
  ];
  const out = vec3.create();

  assertEquals(sequencer.GetValueAt(2, out), out);
  assertVector(out, [1, 6, 1]);
  sequencer.operator = TriVectorSequencer.TRIOPERATOR.TRIOP_ADD;
  assertVector(sequencer.GetValueAt(2, out), [2.5, 5, 4.25]);
  sequencer.operator = TriVectorSequencer.TRIOPERATOR.TRIOP_AVERAGE;
  assertVector(sequencer.GetValueAt(2, out), [1.25, 2.5, 2.125]);
  assertVector(sequencer.GetValueDotAt(2, out), [3, 5, 7]);
  assertVector(sequencer.GetValueDoubleDotAt(2, out), [9, 11, 13]);

  vec3.set(out, 8, 9, 10);
  assertEquals(sequencer.InterpolatedPosition(2, out), out);
  assertVector(out, [8, 9, 10]);
  assertEquals(sequencer.Update(2, out), out);
  assertVector(sequencer.value, [1.25, 2.5, 2.125]);
  sequencer.UpdateValue(3);
  assertVector(sequencer.value, [1.25, 2.5, 2.125]);

  assertEquals(CjsSchema.GetConstructor("TriVectorSequencer"), TriVectorSequencer);
  assertCarbonMethod(TriVectorSequencer, "UpdateValue", "implemented");
  assertCarbonMethod(TriVectorSequencer, "GetValueAt", "adapted");
});
test("TriColorSequencer preserves Carbon's double-time additive quirk", () =>
{
  const makeFunction = (value, length) => ({
    GetValueAt: (_time, out) => vec4.copy(out, value),
    Length: () => length
  });
  const sequencer = new TriColorSequencer();
  sequencer.functions = [
    makeFunction([2, 0.5, 1, 2], 3),
    makeFunction([0.5, 2, 0.25, 0.5], 7)
  ];
  const out = vec4.create();

  assertVector(sequencer.GetValueAt(2, out), [1, 1, 0.25, 1]);
  sequencer.operator = TriColorSequencer.TRIOPERATOR.TRIOP_ADD;
  assertVector(sequencer.GetValueAt(2, out), [3.5, 3.5, 2.25, 3.5]);
  assertEquals(sequencer.Length(), 7);
  assertEquals(sequencer.Update(2, out), out);
  assertVector(sequencer.value, [3.5, 3.5, 2.25, 3.5]);

  assertEquals(CjsSchema.GetConstructor("TriColorSequencer"), TriColorSequencer);
  assertCarbonMethod(TriColorSequencer, "Length", "implemented");
  assertCarbonMethod(TriColorSequencer, "GetValueAt", "adapted");
});
test("TriPerlinCurve follows Carbon fixed-seed noise and update caching", () =>
{
  const curve = new TriPerlinCurve();
  assertEquals(curve.name, "");
  assertEquals(curve.value, 0);
  assertEquals(curve.speed, 1);
  assertEquals(curve.alpha, 1.1);
  assertEquals(curve.beta, 2);
  assertEquals(curve.offset, 0);
  assertEquals(curve.scale, 1);
  assertEquals(curve.N, 3);

  TriPerlinCurve.expressionCurveFakeRandom = true;
  try
  {
    curve.N = 1;
    assertAlmostEquals(curve.GetValueAt(0), 0.5061580654296876, 1e-12);

    const cached = curve.Update(2);
    curve.offset = 1;
    assertEquals(curve.Update(2), cached);
    assertAlmostEquals(curve.Update(3), curve.GetValueAt(3), 1e-12);

    curve.offset = 0;
    curve.ScaleTime(4);
    assertAlmostEquals(curve.GetValueAt(0), 0.5061580654296876 * 4, 1e-12);
    curve.N = -1;
    assertEquals(curve.GetValueAt(0), 2);
  }
  finally
  {
    TriPerlinCurve.expressionCurveFakeRandom = false;
  }
});
test("leaf authored curve setters emit exact settled changes", () =>
{
  const curve = new Tr2CurveScalar();
  const events = [];
  curve.OnEvent("modified", (_model, payload) => events.push(payload));

  assertEquals(curve.SetName("throttle"), true);
  assertEquals(curve.SetName("throttle"), false);
  assertEquals(curve.SetTimeOffset(2), true);
  assertEquals(curve.SetTimeScale(0.5), true);
  assertEquals(curve.SetExtrapolation(Tr2CurveExtrapolation.CYCLE), true);

  assertEquals(events.length, 4);
  assertEquals(events.every(event => event.source === curve), true);

  const curveSet = new TriCurveSet();
  assertEquals(curveSet.SetName("movement"), true);
  assertEquals(curveSet.SetName("movement"), false);

  const quaternion = new Tr2CurveQuaternion();
  assertEquals(quaternion.SetName("rotation"), true);
  assertEquals(quaternion.SetExtrapolation(Tr2CurveExtrapolation.LINEAR), true);
});
test("expression and seed setters settle derived state before events", () =>
{
  const source = {};
  const scalar = new Tr2CurveScalarExpression();
  const scalarEvents = [];
  scalar.OnEvent("modified", (_model, payload) =>
  {
    assertAlmostEquals(scalar.GetValue(0), 3);
    scalarEvents.push(payload);
  });
  assertEquals(scalar.SetExpression("1 + 2", { source }), true);
  assertEquals(scalar.SetExpression("1 + 2", { source }), false);
  assertEquals(scalarEvents.length, 1);
  assertEquals(scalarEvents[0].source, source);

  const vector = new Tr2CurveVector3Expression();
  const vectorEvents = [];
  vector.OnEvent("modified", (_model, payload) => vectorEvents.push(payload));
  assertEquals(vector.SetExpressionX("4", { source }), true);
  assertEquals(vector.SetExpressionX("4", { source }), false);
  assertEquals(vectorEvents.length, 1);
  assertEquals(vectorEvents[0].source, source);

  const rotation = new Tr2CurveRandomAxisRotation();
  const rotationEvents = [];
  rotation.OnEvent("modified", (_model, payload) => rotationEvents.push(payload));
  assertEquals(rotation.SetSeed(7, { source }), true);
  assertEquals(rotation.SetSeed(7, { source }), false);
  assertEquals(rotationEvents.length, 1);
  assertEquals(rotationEvents[0].source, source);
});
test("curve methods expose source-backed Carbon metadata", () =>
{
  const constructors = [TriEventCurve, TriCurveSet, Tr2TranslationAdapter, Tr2RotationAdapter, Tr2ScalarFader, Tr2QuaternionLerpCurve, Tr2ObjectFollowCurveKey, Tr2FollowCurve, Tr2DistanceTracker, Tr2CurveVector3Lerp, Tr2CurveVector3, Tr2CurveVector2, Tr2CurveScalar, Tr2CurveRandomAxisRotation, Tr2CurveQuaternion, Tr2CurveEulerRotation, Tr2CurveConstant, Tr2CurveCombiner, Tr2CurveColor, Tr2CurveColorMixer];
  for (const ctor of constructors)
  {
    new ctor();
  }
  assertEquals(CjsSchema.GetConstructor("TriCurveSet"), TriCurveSet);
  assertEquals(CjsSchema.GetConstructor("Tr2CurveScalar"), Tr2CurveScalar);
  const sourceBackedMethods = [[TriEventCurve, "UpdateValue", "adapted"], [TriEventCurve, "Initialize", "implemented"], [TriEventCurve, "Length", "implemented"], [TriEventCurve, "Sort", "implemented"], [TriEventCurve, "AddKey", "implemented"], [TriEventCurve, "InsertKey", "implemented"], [TriEventCurve, "AddCallableKey", "adapted"], [TriEventCurve, "RemoveKey", "adapted"], [TriEventCurve, "GetKeyCount", "implemented"], [TriEventCurve, "GetKeyTime", "implemented"], [TriEventCurve, "GetKeyValue", "implemented"], [TriEventCurve, "SetKeyTime", "implemented"], [TriEventCurve, "SetKeyValue", "implemented"], [TriEventCurve, "GetCallableKeyValue", "adapted"], [TriEventCurve, "GetCallableKeyArgs", "adapted"], [TriCurveSet, "Update", "implemented"], [TriCurveSet, "OnSimClockRebase", "implemented"], [TriCurveSet, "Apply", "implemented"], [TriCurveSet, "ApplyTime", "implemented"], [TriCurveSet, "Initialize", "adapted"], [TriCurveSet, "Play", "implemented"], [TriCurveSet, "PlayTimeRange", "implemented"], [TriCurveSet, "PlayFrom", "adapted"], [TriCurveSet, "Stop", "implemented"], [TriCurveSet, "StopOnNextFrame", "implemented"], [TriCurveSet, "StopAfter", "implemented"], [TriCurveSet, "StopAfterWithCallback", "adapted"], [TriCurveSet, "GetTimeScale", "implemented"], [TriCurveSet, "GetScaledTime", "implemented"], [TriCurveSet, "SetName", "implemented"], [TriCurveSet, "GetName", "implemented"], [TriCurveSet, "GetCurvesCount", "implemented"], [TriCurveSet, "GetCurve", "implemented"], [TriCurveSet, "AddCurve", "implemented"], [TriCurveSet, "GetBindingsCount", "implemented"], [TriCurveSet, "GetBinding", "implemented"], [TriCurveSet, "AddBinding", "implemented"], [TriCurveSet, "GetMaxCurveDuration", "adapted"], [TriCurveSet, "GetRangeDuration", "implemented"], [TriCurveSet, "IsPlaying", "implemented"], [TriCurveSet, "UpdateWithCurrentTime", "adapted"], [TriCurveSet, "SetTimeRange", "implemented"], [TriCurveSet, "ResetTimeRange", "implemented"], [TriCurveSet, "HasTimeRange", "implemented"], [TriCurveSet, "GetTimeRange", "implemented"], [Tr2TranslationAdapter, "UpdateValue", "implemented"], [Tr2TranslationAdapter, "Update", "adapted"], [Tr2TranslationAdapter, "GetValueAt", "adapted"], [Tr2TranslationAdapter, "GetValueDotAt", "adapted"], [Tr2TranslationAdapter, "GetValueDoubleDotAt", "adapted"], [Tr2TranslationAdapter, "InterpolatedPosition", "adapted"], [Tr2TranslationAdapter, "RandomizeStart", "adapted"], [Tr2TranslationAdapter, "ScaleTime", "implemented"], [Tr2TranslationAdapter, "ResetStart", "implemented"], [Tr2RotationAdapter, "UpdateValue", "implemented"], [Tr2RotationAdapter, "Update", "adapted"], [Tr2RotationAdapter, "GetValueAt", "adapted"], [Tr2RotationAdapter, "GetValueDotAt", "adapted"], [Tr2RotationAdapter, "GetValueDoubleDotAt", "adapted"], [Tr2RotationAdapter, "RandomizeStart", "adapted"], [Tr2RotationAdapter, "ScaleTime", "implemented"], [Tr2RotationAdapter, "ResetStart", "implemented"], [Tr2ScalarFader, "Update", "adapted"], [Tr2ScalarFader, "StartFade", "implemented"], [Tr2ScalarFader, "IsZero", "implemented"], [Tr2ScalarFader, "GetFaderValue", "implemented"], [Tr2ScalarFader, "IsKickInZero", "implemented"], [Tr2ScalarFader, "GetKickInValue", "implemented"], [Tr2QuaternionLerpCurve, "UpdateValue", "implemented"], [Tr2QuaternionLerpCurve, "Update", "adapted"], [Tr2QuaternionLerpCurve, "GetValueAt", "adapted"], [Tr2QuaternionLerpCurve, "GetValueDotAt", "noop"], [Tr2QuaternionLerpCurve, "GetValueDoubleDotAt", "noop"], [Tr2QuaternionLerpCurve, "Length", "implemented"], [Tr2ObjectFollowCurveKey, "Initialize", "implemented"], [Tr2ObjectFollowCurveKey, "OnModified", "adapted"], [Tr2ObjectFollowCurveKey, "GetTime", "implemented"], [Tr2ObjectFollowCurveKey, "GetInterpolationType", "implemented"], [Tr2ObjectFollowCurveKey, "GetLeftTangent", "adapted"], [Tr2ObjectFollowCurveKey, "GetRightTangent", "adapted"], [Tr2ObjectFollowCurveKey, "GetValue", "adapted"], [Tr2FollowCurve, "UpdateValue", "implemented"], [Tr2FollowCurve, "Update", "adapted"], [Tr2FollowCurve, "GetValueAt", "adapted"], [Tr2FollowCurve, "GetValueDotAt", "noop"], [Tr2FollowCurve, "GetValueDoubleDotAt", "noop"], [Tr2FollowCurve, "InterpolatedPosition", "noop"], [Tr2FollowCurve, "GetValue", "adapted"], [Tr2FollowCurve, "OnListModified", "adapted"], [Tr2DistanceTracker, "UpdateValue", "implemented"], [Tr2DistanceTracker, "OnModified", "adapted"], [Tr2CurveVector3Lerp, "UpdateValue", "implemented"], [Tr2CurveVector3Lerp, "GetValue", "adapted"], [Tr2CurveVector3Lerp, "Update", "adapted"], [Tr2CurveVector3Lerp, "GetValueAt", "adapted"], [Tr2CurveVector3Lerp, "GetValueDotAt", "noop"], [Tr2CurveVector3Lerp, "GetValueDoubleDotAt", "noop"], [Tr2CurveVector3Lerp, "InterpolatedPosition", "noop"], [Tr2CurveVector3, "UpdateValue", "implemented"], [Tr2CurveVector3, "Length", "implemented"], [Tr2CurveVector3, "GetValue", "adapted"], [Tr2CurveVector3, "AddKey", "adapted"], [Tr2CurveVector3, "SetExtrapolation", "implemented"], [Tr2CurveVector3, "Update", "adapted"], [Tr2CurveVector3, "GetValueAt", "adapted"], [Tr2CurveVector3, "GetValueDotAt", "noop"], [Tr2CurveVector3, "GetValueDoubleDotAt", "noop"], [Tr2CurveVector3, "InterpolatedPosition", "noop"], [Tr2CurveVector2, "UpdateValue", "implemented"], [Tr2CurveVector2, "Length", "implemented"], [Tr2CurveVector2, "GetValue", "adapted"], [Tr2CurveVector2, "AddKey", "adapted"], [Tr2CurveVector2, "SetExtrapolation", "implemented"], [Tr2CurveVector2, "GetValueAt", "adapted"], [Tr2CurveScalar, "UpdateValue", "implemented"], [Tr2CurveScalar, "Update", "implemented"], [Tr2CurveScalar, "GetValueAt", "implemented"], [Tr2CurveScalar, "ScaleTime", "implemented"], [Tr2CurveScalar, "Length", "implemented"], [Tr2CurveScalar, "GetName", "implemented"], [Tr2CurveScalar, "SetName", "implemented"], [Tr2CurveScalar, "GetValue", "implemented"], [Tr2CurveScalar, "GetTangent", "implemented"], [Tr2CurveScalar, "GetTangentAt", "implemented"], [Tr2CurveScalar, "GetCurrentValue", "implemented"], [Tr2CurveScalar, "GetTimeOffset", "implemented"], [Tr2CurveScalar, "SetTimeOffset", "implemented"], [Tr2CurveScalar, "GetTimeScale", "implemented"], [Tr2CurveScalar, "SetTimeScale", "implemented"], [Tr2CurveScalar, "IsEmpty", "implemented"], [Tr2CurveScalar, "OnKeysChanged", "adapted"], [Tr2CurveScalar, "AddKey", "implemented"], [Tr2CurveScalar, "SetExtrapolation", "implemented"], [Tr2CurveScalar, "GetKeys", "implemented"], [Tr2CurveScalar, "SetDefinition", "adapted"], [Tr2CurveScalar, "GetDefinition", "adapted"], [Tr2CurveScalar, "Rasterize", "adapted"], [Tr2CurveRandomAxisRotation, "UpdateValue", "implemented"], [Tr2CurveRandomAxisRotation, "Update", "adapted"], [Tr2CurveRandomAxisRotation, "GetValueAt", "adapted"], [Tr2CurveRandomAxisRotation, "GetValueDotAt", "noop"], [Tr2CurveRandomAxisRotation, "GetValueDoubleDotAt", "noop"], [Tr2CurveRandomAxisRotation, "GetValue", "adapted"], [Tr2CurveRandomAxisRotation, "Initialize", "adapted"], [Tr2CurveRandomAxisRotation, "GetSeed", "implemented"], [Tr2CurveRandomAxisRotation, "SetSeed", "adapted"], [Tr2CurveRandomAxisRotation, "SeedChanged", "adapted"], [Tr2CurveQuaternion, "UpdateValue", "implemented"], [Tr2CurveQuaternion, "Update", "adapted"], [Tr2CurveQuaternion, "GetValueAt", "adapted"], [Tr2CurveQuaternion, "GetValueDotAt", "implemented"], [Tr2CurveQuaternion, "GetValueDoubleDotAt", "implemented"], [Tr2CurveQuaternion, "Length", "implemented"], [Tr2CurveQuaternion, "GetValue", "adapted"], [Tr2CurveQuaternion, "GetCurrentValue", "implemented"], [Tr2CurveQuaternion, "OnKeysChanged", "adapted"], [Tr2CurveQuaternion, "AddKey", "adapted"], [Tr2CurveQuaternion, "SetExtrapolation", "implemented"], [Tr2CurveEulerRotation, "UpdateValue", "implemented"], [Tr2CurveEulerRotation, "Update", "adapted"], [Tr2CurveEulerRotation, "GetValueAt", "adapted"], [Tr2CurveEulerRotation, "GetValueDotAt", "noop"], [Tr2CurveEulerRotation, "GetValueDoubleDotAt", "noop"], [Tr2CurveEulerRotation, "Length", "implemented"], [Tr2CurveEulerRotation, "GetValue", "adapted"], [Tr2CurveEulerRotation, "AddKey", "adapted"], [Tr2CurveEulerRotation, "SetExtrapolation", "implemented"], [Tr2CurveConstant, "UpdateValue", "noop"], [Tr2CurveConstant, "Update", "adapted"], [Tr2CurveConstant, "GetValueAt", "adapted"], [Tr2CurveConstant, "ScaleTime", "noop"], [Tr2CurveConstant, "GetValueDotAt", "implemented"], [Tr2CurveConstant, "GetValueDoubleDotAt", "implemented"], [Tr2CurveConstant, "InterpolatedPosition", "adapted"], [Tr2CurveCombiner, "UpdateValue", "implemented"], [Tr2CurveCombiner, "Length", "implemented"], [Tr2CurveCombiner, "GetValue", "adapted"], [Tr2CurveCombiner, "Update", "adapted"], [Tr2CurveCombiner, "GetValueAt", "adapted"], [Tr2CurveCombiner, "GetValueDotAt", "noop"], [Tr2CurveCombiner, "GetValueDoubleDotAt", "noop"], [Tr2CurveCombiner, "InterpolatedPosition", "noop"], [Tr2CurveColor, "UpdateValue", "adapted"], [Tr2CurveColor, "Update", "adapted"], [Tr2CurveColor, "GetValueAt", "adapted"], [Tr2CurveColor, "Length", "implemented"], [Tr2CurveColor, "GetValue", "adapted"], [Tr2CurveColor, "AddKey", "adapted"], [Tr2CurveColor, "SetExtrapolation", "implemented"], [Tr2CurveColorMixer, "UpdateValue", "implemented"], [Tr2CurveColorMixer, "Update", "adapted"], [Tr2CurveColorMixer, "GetValueAt", "adapted"], [Tr2CurveColorMixer, "Length", "implemented"], [Tr2CurveColorMixer, "GetValue", "adapted"]];
  for (const [ctor, methodName, status] of sourceBackedMethods)
  {
    assertCarbonMethod(ctor, methodName, status);
  }
  const jsOnlyMethods = [[TriEventCurve, "FireKey"], [TriCurveSet, "UpdateAt"], [TriCurveSet, "IsUsingSimTimeRebase"], [TriCurveSet, "ApplyTimeRange"], [TriCurveSet, "CallStopCallback"], [TriCurveSet, "DestroyStopCallback"], [Tr2TranslationAdapter, "GetLocalTime"], [Tr2TranslationAdapter, "GetStartAwareLocalTime"], [Tr2RotationAdapter, "GetLocalTime"], [Tr2RotationAdapter, "GetStartAwareLocalTime"], [Tr2ObjectFollowCurveKey, "GetLocator"], [Tr2ObjectFollowCurveKey, "GetRotation"], [Tr2ObjectFollowCurveKey, "GetWorldPosition"], [Tr2ObjectFollowCurveKey, "TransformByRotation"], [Tr2FollowCurve, "Sort"], [Tr2FollowCurve, "GetSegmentValue"], [Tr2FollowCurve, "GetHermiteSegmentValue"], [Tr2CurveVector3Lerp, "LerpToFirstKey"], [Tr2CurveScalar, "GetScaledTime"], [Tr2CurveScalar, "GetLocalTime"], [Tr2CurveScalar, "FindSegment"], [Tr2CurveScalar, "rasterize"], [Tr2CurveRandomAxisRotation, "Evaluate"], [Tr2CurveQuaternion, "GetName"], [Tr2CurveQuaternion, "SetName"], [Tr2CurveQuaternion, "GetLocalTime"], [Tr2CurveQuaternion, "FindSegment"], [Tr2CurveQuaternion, "Evaluate"], [Tr2CurveQuaternion, "GetSegmentValue"]];
  for (const [ctor, methodName] of jsOnlyMethods)
  {
    assertEquals(CjsSchema.getMethod(ctor, methodName), null);
  }
  assertEquals(CjsSchema.getMethod(Function, "Rasterize"), null);
});
test("promoted curve families expose source-backed Carbon metadata", () =>
{
  const constructors = [Tr2BoneMatrixCurve, Tr2CameraFollowCurveKey, Tr2CurveEulerRotationExpression, Tr2CurveScalarExpression, Tr2CurveVector3Expression, Tr2GrannyEventTrack, Tr2GrannyTrack, Tr2GrannyTransformTrack, Tr2GrannyVectorTrack, Tr2MatrixKey, Tr2ScalarExprKey, Tr2ScalarExprKeyCurve];
  for (const ctor of constructors)
  {
    new ctor();
  }
  const sourceBackedMethods = [[Tr2BoneMatrixCurve, "Initialize", "adapted"], [Tr2BoneMatrixCurve, "Length", "implemented"], [Tr2BoneMatrixCurve, "UpdateValue", "adapted"], [Tr2BoneMatrixCurve, "GetValueAt", "adapted"], [Tr2BoneMatrixCurve, "GetValue", "adapted"], [Tr2BoneMatrixCurve, "Sort", "implemented"], [Tr2BoneMatrixCurve, "AddKey", "adapted"], [Tr2BoneMatrixCurve, "RemoveKey", "implemented"], [Tr2BoneMatrixCurve, "SetBone", "implemented"], [Tr2BoneMatrixCurve, "GetBone", "implemented"], [Tr2CameraFollowCurveKey, "Initialize", "adapted"], [Tr2CameraFollowCurveKey, "OnModified", "adapted"], [Tr2CameraFollowCurveKey, "CalculateBoxPosition", "adapted"], [Tr2CameraFollowCurveKey, "GetValue", "adapted"], [Tr2CameraFollowCurveKey, "GetTime", "implemented"], [Tr2CameraFollowCurveKey, "GetInterpolationType", "implemented"], [Tr2CameraFollowCurveKey, "GetLeftTangent", "adapted"], [Tr2CameraFollowCurveKey, "GetRightTangent", "adapted"], [Tr2CurveEulerRotationExpression, "Initialize", "adapted"], [Tr2CurveEulerRotationExpression, "UpdateValue", "implemented"], [Tr2CurveEulerRotationExpression, "Update", "adapted"], [Tr2CurveEulerRotationExpression, "GetValueAt", "adapted"], [Tr2CurveEulerRotationExpression, "GetValue", "adapted"], [Tr2CurveEulerRotationExpression, "GetValueDotAt", "noop"], [Tr2CurveEulerRotationExpression, "GetValueDoubleDotAt", "noop"], [Tr2CurveEulerRotationExpression, "GetExpressionYaw", "implemented"], [Tr2CurveEulerRotationExpression, "GetExpressionPitch", "implemented"], [Tr2CurveEulerRotationExpression, "GetExpressionRoll", "implemented"], [Tr2CurveEulerRotationExpression, "SetExpressionYaw", "adapted"], [Tr2CurveEulerRotationExpression, "SetExpressionPitch", "adapted"], [Tr2CurveEulerRotationExpression, "SetExpressionRoll", "adapted"], [Tr2CurveEulerRotationExpression, "GetInputValue", "implemented"], [Tr2CurveEulerRotationExpression, "GetRandomConstant", "implemented"], [Tr2CurveEulerRotationExpression, "ResetRandomConstant", "implemented"], [Tr2CurveEulerRotationExpression, "GetExpressionTermInfo", "adapted"], [Tr2CurveEulerRotationExpression, "EvaluateExpression", "adapted"], [Tr2CurveScalarExpression, "Initialize", "adapted"], [Tr2CurveScalarExpression, "UpdateValue", "implemented"], [Tr2CurveScalarExpression, "Update", "implemented"], [Tr2CurveScalarExpression, "GetValueAt", "implemented"], [Tr2CurveScalarExpression, "ScaleTime", "implemented"], [Tr2CurveScalarExpression, "GetValue", "adapted"], [Tr2CurveScalarExpression, "GetExpression", "implemented"], [Tr2CurveScalarExpression, "SetExpression", "adapted"], [Tr2CurveScalarExpression, "GetRandomConstant", "implemented"], [Tr2CurveScalarExpression, "GetInputValue", "implemented"], [Tr2CurveScalarExpression, "ResetRandomConstant", "implemented"], [Tr2CurveScalarExpression, "GetExpressionTermInfo", "adapted"], [Tr2CurveScalarExpression, "EvaluateExpression", "adapted"], [Tr2CurveVector3Expression, "Initialize", "adapted"], [Tr2CurveVector3Expression, "UpdateValue", "implemented"], [Tr2CurveVector3Expression, "Update", "adapted"], [Tr2CurveVector3Expression, "GetValueAt", "adapted"], [Tr2CurveVector3Expression, "GetValue", "adapted"], [Tr2CurveVector3Expression, "GetValueDotAt", "noop"], [Tr2CurveVector3Expression, "GetValueDoubleDotAt", "noop"], [Tr2CurveVector3Expression, "InterpolatedPosition", "noop"], [Tr2CurveVector3Expression, "GetExpressionX", "implemented"], [Tr2CurveVector3Expression, "GetExpressionY", "implemented"], [Tr2CurveVector3Expression, "GetExpressionZ", "implemented"], [Tr2CurveVector3Expression, "SetExpressionX", "adapted"], [Tr2CurveVector3Expression, "SetExpressionY", "adapted"], [Tr2CurveVector3Expression, "SetExpressionZ", "adapted"], [Tr2CurveVector3Expression, "GetInputValue", "implemented"], [Tr2CurveVector3Expression, "GetRandomConstant", "implemented"], [Tr2CurveVector3Expression, "ResetRandomConstant", "implemented"], [Tr2CurveVector3Expression, "GetExpressionTermInfo", "adapted"], [Tr2CurveVector3Expression, "EvaluateExpression", "adapted"], [Tr2GrannyEventTrack, "TracksReady", "implemented"], [Tr2GrannyEventTrack, "ResetTracks", "implemented"], [Tr2GrannyEventTrack, "ApplyTracks", "adapted"], [Tr2GrannyEventTrack, "UpdateValueImpl", "adapted"], [Tr2GrannyTrack, "Initialize", "adapted"], [Tr2GrannyTrack, "OnModified", "adapted"], [Tr2GrannyTrack, "SetGrannyResource", "adapted"], [Tr2GrannyTrack, "UpdateValue", "adapted"], [Tr2GrannyTrack, "Length", "implemented"], [Tr2GrannyTrack, "SetCurves", "adapted"], [Tr2GrannyTrack, "UpdateValueImpl", "noop"], [Tr2GrannyTrack, "ResetTracks", "noop"], [Tr2GrannyTrack, "ApplyTracks", "noop"], [Tr2GrannyTrack, "TracksReady", "noop"], [Tr2GrannyTransformTrack, "TracksReady", "implemented"], [Tr2GrannyTransformTrack, "ResetTracks", "implemented"], [Tr2GrannyTransformTrack, "ApplyTracks", "adapted"], [Tr2GrannyTransformTrack, "UpdateValueImpl", "adapted"], [Tr2GrannyVectorTrack, "TracksReady", "implemented"], [Tr2GrannyVectorTrack, "ResetTracks", "implemented"], [Tr2GrannyVectorTrack, "ApplyTracks", "adapted"], [Tr2GrannyVectorTrack, "UpdateValueImpl", "adapted"], [Tr2ScalarExprKey, "Initialize", "adapted"], [Tr2ScalarExprKey, "OnModified", "adapted"], [Tr2ScalarExprKey, "RegenRandomConstant", "implemented"], [Tr2ScalarExprKey, "ReEvaluate", "adapted"], [Tr2ScalarExprKeyCurve, "Initialize", "adapted"], [Tr2ScalarExprKeyCurve, "Length", "implemented"], [Tr2ScalarExprKeyCurve, "UpdateValue", "implemented"], [Tr2ScalarExprKeyCurve, "GetValueAt", "adapted"], [Tr2ScalarExprKeyCurve, "GetKeyTime", "implemented"], [Tr2ScalarExprKeyCurve, "SetKeyTime", "implemented"], [Tr2ScalarExprKeyCurve, "GetKeyValue", "implemented"], [Tr2ScalarExprKeyCurve, "SetKeyValue", "implemented"], [Tr2ScalarExprKeyCurve, "GetKeyCount", "implemented"], [Tr2ScalarExprKeyCurve, "GetKeyInterpolation", "implemented"], [Tr2ScalarExprKeyCurve, "SetKeyInterpolation", "implemented"], [Tr2ScalarExprKeyCurve, "GetKeyLeftTangent", "implemented"], [Tr2ScalarExprKeyCurve, "SetKeyLeftTangent", "implemented"], [Tr2ScalarExprKeyCurve, "GetKeyRightTangent", "implemented"], [Tr2ScalarExprKeyCurve, "SetKeyRightTangent", "implemented"], [Tr2ScalarExprKeyCurve, "AddKey", "adapted"], [Tr2ScalarExprKeyCurve, "RemoveKey", "implemented"], [Tr2ScalarExprKeyCurve, "Sort", "adapted"]];
  for (const [ctor, methodName, status] of sourceBackedMethods)
  {
    assertCarbonMethod(ctor, methodName, status);
  }
  assertEquals(CjsSchema.getMethod(Tr2ScalarExprKey, "ReEvaluate")?.carbon?.originalName, "UpdateValues");
  const jsOnlyMethods = [[Tr2CurveEulerRotationExpression, "Compile"], [Tr2CurveEulerRotationExpression, "GetContext"], [Tr2CurveScalarExpression, "Compile"], [Tr2CurveVector3Expression, "Compile"], [Tr2ScalarExprKeyCurve, "Update"], [Tr2ScalarExprKeyCurve, "GetKeyTangent"], [Tr2ScalarExprKeyCurve, "SetKeyTangent"], [Tr2ScalarExprKeyCurve, "GetLocalTime"]];
  for (const [ctor, methodName] of jsOnlyMethods)
  {
    assertEquals(CjsSchema.getMethod(ctor, methodName), null);
  }
});
test("Granny JSON tracks bind the first matching group and sample values", () =>
{
  const source = {
    animations: [{
      duration: 4,
      timeStep: 1,
      trackGroups: [{
        name: "root",
        transformTracks: [{
          name: "Bone",
          position: {
            format: 4,
            degree: 0,
            controls: [1, 2, 3]
          },
          orientation: {
            format: 5,
            degree: 0,
            controls: [0, 0, 0, 1]
          },
          scaleShear: {
            format: 3,
            degree: 0,
            controls: [2, 0, 0, 0, 3, 4, 0, 0, 12]
          }
        }],
        vectorTracks: [{
          name: "Alpha",
          valueCurve: {
            format: 0,
            degree: 0,
            dimension: 1,
            controls: [10, 20, 30, 40]
          }
        }],
        textTracks: [{
          name: "Events",
          entries: [{
            timeStamp: 0.5,
            text: "warmup"
          }, {
            timeStamp: 1.5,
            text: "fire"
          }, {
            timeStamp: 3.5,
            text: "cooldown"
          }]
        }]
      }]
    }]
  };
  const transform = new Tr2GrannyTransformTrack();
  transform.grannyRes = source;
  transform.group = "root";
  transform.name = "Bone";
  transform.Initialize();
  assert(transform.TracksReady());
  assertEquals(transform.Length(), 4);
  assertAlmostEquals(transform.translation[0], 1);
  assertAlmostEquals(transform.translation[1], 2);
  assertAlmostEquals(transform.translation[2], 3);
  assertAlmostEquals(transform.rotation[3], 1);
  assertAlmostEquals(transform.scale[0], 2);
  assertAlmostEquals(transform.scale[1], 5);
  assertAlmostEquals(transform.scale[2], 12);
  transform.UpdateValue(5);
  assertAlmostEquals(transform.translation[0], 1);
  const vector = new Tr2GrannyVectorTrack();
  vector.grannyRes = source;
  vector.group = "root";
  vector.name = "Alpha";
  vector.Initialize();
  assert(vector.TracksReady());
  assertEquals(vector.Length(), 4);
  assertEquals(vector.value, 10);
  vector.UpdateValue(2.5);
  assertEquals(vector.value, 30);
  vector.UpdateValue(5);
  assertEquals(vector.value, 30);
  vector.cycle = true;
  vector.UpdateValue(5.5);
  assertEquals(vector.value, 20);
  CjsGrannyCurves.clearResources();
  CjsGrannyCurves.registerResource("res:/synthetic/test.gr2", source);
  const pathBound = new Tr2GrannyVectorTrack();
  pathBound.grannyResPath = "res:/synthetic/test.gr2";
  pathBound.group = "root";
  pathBound.name = "Alpha";
  pathBound.Initialize();
  assert(pathBound.TracksReady());
  pathBound.UpdateValue(3.5);
  assertEquals(pathBound.value, 40);
  assertEquals(CjsSchema.getField(Tr2GrannyTrack, "grannyResPath")?.type.kind, "path");
  assertEquals(CjsSchema.getField(Tr2GrannyTrack, "duration")?.type.kind, "float32");
  assertEquals(CjsGrannyCurves.resolveResource("res:/synthetic/test.gr2"), source);
  CjsGrannyCurves.unregisterResource("res:/synthetic/test.gr2");
  assertEquals(CjsGrannyCurves.resolveResource("res:/synthetic/test.gr2"), null);
  CjsGrannyCurves.clearResources();
  const events = [];
  const eventTrack = new Tr2GrannyEventTrack();
  eventTrack.grannyRes = source;
  eventTrack.group = "root";
  eventTrack.name = "Events";
  eventTrack.eventListener = {
    HandleEvent: value => events.push(value)
  };
  eventTrack.Initialize();
  assert(eventTrack.TracksReady());
  assertEquals(eventTrack.Length(), 4);
  eventTrack.UpdateValue(1);
  assertEquals(events.join(","), "warmup");
  eventTrack.UpdateValue(2);
  assertEquals(events.join(","), "warmup,fire");
  eventTrack.UpdateValue(1);
  assertEquals(events.join(","), "warmup,fire,warmup");
  eventTrack.eventListener = null;
  eventTrack.UpdateValue(4);
  assertEquals(events.join(","), "warmup,fire,warmup");
  const later = new Tr2GrannyTransformTrack();
  later.grannyRes = {
    animations: [{
      duration: 1,
      timeStep: 1,
      trackGroups: [{
        name: "root",
        transformTracks: []
      }]
    }, source.animations[0]]
  };
  later.group = "root";
  later.name = "Bone";
  later.Initialize();
  assertEquals(later.TracksReady(), false);
  assertEquals(later.Length(), 0);
});
test("Granny JSON tracks tolerate raw wrappers and reject missing curves", () =>
{
  const rawWrapped = {
    fileInfo: {
      Animations: [{
        Duration: 0,
        TimeStep: 1,
        TrackGroups: [{
          Name: "raw",
          TransformTracks: [{
            Name: "Bone",
            Position: {
              Format: 10,
              Degree: 0,
              Knots: [0],
              Controls: [9, 8, 7],
              Dimension: 3
            },
            Orientation: {
              Format: 8,
              Degree: 0,
              Knots: [0],
              Controls: [0, 0, 0, 1],
              Dimension: 4
            },
            ScaleShear: {
              Format: 13,
              Degree: 0,
              Knots: [0],
              Controls: [1, 0, 0, 0, 1, 0, 0, 0, 1],
              Dimension: 9
            }
          }],
          VectorTracks: [{
            Name: "Alpha",
            ValueCurve: {
              Format: 1,
              Degree: 0,
              Knots: [0],
              Controls: [0.75],
              Dimension: 1
            }
          }, {
            Name: "Broken",
            ValueCurve: {
              format: 0,
              degree: 0,
              error: "no curve data"
            }
          }],
          TextTracks: [{
            Name: "Events",
            Entries: [{
              TimeStamp: 0,
              Text: "ready"
            }]
          }]
        }]
      }]
    }
  };
  const transform = new Tr2GrannyTransformTrack();
  transform.grannyRes = rawWrapped;
  transform.group = "raw";
  transform.name = "Bone";
  transform.cycle = true;
  transform.Initialize();
  assert(transform.TracksReady());
  assertEquals(transform.Length(), 0);
  assertAlmostEquals(transform.translation[0], 9);
  assertAlmostEquals(transform.translation[1], 8);
  assertAlmostEquals(transform.translation[2], 7);
  assertAlmostEquals(transform.rotation[3], 1);
  assertAlmostEquals(transform.scale[0], 1);
  transform.UpdateValue(0);
  assertAlmostEquals(transform.translation[0], 9);
  const vector = new Tr2GrannyVectorTrack();
  vector.grannyRes = rawWrapped;
  vector.group = "raw";
  vector.name = "Alpha";
  vector.Initialize();
  assert(vector.TracksReady());
  assertAlmostEquals(vector.value, 0.75);
  const broken = new Tr2GrannyVectorTrack();
  broken.grannyRes = rawWrapped;
  broken.group = "raw";
  broken.name = "Broken";
  broken.Initialize();
  assertEquals(broken.TracksReady(), false);
  const events = [];
  const eventTrack = new Tr2GrannyEventTrack();
  eventTrack.grannyRes = rawWrapped;
  eventTrack.group = "raw";
  eventTrack.name = "Events";
  eventTrack.eventListener = {
    HandleEvent(value)
    {
      events.push(value);
    }
  };
  eventTrack.Initialize();
  eventTrack.UpdateValue(0);
  assertEquals(events.join(","), "ready");
});
test("CjsGrannyCurves samples keyframed, linear, and quadratic controls", () =>
{
  const out = new Float32Array(1);
  CjsGrannyCurves.sampleDecodedCurve(out, {
    knots: [0, 1],
    controls: [0, 10],
    degree: 1,
    dimension: 1
  }, 0.5);
  assertAlmostEquals(out[0], 5);
  CjsGrannyCurves.sampleDecodedCurve(out, {
    knots: [0, 1, 2],
    controls: [0, 10, 20],
    degree: 2,
    dimension: 1
  }, 1.5);
  assertAlmostEquals(out[0], 11.25);
  CjsGrannyCurves.sampleDecodedCurve(out, {
    knots: [0, 1],
    controls: [3, 9],
    degree: 0,
    dimension: 1
  }, 1.5, false, 2, { keyframed: true });
  assertAlmostEquals(out[0], 9);
});
function assertCarbonMethod(ctor, methodName, status)
{
  const method = CjsSchema.getMethod(ctor, methodName);
  assertEquals(method?.carbon?.method, true, `${ctor.name}.${methodName} should be decorated as a Carbon method`);
  assertEquals(method?.impl?.status, status, `${ctor.name}.${methodName} should have impl status ${status}`);
}
test("expression curves expose Carbon term metadata and current-time inputs", () =>
{
  const scalar = new Tr2CurveScalarExpression();
  scalar.inputs = [{
    Update: time => time + 1,
    GetValueAt: time => time + 1
  }];
  scalar.ScaleTime(2);
  scalar.SetExpression("input(0) + inputAt(0, 3)");
  assertAlmostEquals(scalar.GetValue(4), 7);
  scalar.ScaleTime(0);
  scalar.SetExpression("time");
  assertEquals(scalar.GetValue(1), Infinity);
  scalar.ScaleTime(2);
  const scalarTerms = scalar.GetExpressionTermInfo();
  assert(scalarTerms.some(term => term.name === "fractal"));
  assert(scalarTerms.some(term => term.name === "randhash"));
  assert(scalarTerms.some(term => term.name === "pi2"));
  assertEquals(CjsSchema.getField(Tr2CurveScalarExpression, "expression")?.io?.persistOnly, true);
  assertEquals(CjsSchema.getField(Tr2CurveScalarExpression, "input1")?.io?.persist, true);
  for (const Class of [Tr2CurveScalarExpression, Tr2CurveVector3Expression, Tr2CurveEulerRotationExpression])
  {
    for (const field of ["input1", "input2", "input3", "input4"])
    {
      assertEquals(CjsSchema.getField(Class, field)?.type.kind, "float32");
    }
  }
  assertEquals(CjsSchema.getField(Tr2BoneMatrixCurve, "interpolation"), null);
  assertEquals(CjsSchema.getField(Tr2MatrixKey, "interpolation"), null);
  assertEquals(CjsSchema.getField(Tr2BoneMatrixCurve, "currentValue")?.type.kind, "mat4");
  assertEquals(CjsSchema.getField(Tr2BoneMatrixCurve, "name")?.type.kind, "string");
  assertEquals(CjsSchema.getField(Tr2BoneMatrixCurve, "length")?.type.kind, "float32");
  assertEquals(CjsSchema.getField(Tr2BoneMatrixCurve, "cycle")?.type.kind, "boolean");
  assertEquals(CjsSchema.getField(Tr2BoneMatrixCurve, "startValue")?.type.kind, "mat4");
  assertEquals(CjsSchema.getField(Tr2BoneMatrixCurve, "keys")?.type.kind, "list");
  assertEquals(CjsSchema.getField(Tr2MatrixKey, "time")?.type.kind, "float32");
  assertEquals(CjsSchema.getField(Tr2MatrixKey, "value")?.type.kind, "mat4");
  assertEquals(CjsSchema.getField(Tr2ScalarExprKey, "interpolation")?.type.kind, "uint32");
  assertEquals(CjsSchema.getField(Tr2ScalarExprKey, "time")?.type.kind, "float32");
  assertEquals(CjsSchema.getField(Tr2ScalarExprKey, "value")?.type.kind, "float32");
  const vector = new Tr2CurveVector3Expression();
  vector.inputs = [{
    Update: time => time * 2,
    GetValueAt: time => time * 2
  }];
  vector.timeScale = 3;
  vector.SetExpressionX("input(0)");
  vector.SetExpressionY("randomConstant(1, 3)");
  vector.SetExpressionZ("pi2");
  vector.randomConstant = 0.25;
  const value = vec3.create();
  vector.GetValue(6, value);
  assertAlmostEquals(value[0], 4);
  assertAlmostEquals(value[1], 1.5);
  assertAlmostEquals(value[2], Math.PI * 2);
  vector.ResetRandomConstant();
  const resetRandom = vector.GetRandomConstant();
  assert(resetRandom >= 0 && resetRandom < 1);
  assert(vector.GetExpressionTermInfo().some(term => term.name === "noise"));
  vector.timeScale = 0;
  vector.SetExpressionX("time");
  vector.GetValue(1, value);
  assertEquals(value[0], Infinity);
  vector.SetExpressionX("2");
  vector.SetExpressionY("3");
  vector.SetExpressionZ("4");
  const vectorOut = vec3.create();
  vector.Update(0, vectorOut);
  assertAlmostEquals(vector.currentValue[0], 2);
  assertAlmostEquals(vectorOut[2], 4);
  const colorOut = vec4.createLinear();
  vector.GetValueAt(0, colorOut);
  assertAlmostEquals(colorOut[0], 2);
  assertAlmostEquals(colorOut[1], 3);
  assertAlmostEquals(colorOut[2], 4);
  assertAlmostEquals(colorOut[3], 0);
  const derivative = vec3.fromValues(7, 8, 9);
  vector.GetValueDotAt(0, derivative);
  assertAlmostEquals(derivative[0], 7);
  assertAlmostEquals(derivative[1], 8);
  assertAlmostEquals(derivative[2], 9);
  const euler = new Tr2CurveEulerRotationExpression();
  euler.SetExpressionYaw("radians(90)");
  assert(euler.GetExpressionTermInfo().some(term => term.name === "radians"));
  assertAlmostEquals(euler.EvaluateExpression("radians(180)"), Math.PI);
  const eulerOut = quat.create();
  euler.Update(0, eulerOut);
  assertAlmostEquals(euler.currentValue[0], eulerOut[0]);
  assertAlmostEquals(euler.currentValue[1], eulerOut[1]);
  assertAlmostEquals(euler.currentValue[2], eulerOut[2]);
  assertAlmostEquals(euler.currentValue[3], eulerOut[3]);
  assert(Math.abs(euler.currentValue[3] - 1) > 1e-6);
});
test("Tr2ScalarExprKeyCurve applies Carbon time scale and offset", () =>
{
  assertEquals(new Tr2ScalarExprKey().interpolation, Tr2CurveInterpolation.LINEAR);
  assertEquals(new Tr2ScalarExprKeyCurve().interpolation, Tr2CurveInterpolation.LINEAR);
  const curve = new Tr2ScalarExprKeyCurve();
  curve.interpolation = Tr2CurveInterpolation.LINEAR;
  curve.AddKey(0, 0);
  curve.AddKey(10, 10);
  curve.timeScale = 2;
  curve.timeOffset = 1;
  assertAlmostEquals(curve.GetLocalTime(6), 2);
  assertAlmostEquals(curve.GetValueAt(6), 2);
  curve.timeScale = 0;
  assertEquals(curve.GetValueAt(1), 10);
});
test("Tr2ScalarExprKeyCurve follows Carbon Hermite interpolation", () =>
{
  const curve = new Tr2ScalarExprKeyCurve();
  curve.AddKey(0, 0, 0, 4, Tr2CurveInterpolation.HERMITE);
  curve.AddKey(2, 2, 0, 0, Tr2CurveInterpolation.HERMITE);
  assertAlmostEquals(curve.GetValueAt(1), 1.5);
  curve.SetKeyInterpolation(0, Tr2CurveInterpolation.CONSTANT);
  assertAlmostEquals(curve.GetValueAt(1), 0);
});
test("Tr2ScalarExprKey evaluates Carbon key variable buffers", () =>
{
  const previous = new Tr2ScalarExprKey();
  previous.time = 3;
  previous.value = 7;
  const key = new Tr2ScalarExprKey();
  key.time = 1;
  key.value = 5;
  key.left = 2;
  key.randomConstant = 0.5;
  key.timeExpression = "prevKeyTime + 1";
  key.valueExpression = "0";
  key.rightTangentExpression = "time + value + leftTangent + randomConstant";
  key.ReEvaluate(previous);
  assertAlmostEquals(Number(key.time), 4);
  assertAlmostEquals(Number(key.value), 0);
  assertAlmostEquals(key.right, 8.5);
  assertAlmostEquals(key.prevKeyTime, 3);
  assertAlmostEquals(key.prevKeyValue, 7);
  const perlinValue = key.Evaluate("perlin_simple(time)", -1);
  assert(Number.isFinite(perlinValue));
  assert(perlinValue !== -1);
});
test("promoted follow and bone curves keep Carbon defaults", () =>
{
  const cameraKey = new Tr2CameraFollowCurveKey();
  assertAlmostEquals(cameraKey.angleZero, Math.PI / 2);
  cameraKey.fovMultiplication = 2;
  assert(cameraKey.OnModified());
  assertAlmostEquals(cameraKey.fovMultiplication, 0.999);
  cameraKey.fovMultiplication = 0;
  assert(cameraKey.OnModified());
  assertAlmostEquals(cameraKey.fovMultiplication, 0.001);
  const boneCurve = new Tr2BoneMatrixCurve();
  assertEquals(boneCurve.length, 1);
  assertEquals(boneCurve.cycle, true);
  boneCurve.SetBone("joint");
  const out = mat4.create();
  boneCurve.GetValueAt(0, out);
  assert(IsIdentityMat4(out));
  const transform = TranslationMat4(1, 0, 0);
  const bone = TranslationMat4(0, 2, 0);
  const world = TranslationMat4(0, 0, 3);
  mat4.copy(boneCurve.transform, transform);
  boneCurve.skinnedObject = {
    GetBoneTransform(name)
    {
      return name === "joint" ? bone : null;
    },
    GetTransform()
    {
      return world;
    }
  };
  boneCurve.GetValueAt(0, out);
  assertAlmostEquals(out[12], 1);
  assertAlmostEquals(out[13], 2);
  assertAlmostEquals(out[14], 3);
  const rollover = new Tr2BoneMatrixCurve();
  rollover.AddKey(3, TranslationMat4(5, 0, 0));
  assertEquals(rollover.length, 3);
  assertAlmostEquals(rollover.endValue[12], 5);
  const rolloverKeys = rollover.keys;
  assertEquals(rolloverKeys[0].time, 1);
  assertAlmostEquals(rolloverKeys[0].value[12], 0);
  assertEquals(rollover.GetKeyCount(), 1);
  assertEquals(rollover.GetKeyTime(0), 1);
  assertEquals(rollover.GetKeyTime(20), rollover.length);
  assertEquals(rollover.GetKeyInterpolation(0), 4);
  assertEquals(rollover.GetKeyInterpolation(20), 4);
  rollover.SetKeyInterpolation(0, 5);
  assertEquals(rollover.GetKeyInterpolation(0), 5);
  const detachedValue = rollover.GetKeyValue(0);
  detachedValue[12] = 99;
  assertAlmostEquals(rollover.GetKeyValue(0)[12], 0);
  const replacement = TranslationMat4(7, 8, 9);
  rollover.SetKeyValue(0, replacement);
  replacement[12] = 100;
  assertAlmostEquals(rollover.GetKeyValue(0)[12], 7);
  rollover.SetKeyTime(0, 2);
  assertEquals(rollover.GetKeyTime(0), 2);
  rollover.RemoveKey(-1);
  assertEquals(rollover.GetKeyCount(), 1);
  rollover.RemoveKey(0);
  assertEquals(rollover.GetKeyCount(), 0);
  for (const [method, status] of [
    ["GetKeyCount", "implemented"],
    ["GetKeyTime", "implemented"],
    ["SetKeyTime", "implemented"],
    ["GetKeyValue", "adapted"],
    ["SetKeyValue", "adapted"],
    ["GetKeyInterpolation", "implemented"],
    ["SetKeyInterpolation", "implemented"]
  ])
  {
    assertEquals(CjsSchema.getMethod(Tr2BoneMatrixCurve, method)?.impl?.status, status, method);
  }
});
test("Tr2CurveScalarKey defaults match Carbon", () =>
{
  const key = new Tr2CurveScalarKey();
  assertEquals(key.time, 0);
  assertEquals(key.value, 0);
  assertEquals(key.leftTangent, 0);
  assertEquals(key.rightTangent, 0);
  assertEquals(key.id, 0);
  assertEquals(key.interpolation, Tr2CurveInterpolation.HERMITE);
  assertEquals(key.tangentType, 0);
  assertEquals(CjsSchema.getField(Tr2CurveScalarKey, "id")?.type.kind, "uint16");
  assertEquals(CjsSchema.getField(Tr2CurveScalarKey, "interpolation")?.type.kind, "uint8");
});
test("Tr2CurveQuaternionKey defaults match Carbon", () =>
{
  const key = new Tr2CurveQuaternionKey();
  assertEquals(key.time, 0);
  assertEquals(key.value[0], 0);
  assertEquals(key.value[1], 0);
  assertEquals(key.value[2], 0);
  assertEquals(key.value[3], 1);
  assertEquals(key.id, 0);
  assertEquals(key.interpolation, Tr2CurveInterpolation.LINEAR);
  assertEquals(CjsSchema.getField(Tr2CurveQuaternionKey, "interpolation")?.type.kind, "uint16");
});
test("Tr2CurveQuaternion evaluates constant, slerp, and cycle wrapping", () =>
{
  const curve = new Tr2CurveQuaternion();
  const identity = quat.create();
  const halfTurn = quat.fromValues(0, 0, 1, 0);
  curve.AddKey(0, identity, Tr2CurveInterpolation.LINEAR);
  curve.AddKey(2, halfTurn, Tr2CurveInterpolation.LINEAR);
  const valueOut = quat.create();
  const middle = curve.GetValue(1, valueOut);
  assertAlmostEquals(middle[0], 0);
  assertAlmostEquals(middle[1], 0);
  assertAlmostEquals(middle[2], Math.SQRT1_2);
  assertAlmostEquals(middle[3], Math.SQRT1_2);
  curve.keys[0].interpolation = Tr2CurveInterpolation.CONSTANT;
  const constant = curve.GetValue(1, valueOut);
  assertAlmostEquals(constant[2], 0);
  assertAlmostEquals(constant[3], 1);
  curve.keys[0].interpolation = Tr2CurveInterpolation.LINEAR;
  curve.SetExtrapolation(Tr2CurveExtrapolation.CYCLE);
  const exactCycle = curve.GetValue(2, valueOut);
  assertAlmostEquals(exactCycle[2], 0);
  assertAlmostEquals(exactCycle[3], 1);
  const cycled = curve.GetValue(3, valueOut);
  assertAlmostEquals(cycled[2], Math.SQRT1_2);
  assertAlmostEquals(cycled[3], Math.SQRT1_2);
  const out = quat.create();
  curve.Update(1, out);
  assertAlmostEquals(out[2], Math.SQRT1_2);
  assertAlmostEquals(curve.currentValue[2], Math.SQRT1_2);
  assertEquals(CjsSchema.getField(Tr2CurveQuaternion, "keys")?.type.kind, "array");
  assertEquals(CjsSchema.getField(Tr2CurveQuaternion, "currentValue")?.type.kind, "quat");
});
test("Tr2CurveScalar evaluates linear, clamp, and linear extrapolation", () =>
{
  const curve = new Tr2CurveScalar();
  curve.AddKey(0, 1, Tr2CurveInterpolation.LINEAR);
  curve.AddKey(2, 5, Tr2CurveInterpolation.LINEAR);
  assertAlmostEquals(curve.GetValue(1), 3);
  assertAlmostEquals(curve.GetValue(-1), 1);
  assertAlmostEquals(curve.GetValue(3), 5);
  curve.keys[0].leftTangent = 2;
  curve.keys[1].rightTangent = 4;
  curve.SetExtrapolation(Tr2CurveExtrapolation.LINEAR);
  assertAlmostEquals(curve.GetValue(-1), -1);
  assertAlmostEquals(curve.GetValue(3), 9);
  assertAlmostEquals(curve.GetTangentAt(3), 4);
  assertEquals(CjsSchema.getField(Tr2CurveScalar, "keys")?.type.kind, "array");
});
test("Tr2CurveScalar keeps stable sorted keys and computes hermite", () =>
{
  const curve = new Tr2CurveScalar();
  const a = new Tr2CurveScalarKey();
  a.time = 1;
  a.value = 2;
  a.interpolation = Tr2CurveInterpolation.HERMITE;
  a.tangentType = 3;
  const b = new Tr2CurveScalarKey();
  b.time = 0;
  b.value = 0;
  b.interpolation = Tr2CurveInterpolation.HERMITE;
  b.tangentType = 3;
  const c = new Tr2CurveScalarKey();
  c.time = 2;
  c.value = 0;
  c.interpolation = Tr2CurveInterpolation.HERMITE;
  c.tangentType = 3;
  curve.keys = [a, b, c];
  curve.OnKeysChanged();
  assertEquals(curve.keys[0], b);
  assertEquals(curve.keys[1], a);
  assertEquals(curve.keys[2], c);
  assertAlmostEquals(curve.GetValue(1), 2);
});
test("Tr2CurveVector2 composes scalar component curves", () =>
{
  const curve = new Tr2CurveVector2();
  curve.AddKey(0, vec2.fromValues(1, 2), Tr2CurveInterpolation.LINEAR);
  curve.AddKey(2, vec2.fromValues(5, 6), Tr2CurveInterpolation.LINEAR);
  const value = vec2.create();
  curve.GetValue(1, value);
  assertAlmostEquals(value[0], 3);
  assertAlmostEquals(value[1], 4);
  assertEquals(curve.Length(), 2);
  const out = vec2.create();
  curve.GetValueAt(1, out);
  assertAlmostEquals(out[0], 3);
  assertAlmostEquals(out[1], 4);
  const tangentCurve = new Tr2CurveVector2();
  tangentCurve.AddKey(0, vec2.fromValues(1, 2), Tr2CurveInterpolation.HERMITE, undefined, vec2.fromValues(9, 9));
  assertAlmostEquals(tangentCurve.x.keys[0].rightTangent, 0);
  assertAlmostEquals(tangentCurve.y.keys[0].rightTangent, 0);
  assertEquals(CjsSchema.getField(Tr2CurveVector2, "x")?.type.kind, "objectRef");
  assertEquals(CjsSchema.getField(Tr2CurveVector2, "currentValue")?.type.kind, "vec2");
});
test("Tr2CurveVector3 composes scalar component curves", () =>
{
  const curve = new Tr2CurveVector3();
  curve.AddKey(0, vec3.fromValues(1, 2, 3), Tr2CurveInterpolation.LINEAR);
  curve.AddKey(2, vec3.fromValues(5, 6, 7), Tr2CurveInterpolation.LINEAR);
  const value = vec3.create();
  curve.GetValue(1, value);
  assertAlmostEquals(value[0], 3);
  assertAlmostEquals(value[1], 4);
  assertAlmostEquals(value[2], 5);
  assertEquals(curve.Length(), 2);
  const out = vec3.create();
  curve.Update(1, out);
  assertAlmostEquals(out[0], 3);
  assertAlmostEquals(curve.currentValue[2], 5);
  const tangentCurve = new Tr2CurveVector3();
  tangentCurve.AddKey(0, vec3.fromValues(1, 2, 3), Tr2CurveInterpolation.HERMITE, undefined, vec3.fromValues(9, 9, 9));
  assertAlmostEquals(tangentCurve.x.keys[0].rightTangent, 0);
  assertAlmostEquals(tangentCurve.y.keys[0].rightTangent, 0);
  assertAlmostEquals(tangentCurve.z.keys[0].rightTangent, 0);
  assertEquals(CjsSchema.getField(Tr2CurveVector3, "x")?.type.kind, "objectRef");
  assertEquals(CjsSchema.getField(Tr2CurveVector3, "currentValue")?.type.kind, "vec3");
});
test("Tr2CurveColor composes scalar component curves and gamma output", () =>
{
  const curve = new Tr2CurveColor();
  curve.AddKey(0, vec4.fromValues(0.25, 0.5, 0.75, 1), Tr2CurveInterpolation.LINEAR);
  curve.AddKey(2, vec4.fromValues(0.5, 1, 0.25, 0.5), Tr2CurveInterpolation.LINEAR);
  const value = vec4.create();
  curve.GetValue(1, value);
  assertAlmostEquals(value[0], 0.375);
  assertAlmostEquals(value[1], 0.75);
  assertAlmostEquals(value[2], 0.5);
  assertAlmostEquals(value[3], 0.75);
  assertEquals(curve.Length(), 2);
  curve.srgbOutput = true;
  const gamma = vec4.create();
  curve.GetValue(1, gamma);
  assertAlmostEquals(gamma[0], Math.pow(0.375, 0.454545));
  assertAlmostEquals(gamma[3], 0.75);
  const noAlpha = new Tr2CurveColor();
  noAlpha.r.AddKey(0, 0.2, Tr2CurveInterpolation.LINEAR);
  const noAlphaValue = vec4.create();
  noAlpha.GetValue(0, noAlphaValue);
  assertAlmostEquals(noAlphaValue[3], 1);
  const out = vec4.create();
  curve.Update(1, out);
  assertAlmostEquals(out[3], 0.75);
  const negative = new Tr2CurveColor();
  negative.srgbOutput = true;
  negative.AddKey(0, vec4.fromValues(-0.25, -0.5, -0.75, -1), Tr2CurveInterpolation.LINEAR);
  const negativeOut = vec4.createLinear();
  negative.Update(0, negativeOut);
  assertAlmostEquals(negativeOut[0], 0);
  assertAlmostEquals(negativeOut[1], 0);
  assertAlmostEquals(negativeOut[2], 0);
  assertAlmostEquals(negativeOut[3], 0);
  const tangentCurve = new Tr2CurveColor();
  tangentCurve.AddKey(0, vec4.fromValues(1, 2, 3, 4), Tr2CurveInterpolation.HERMITE, undefined, vec4.fromValues(9, 9, 9, 9));
  assertAlmostEquals(tangentCurve.r.keys[0].rightTangent, 0);
  assertAlmostEquals(tangentCurve.g.keys[0].rightTangent, 0);
  assertAlmostEquals(tangentCurve.b.keys[0].rightTangent, 0);
  assertAlmostEquals(tangentCurve.a.keys[0].rightTangent, 0);
  assertEquals(CjsSchema.getField(Tr2CurveColor, "r")?.type.kind, "objectRef");
  assertEquals(CjsSchema.getField(Tr2CurveColor, "currentValue")?.type.kind, "color");
});
test("Tr2CurveEulerRotation composes scalar curves with Carbon rotation order", () =>
{
  const curve = new Tr2CurveEulerRotation();
  curve.AddKey(0, vec3.fromValues(0.5, 0.6, 0.7), Tr2CurveInterpolation.LINEAR);
  curve.AddKey(2, vec3.fromValues(0, 0, 0), Tr2CurveInterpolation.LINEAR);
  const value = quat.create();
  curve.GetValue(0, value);
  assertAlmostEquals(value[0], 0.350018859);
  assertAlmostEquals(value[1], 0.123841502);
  assertAlmostEquals(value[2], 0.248718783);
  assertAlmostEquals(value[3], 0.894588768);
  assertEquals(curve.Length(), 2);
  const out = quat.create();
  curve.Update(0, out);
  assertAlmostEquals(out[0], 0.350018859);
  assertAlmostEquals(curve.currentValue[3], 0.894588768);
  const tangentCurve = new Tr2CurveEulerRotation();
  tangentCurve.AddKey(0, vec3.fromValues(1, 2, 3), Tr2CurveInterpolation.HERMITE, undefined, vec3.fromValues(9, 9, 9));
  assertAlmostEquals(tangentCurve.yaw.keys[0].rightTangent, 0);
  assertAlmostEquals(tangentCurve.pitch.keys[0].rightTangent, 0);
  assertAlmostEquals(tangentCurve.roll.keys[0].rightTangent, 0);
  assertEquals(CjsSchema.getField(Tr2CurveEulerRotation, "yaw")?.type.kind, "objectRef");
  assertEquals(CjsSchema.getField(Tr2CurveEulerRotation, "currentValue")?.type.kind, "quat");
});
test("Tr2CurveRandomAxisRotation spins between source random rotations", () =>
{
  const curve = new Tr2CurveRandomAxisRotation();
  quat.identity(curve.preRotation);
  quat.identity(curve.postRotation);
  curve.period = 2;
  const out = quat.create();
  const returned = curve.GetValueAt(0.5, out);
  assertEquals(returned, out);
  assertAlmostEquals(out[0], Math.SQRT1_2);
  assertAlmostEquals(out[1], 0);
  assertAlmostEquals(out[2], 0);
  assertAlmostEquals(out[3], Math.SQRT1_2);
  curve.Update(1, out);
  assertAlmostEquals(out[0], 1);
  assertAlmostEquals(curve.currentValue[0], 1);
  const dot = quat.fromValues(1, 2, 3, 4);
  assertEquals(curve.GetValueDotAt(0, dot), dot);
  assertEquals(dot[3], 4);
  const seededA = new Tr2CurveRandomAxisRotation();
  const seededB = new Tr2CurveRandomAxisRotation();
  seededA.SetSeed(123);
  seededB.SetSeed(123);
  assertEquals(seededA.GetSeed(), 123);
  const seededValueA = quat.create();
  const seededValueB = quat.create();
  seededA.GetValue(0, seededValueA);
  seededB.GetValue(0, seededValueB);
  assertAlmostEquals(seededValueA[0], seededValueB[0]);
  assertAlmostEquals(seededA.preRotation[0], -0.67845, 1e-5);
  assertAlmostEquals(seededA.preRotation[1], -0.117224, 1e-5);
  assertAlmostEquals(seededA.preRotation[2], 0.040517, 1e-5);
  assertAlmostEquals(seededA.preRotation[3], 0.724101, 1e-5);
  assertAlmostEquals(seededA.postRotation[0], 0.526664, 1e-5);
  assertAlmostEquals(seededA.postRotation[1], 0.498926, 1e-5);
  assertAlmostEquals(seededA.postRotation[2], -0.536559, 1e-5);
  assertAlmostEquals(seededA.postRotation[3], 0.431048, 1e-5);
  // Carbon (row-vector): post * pitch * pre with post applied FIRST, which is
  // gl pre . pitch . post (pitch is identity at t=0 here).
  assertAlmostEquals(seededValueA[0], 0.131596, 1e-5);
  assertAlmostEquals(seededValueA[1], -0.031946, 1e-5);
  assertAlmostEquals(seededValueA[2], -0.647817, 1e-5);
  assertAlmostEquals(seededValueA[3], 0.749663, 1e-5);
  assertEquals(CjsSchema.getField(Tr2CurveRandomAxisRotation, "currentValue")?.type.kind, "quat");
});
test("Tr2CurveConstant serves scalar, vector, quaternion, and color functions", () =>
{
  const curve = new Tr2CurveConstant();
  vec4.set(curve.value, 1, 2, 3, 4);
  assertEquals(curve.Update(0), 1);
  assertEquals(curve.GetValueAt(3), 1);
  const vectorOut = vec3.create();
  curve.Update(5, vectorOut);
  assertEquals(vectorOut[0], 1);
  assertEquals(vectorOut[1], 2);
  assertEquals(vectorOut[2], 3);
  const quatOut = quat.create();
  curve.GetValueAt(5, quatOut);
  assertEquals(quatOut[3], 4);
  curve.GetValueDotAt(5, quatOut);
  assertEquals(quatOut[3], 1);
  const colorOut = vec4.create();
  curve.GetValueAt(5, colorOut);
  assertEquals(colorOut[3], 4);
  const derivativeOut = vec3.fromValues(1, 1, 1);
  curve.GetValueDoubleDotAt(5, derivativeOut);
  assertEquals(derivativeOut[0], 0);
  assertEquals(CjsSchema.getField(Tr2CurveConstant, "value")?.type.kind, "vec4");
  assertEquals(CjsSchema.getField(Tr2CurveConstant, "currentValue")?.type.kind, "vec4");
});
test("Tr2QuaternionLerpCurve blends child quaternion functions", () =>
{
  const start = new Tr2CurveConstant();
  const end = new Tr2CurveConstant();
  vec4.set(start.value, 0, 0, 0, 1);
  vec4.set(end.value, 0, 0, 1, 0);
  const curve = new Tr2QuaternionLerpCurve();
  curve.start = 1;
  curve.length = 4;
  curve.startCurve = start;
  curve.endCurve = end;
  const out = quat.create();
  curve.GetValueAt(3, out);
  assertAlmostEquals(out[2], Math.SQRT1_2);
  assertAlmostEquals(out[3], Math.SQRT1_2);
  curve.Update(5, out);
  assertAlmostEquals(out[2], 1);
  assertAlmostEquals(curve.value[2], 1);
  assertEquals(curve.Length(), 4);
  const unchanged = quat.fromValues(1, 2, 3, 4);
  curve.length = 0;
  curve.GetValueAt(3, unchanged);
  assertEquals(unchanged[0], 1);
  assertEquals(CjsSchema.getField(Tr2QuaternionLerpCurve, "start")?.type.kind, "float64");
  assertEquals(CjsSchema.getField(Tr2QuaternionLerpCurve, "startCurve")?.type.kind, "objectRef");
});
test("Tr2CurveVector3Lerp blends into a child vector function", () =>
{
  const child = new Tr2CurveVector3();
  child.AddKey(0, vec3.fromValues(8, 4, 2), Tr2CurveInterpolation.LINEAR);
  child.AddKey(2, vec3.fromValues(16, 8, 4), Tr2CurveInterpolation.LINEAR);
  const curve = new Tr2CurveVector3Lerp();
  curve.curve = child;
  curve.curveStartTime = 2;
  vec3.copy(curve.initialValue, vec3.fromValues(0, 0, 0));
  const value = vec3.create();
  const hermite = curve.GetValue(0.5, value);
  assertAlmostEquals(hermite[0], 1.25);
  assertAlmostEquals(hermite[1], 0.625);
  curve.startInterpolation = Tr2CurveVector3LerpKeyInterpolation.LINEAR;
  const linear = curve.GetValue(0.5, value);
  assertAlmostEquals(linear[0], 2);
  assertAlmostEquals(linear[1], 1);
  const afterStart = curve.GetValue(3, value);
  assertAlmostEquals(afterStart[0], 12);
  assertAlmostEquals(afterStart[1], 6);
  const out = vec3.create();
  curve.Update(3, out);
  assertAlmostEquals(curve.currentValue[2], 3);
  const noCurve = new Tr2CurveVector3Lerp();
  vec3.copy(noCurve.initialValue, vec3.fromValues(1, 2, 3));
  noCurve.GetValueAt(9, out);
  assertEquals(out[2], 3);
  assertEquals(CjsSchema.getField(Tr2CurveVector3Lerp, "curve")?.type.kind, "objectRef");
  assertEquals(CjsSchema.getField(Tr2CurveVector3Lerp, "startInterpolation")?.type.kind, "uint32");
});
test("Tr2FollowCurve samples constant, linear, and hermite key segments", () =>
{
  const curve = new Tr2FollowCurve();
  curve.keys = [makeFollowKey(2, vec3.fromValues(4, 2, 0)), makeFollowKey(0, vec3.fromValues(0, 0, 0))];
  curve.Sort();
  const out = vec3.create();
  curve.GetValueAt(1, out);
  assertAlmostEquals(out[0], 2);
  assertAlmostEquals(out[1], 1);
  curve.Update(1, out);
  assertAlmostEquals(curve.currentValue[0], 2);
  curve.keys[0] = makeFollowKey(0, vec3.fromValues(10, 0, 0), Tr2FollowCurveKeyInterpolation.CONSTANT);
  curve.GetValueAt(1, out);
  assertAlmostEquals(out[0], 10);
  curve.keys = [makeFollowKey(0, vec3.fromValues(0, 0, 0), Tr2FollowCurveKeyInterpolation.HERMITE, vec3.create(), vec3.fromValues(1, 0, 0)), makeFollowKey(1, vec3.fromValues(1, 1, 0), Tr2FollowCurveKeyInterpolation.LINEAR, vec3.fromValues(0, 1, 0), vec3.create())];
  curve.GetValueAt(0.5, out);
  assertAlmostEquals(out[0], 0.625);
  assertAlmostEquals(out[1], 0.375);
  assertEquals(CjsSchema.getField(Tr2FollowCurve, "keys")?.type.kind, "list");
});
test("Tr2ObjectFollowCurveKey follows object and locator rotation", () =>
{
  const key = new Tr2ObjectFollowCurveKey();
  key.time = 5;
  vec3.copy(key.offset, vec3.fromValues(1, 0, 0));
  vec3.copy(key.leftTangent, vec3.fromValues(0, 1, 0));
  vec3.copy(key.rightTangent, vec3.fromValues(0, 0, 1));
  const out = vec3.create();
  key.GetValue(out);
  assertAlmostEquals(out[0], 1);
  assertAlmostEquals(out[1], 0);
  assertEquals(key.GetTime(), 5);
  assertEquals(key.GetInterpolationType(), Tr2FollowCurveKeyInterpolation.LINEAR);
  const z90 = quat.setAxisAngle(quat.create(), vec3.fromValues(0, 0, 1), Math.PI / 2);
  const locator = {
    position: vec3.fromValues(0, 2, 0),
    direction: z90
  };
  key.object = {
    worldPosition: vec3.fromValues(10, 20, 30),
    worldRotation: z90,
    locatorSets: [{
      name: "mount",
      locators: [locator]
    }]
  };
  key.offsetLocatorName = "mount";
  key.rotationSetting = Tr2ObjectFollowCurveKeyRotationSetting.LOCATOR_ROTATION;
  assert(key.Initialize());
  key.GetValue(out);
  assertAlmostEquals(out[0], 8);
  assertAlmostEquals(out[1], 21);
  assertAlmostEquals(out[2], 30);
  const tangent = vec3.create();
  key.GetLeftTangent(tangent);
  assertAlmostEquals(tangent[0], -1);
  assertAlmostEquals(tangent[1], 0);
  key.GetRightTangent(tangent);
  assertAlmostEquals(tangent[2], 1);
  key.rotationSetting = Tr2ObjectFollowCurveKeyRotationSetting.MODEL_ROTATION;
  key.GetValue(out);
  assertAlmostEquals(out[0], 8);
  assertAlmostEquals(out[1], 21);
  assertAlmostEquals(out[2], 30);
  assertEquals(CjsSchema.getField(Tr2ObjectFollowCurveKey, "object")?.type.kind, "objectRef");
  assertEquals(CjsSchema.getField(Tr2ObjectFollowCurveKey, "rotationSetting")?.type.kind, "int32");
});
test("Tr2RotationAdapter forwards curves and falls back to value", () =>
{
  const adapter = new Tr2RotationAdapter();
  quat.copy(adapter.value, quat.fromValues(0, 0, 1, 0));
  const out = quat.create();
  adapter.GetValueAt(0, out);
  assertAlmostEquals(out[2], 1);
  const child = new Tr2CurveQuaternion();
  child.AddKey(0, quat.create(), Tr2CurveInterpolation.LINEAR);
  child.AddKey(2, quat.fromValues(0, 0, 1, 0), Tr2CurveInterpolation.LINEAR);
  adapter.curve = child;
  adapter.ScaleTime(2);
  adapter.Update(2, out);
  assertAlmostEquals(out[2], Math.SQRT1_2);
  assertAlmostEquals(adapter.currentValue[3], Math.SQRT1_2);
  assertAlmostEquals(adapter.GetStartAwareLocalTime(10), 0);
  assertAlmostEquals(adapter.GetStartAwareLocalTime(12), 1);
  adapter.GetValueDotAt(2, out);
  assertAlmostEquals(out[3], 1);
  assertEquals(CjsSchema.getField(Tr2RotationAdapter, "curve")?.type.kind, "objectRef");
  assertEquals(CjsSchema.getField(Tr2RotationAdapter, "currentValue")?.type.kind, "quat");
});
test("Tr2TranslationAdapter forwards curves, rotates updates, and derives", () =>
{
  const adapter = new Tr2TranslationAdapter();
  vec3.copy(adapter.value, vec3.fromValues(1, 0, 0));
  quat.setAxisAngle(adapter.rotationOffset, vec3.fromValues(0, 0, 1), Math.PI / 2);
  const out = vec3.create();
  adapter.GetValueAt(0, out);
  assertAlmostEquals(out[0], 1);
  assertAlmostEquals(out[1], 0);
  adapter.Update(0, out);
  assertAlmostEquals(out[0], 0);
  assertAlmostEquals(out[1], 1);
  const child = new Tr2CurveVector3();
  child.AddKey(0, vec3.fromValues(0, 0, 0), Tr2CurveInterpolation.LINEAR);
  child.AddKey(1, vec3.fromValues(10, 0, 0), Tr2CurveInterpolation.LINEAR);
  adapter.curve = child;
  quat.identity(adapter.rotationOffset);
  adapter.GetValueAt(0.5, out);
  assertAlmostEquals(out[0], 5);
  adapter.GetValueDotAt(1, out);
  assertAlmostEquals(out[0], -10);
  assertAlmostEquals(adapter.GetStartAwareLocalTime(10), 0);
  assertAlmostEquals(adapter.GetStartAwareLocalTime(12), 2);
  adapter.GetValueDoubleDotAt(1, out);
  assertAlmostEquals(out[0], 0);
  assertEquals(CjsSchema.getField(Tr2TranslationAdapter, "rotationOffset")?.type.kind, "quat");
  assertEquals(CjsSchema.getField(Tr2TranslationAdapter, "currentValue")?.type.kind, "vec3");
});
test("Tr2DistanceTracker measures projected and signed distances", () =>
{
  const source = new Tr2CurveVector3();
  const target = new Tr2CurveVector3();
  source.AddKey(0, vec3.fromValues(1, 0, 0), Tr2CurveInterpolation.LINEAR);
  target.AddKey(0, vec3.fromValues(4, 0, 0), Tr2CurveInterpolation.LINEAR);
  const tracker = new Tr2DistanceTracker();
  tracker.sourceObject = source;
  tracker.targetObject = target;
  vec3.copy(tracker.direction, vec3.fromValues(1, 0, 0));
  tracker.UpdateValue(0);
  assertAlmostEquals(tracker.value, 3);
  assertAlmostEquals(tracker.sourcePosition[0], 1);
  assertAlmostEquals(tracker.targetPosition[0], 4);
  vec3.copy(tracker.direction, vec3.fromValues(-1, 0, 0));
  tracker.signedDistance = false;
  tracker.UpdateValue(0);
  assertAlmostEquals(tracker.value, 3);
  tracker.distanceToClosest = false;
  tracker.signedDistance = true;
  tracker.UpdateValue(0);
  assertAlmostEquals(tracker.value, -3);
  assert(tracker.UpdateValues({ time: 0, skipEvents: true }));
  assertEquals(CjsSchema.getField(Tr2DistanceTracker, "sourceObject")?.type.kind, "objectRef");
  assertEquals(CjsSchema.getField(Tr2DistanceTracker, "value")?.type.kind, "float32");
});
test("Tr2CurveColorMixer blends, saturates, brightens, and converts color", () =>
{
  const curve = new Tr2CurveColorMixer();
  vec4.copy(curve.color1, vec4.fromValues(1, 0, 0, 1));
  vec4.copy(curve.color2, vec4.fromValues(0, 0, 1, 0.5));
  curve.lerpValue = 0.5;
  curve.saturation = 0;
  curve.brightness = 2;
  const value = vec4.create();
  curve.GetValue(10, value);
  const intensity = 0.5 * 0.299 + 0 * 0.587 + 0.5 * 0.114;
  assertAlmostEquals(value[0], intensity * 2);
  assertAlmostEquals(value[1], intensity * 2);
  assertAlmostEquals(value[2], intensity * 2);
  assertAlmostEquals(value[3], intensity * 2);
  assertEquals(curve.Length(), 0);
  const out = vec4.create();
  curve.Update(10, out);
  assertAlmostEquals(curve.currentValue[0], intensity * 2);
  curve.UpdateValue(10);
  assertAlmostEquals(curve.convertedLinearValue[0], num.linearFromSRGB(intensity * 2));
  assertAlmostEquals(curve.convertedLinearValue[3], 1);
  assertEquals(CjsSchema.getField(Tr2CurveColorMixer, "color1")?.type.kind, "color");
  assertEquals(CjsSchema.getField(Tr2CurveColorMixer, "convertedLinearValue")?.type.kind, "color");
});
test("Tr2CurveCombiner sums vector functions and reports max length", () =>
{
  const combiner = new Tr2CurveCombiner();
  combiner.curves = [makeVectorCurve(vec3.fromValues(1, 2, 3), 2), makeVectorCurve(vec3.fromValues(4, 5, 6), 9)];
  const out = vec3.create();
  combiner.Update(1, out);
  assertEquals(out[0], 5);
  assertEquals(out[1], 7);
  assertEquals(out[2], 9);
  assertEquals(combiner.Length(), 9);
  assertEquals(CjsSchema.getField(Tr2CurveCombiner, "currentValue")?.type.kind, "vec3");
});
test("Tr2ScalarFader matches fade and kick-in behavior", () =>
{
  const fader = new Tr2ScalarFader();
  assert(fader.IsZero());
  fader.StartFade(true, 2);
  fader.Update({
    GetDeltaT: () => 0.5
  });
  assertAlmostEquals(fader.GetFaderValue(), 0.25);
  assert(!fader.IsKickInZero());
  assert(fader.GetKickInValue() > 0);
  fader.Update({
    GetDeltaT: () => 3
  });
  assertEquals(fader.GetFaderValue(), 1);
  assertEquals(CjsSchema.getField(Tr2ScalarFader, "kickInLength"), null);
});
test("Tr2CurveSetRange defaults match Carbon", () =>
{
  const range = new Tr2CurveSetRange();
  assertEquals(range.name, "");
  assertEquals(range.startTime, 0);
  assertEquals(range.endTime, 1);
  assertEquals(range.looped, false);
  assertEquals(CjsSchema.getField(Tr2CurveSetRange, "looped")?.type.kind, "boolean");
});
test("TriEventCurve sorts keys, fires forward events, and cycles", () =>
{
  const curve = new TriEventCurve();
  const events = [];
  curve.eventListener = {
    HandleEvent(value)
    {
      events.push(value);
    }
  };
  curve.AddKey(2, "two");
  curve.AddKey(1, "one");
  assertEquals(curve.GetKeyCount(), 2);
  assertEquals(curve.GetKeyTime(0), 1);
  assertEquals(curve.Length(), 2);
  curve.UpdateValue(0.5);
  assertEquals(events.length, 0);
  curve.UpdateValue(1);
  assertEquals(events[0], "one");
  assertEquals(curve.value, "one");
  curve.UpdateValue(2);
  assertEquals(events[1], "two");
  curve.UpdateValue(1.5);
  curve.UpdateValue(2);
  assertEquals(events[2], "one");
  assertEquals(events[3], "two");
  curve.SetKeyTime(0, 3);
  assertEquals(curve.GetKeyTime(1), 3);
  curve.SetKeyValue(1, "three");
  assertEquals(curve.GetKeyValue(1), "three");
  curve.RemoveKey(0);
  assertEquals(curve.GetKeyCount(), 1);
  const callableArgs = [];
  const callableCurve = new TriEventCurve();
  callableCurve.AddCallableKey(1, (...args) =>
  {
    callableArgs.push(...args);
  }, ["a", "b"]);
  TriEventCurve.clearPostUpdateCallbacks();
  callableCurve.UpdateValue(1);
  assertEquals(callableArgs.join(","), "");
  assertEquals(TriEventCurve.getPostUpdateCallbackCount(), 1);
  assertEquals(TriEventCurve.runNextPostUpdateCallback(), true);
  assertEquals(callableArgs.join(","), "a,b");
  assertEquals(TriEventCurve.runNextPostUpdateCallback(), false);
  assertEquals(TriEventCurve.flushPostUpdateCallbacks(), 0);
  const cycling = new TriEventCurve();
  const cycleEvents = [];
  cycling.eventListener = {
    HandleEvent: value => cycleEvents.push(value)
  };
  cycling.extrapolation = TriExtrapolation.TRIEXT_CYCLE;
  cycling.AddKey(0.5, "half");
  cycling.AddKey(2, "end");
  cycling.UpdateValue(0.5);
  cycling.UpdateValue(2.1);
  cycling.UpdateValue(2.5);
  assertEquals(cycleEvents.join(","), "half,half");
  assertEquals(CjsSchema.getField(TriEventCurve, "keys")?.type.kind, "list");
  assertEquals(CjsSchema.getField(TriEventCurve, "length")?.type.kind, "float32");
});
test("TriCurveSet plays, ranges, applies curves, and copies bindings", () =>
{
  const curveSet = new TriCurveSet();
  const samples = [];
  let resets = 0;
  let bindingCopies = 0;
  curveSet.playOnLoad = false;
  curveSet.scale = 2;
  const curve = {
    UpdateValue(time)
    {
      samples.push(time);
    },
    Reset()
    {
      resets++;
    },
    Length()
    {
      return 7;
    }
  };
  curveSet.AddCurve(curve);
  curveSet.AddBinding({
    CopyValue()
    {
      bindingCopies++;
    }
  });
  curveSet.PlayFrom(1);
  assertEquals(resets, 1);
  curveSet.Update(10);
  curveSet.Update(11);
  assertEquals(samples[0], 1);
  assertEquals(samples[1], 3);
  assertEquals(bindingCopies, 2);
  assertEquals(curveSet.GetMaxCurveDuration(), 7);
  curveSet.SetTimeRange(2, 4, true);
  curveSet.PlayFrom(0);
  curveSet.Update(20);
  curveSet.Update(22);
  assertEquals(curveSet.GetScaledTime(), 2);
  assert(curveSet.HasTimeRange());
  assertEquals(curveSet.GetTimeRange()[0], 2);
  curveSet.ResetTimeRange();
  assert(!curveSet.HasTimeRange());
  let stopped = false;
  curveSet.PlayFrom(0);
  curveSet.StopAfterWithCallback(1, () =>
  {
    stopped = true;
  });
  curveSet.Update(30);
  curveSet.Update(32);
  assert(stopped);
  assert(!curveSet.IsPlaying());
  const driven = new TriCurveSet();
  driven.playOnLoad = false;
  driven.driver = {
    GetCurveSetTime: time => time * 2
  };
  driven.PlayFrom(0);
  driven.Update(3);
  assertEquals(driven.GetScaledTime(), 6);
  assertEquals(CjsSchema.getField(TriCurveSet, "curves")?.type.kind, "list");
});
function makeVectorCurve(value, length)
{
  return {
    Length()
    {
      return length;
    },
    Update(_time, out)
    {
      return vec3.copy(out, value);
    },
    GetValueAt(_time, out)
    {
      return vec3.copy(out, value);
    },
    GetValueDotAt(_time, out)
    {
      return out;
    },
    GetValueDoubleDotAt(_time, out)
    {
      return out;
    }
  };
}
function TranslationMat4(x, y, z)
{
  const out = mat4.create();
  out[12] = x;
  out[13] = y;
  out[14] = z;
  return out;
}
function IsIdentityMat4(value)
{
  for (let i = 0; i < 16; i++)
  {
    const expected = i % 5 === 0 ? 1 : 0;
    if (value[i] !== expected)
    {
      return false;
    }
  }
  return true;
}
function makeFollowKey(time, value, interpolation = Tr2FollowCurveKeyInterpolation.LINEAR, leftTangent = vec3.create(), rightTangent = vec3.create())
{
  return {
    GetValue(out)
    {
      return vec3.copy(out, value);
    },
    GetTime()
    {
      return time;
    },
    GetInterpolationType()
    {
      return interpolation;
    },
    GetLeftTangent(out)
    {
      return vec3.copy(out, leftTangent);
    },
    GetRightTangent(out)
    {
      return vec3.copy(out, rightTangent);
    }
  };
}

test("HERMITE segments use correctly-ordered cubicHermite/Derivative (end value != end tangent)", () =>
{
  // end value (5) is deliberately != end tangent (3): with equal values a
  // swap of the endValue/endTangent arguments is undetectable.
  const k0 = { time: 0, value: 1, rightTangent: 2, leftTangent: 0, interpolation: Tr2CurveInterpolation.HERMITE };
  const k1 = { time: 1, value: 5, rightTangent: 0, leftTangent: 3, interpolation: Tr2CurveInterpolation.HERMITE };
  const length = k1.time - k0.time;

  for (const amount of [0.25, 0.5, 0.75])
  {
    const time = k0.time + amount * length;

    const expectedValue = num.cubicHermite(k0.value, k0.rightTangent * length, k1.value, k1.leftTangent * length, amount);
    const value = Tr2CurveScalar.getSegmentValue(time, k0, k1);
    assert(Math.abs(value - expectedValue) < 1e-9, `value @${amount}: ${value} vs ${expectedValue}`);

    const expectedTangent = num.cubicHermiteDerivative(k0.value, k0.rightTangent * length, k1.value, k1.leftTangent * length, amount) / length;
    const tangent = Tr2CurveScalar.getSegmentTangent(time, k0, k1);
    assert(Math.abs(tangent - expectedTangent) < 1e-9, `tangent @${amount}: ${tangent} vs ${expectedTangent}`);
  }

  // The test is sensitive: the wrong (swapped) argument order gives a
  // different interior value, so this coverage would fail on a regression.
  const swapped = num.cubicHermite(k0.value, k0.rightTangent * length, k1.leftTangent * length, k1.value, 0.25);
  const correct = num.cubicHermite(k0.value, k0.rightTangent * length, k1.value, k1.leftTangent * length, 0.25);
  assert(Math.abs(correct - swapped) > 1e-6, "swapped vs correct argument order must differ");

  // Endpoints pin to the authored values.
  assert(Math.abs(Tr2CurveScalar.getSegmentValue(0, k0, k1) - 1) < 1e-9, "start value");
  assert(Math.abs(Tr2CurveScalar.getSegmentValue(1, k0, k1) - 5) < 1e-9, "end value");
});
