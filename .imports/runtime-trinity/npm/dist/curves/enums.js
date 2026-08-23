// Source: E:\carbonengine\trinity\trinity\Curves\Tr2CurveScalar.h

const Tr2CurveInterpolation = Object.freeze({
  CONSTANT: 0,
  LINEAR: 1,
  HERMITE: 2
});
const Tr2CurveTangentType = Object.freeze({
  AUTO_CLAMP: 0,
  AUTO: 1,
  FREE_JOINED: 2,
  FREE_SPLIT: 3
});
const Tr2CurveExtrapolation = Object.freeze({
  CLAMP: 0,
  CYCLE: 1,
  MIRROR: 2,
  LINEAR: 3
});
const Tr2CurveVector3LerpKeyInterpolation = Object.freeze({
  LINEAR: 1,
  HERMITE: 2
});
const Tr2FollowCurveKeyInterpolation = Object.freeze({
  CONSTANT: 0,
  LINEAR: 1,
  HERMITE: 2
});
const RotationSetting = Object.freeze({
  NO_ROTATION: 0,
  MODEL_ROTATION: 1,
  LOCATOR_ROTATION: 2
});
const Tr2ObjectFollowCurveKeyRotationSetting = RotationSetting;

export { RotationSetting, Tr2CurveExtrapolation, Tr2CurveInterpolation, Tr2CurveTangentType, Tr2CurveVector3LerpKeyInterpolation, Tr2FollowCurveKeyInterpolation, Tr2ObjectFollowCurveKeyRotationSetting };
//# sourceMappingURL=enums.js.map
