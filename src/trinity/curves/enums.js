// Source: trinity/trinity/Curves/Tr2CurveScalar.h
// Source: trinity/trinity/Curves/Tr2CurveVector3Lerp.h
// Source: trinity/trinity/Curves/Tr2FollowCurveKey.h
import { blue, EnumRegistrationType } from "#blue";

export const Tr2CurveInterpolation = Object.freeze({
  CONSTANT: 0,
  LINEAR: 1,
  HERMITE: 2
});
export const Tr2CurveTangentType = Object.freeze({
  AUTO_CLAMP: 0,
  AUTO: 1,
  FREE_JOINED: 2,
  FREE_SPLIT: 3
});
export const Tr2CurveExtrapolation = Object.freeze({
  CLAMP: 0,
  CYCLE: 1,
  MIRROR: 2,
  LINEAR: 3
});
export const Tr2CurveVector3LerpKeyInterpolation = Object.freeze({
  LINEAR: 1,
  HERMITE: 2
});
export const Tr2FollowCurveKeyInterpolation = Object.freeze({
  CONSTANT: 0,
  LINEAR: 1,
  HERMITE: 2
});
export const RotationSetting = Object.freeze({
  NO_ROTATION: 0,
  MODEL_ROTATION: 1,
  LOCATOR_ROTATION: 2
});
export const Tr2ObjectFollowCurveKeyRotationSetting = RotationSetting;

// Registered as Carbon registers them (Tr2CurveScalar_Blue.cpp:55-57,
// Tr2CurveVector3Lerp_Blue.cpp:17, Tr2FollowCurveKey_Blue.cpp:38-39).
blue.enums.RegisterEnum("trinity.Tr2CurveExtrapolation", Tr2CurveExtrapolation, {
  source: "trinity/trinity/Curves/Tr2CurveScalar.h", family: "curves", line: 38,
  exposedName: "Tr2CurveExtrapolation", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Curves/Tr2CurveScalar_Blue.cpp:38",
  chooser: [
    { name: "CLAMP", value: Tr2CurveExtrapolation.CLAMP, description: "Use start/end values" },
    { name: "CYCLE", value: Tr2CurveExtrapolation.CYCLE, description: "Cycle the curve" },
    { name: "MIRROR", value: Tr2CurveExtrapolation.MIRROR, description: "Mirror the curve" },
    { name: "LINEAR", value: Tr2CurveExtrapolation.LINEAR, description: "Linear exprapolation based on first/last key tangent" }
  ]
});

blue.enums.RegisterEnum("trinity.Tr2CurveInterpolation", Tr2CurveInterpolation, {
  source: "trinity/trinity/Curves/Tr2CurveScalar.h", family: "curves", line: 8,
  exposedName: "Tr2CurveInterpolation", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Curves/Tr2CurveScalar_Blue.cpp:9",
  chooser: [
    { name: "CONSTANT", value: Tr2CurveInterpolation.CONSTANT, description: "Performs a constant interpolation" },
    { name: "LINEAR", value: Tr2CurveInterpolation.LINEAR, description: "Performs a linear interpolation" },
    { name: "HERMITE", value: Tr2CurveInterpolation.HERMITE, description: "Performs a hermite interpolation" }
  ]
});

blue.enums.RegisterEnum("trinity.Tr2CurveTangentType", Tr2CurveTangentType, {
  source: "trinity/trinity/Curves/Tr2CurveScalar.h", family: "curves", line: 22,
  exposedName: "Tr2CurveTangentType", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Curves/Tr2CurveScalar_Blue.cpp:22",
  chooser: [
    { name: "AUTO_CLAMP", value: Tr2CurveTangentType.AUTO_CLAMP, description: "Automatically adjust tangents clamping overshoots" },
    { name: "AUTO", value: Tr2CurveTangentType.AUTO, description: "Automatically adjust tangents" },
    { name: "FREE_JOINED", value: Tr2CurveTangentType.FREE_JOINED, description: "Manually adjusted unified tangents" },
    { name: "FREE_SPLIT", value: Tr2CurveTangentType.FREE_SPLIT, description: "Manually adjusted broken tangents" }
  ]
});

blue.enums.RegisterEnum("trinity.Tr2CurveVector3LerpKeyInterpolation", Tr2CurveVector3LerpKeyInterpolation, {
  source: "trinity/trinity/Curves/Tr2CurveVector3Lerp.h", family: "curves", line: 10,
  exposedName: "Tr2CurveVector3LerpKeyInterpolation", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Curves/Tr2CurveVector3Lerp_Blue.cpp:7",
  chooser: [
    { name: "LINEAR", value: Tr2CurveVector3LerpKeyInterpolation.LINEAR, description: "Performs a linear interpolation" },
    { name: "HERMITE", value: Tr2CurveVector3LerpKeyInterpolation.HERMITE, description: "Performs a hermite interpolation" }
  ]
});

blue.enums.RegisterEnum("trinity.Tr2FollowCurveKeyInterpolation", Tr2FollowCurveKeyInterpolation, {
  source: "trinity/trinity/Curves/Tr2FollowCurveKey.h", family: "curves", line: 9,
  exposedName: "Tr2FollowCurveKeyInterpolation", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Curves/Tr2FollowCurveKey_Blue.cpp:24",
  chooser: [
    { name: "CONSTANT", value: Tr2FollowCurveKeyInterpolation.CONSTANT, description: "Performs a constant interpolation" },
    { name: "LINEAR", value: Tr2FollowCurveKeyInterpolation.LINEAR, description: "Performs a linear interpolation" },
    { name: "HERMITE", value: Tr2FollowCurveKeyInterpolation.HERMITE, description: "Performs a hermite interpolation" }
  ]
});

// Carbon's chooser lists LOCATOR_ROTATION before MODEL_ROTATION.
blue.enums.RegisterEnum("trinity.Tr2ObjectFollowCurveKey.RotationSetting", RotationSetting, {
  source: "trinity/trinity/Curves/Tr2FollowCurveKey.h", family: "curves", line: 41,
  exposedName: "Tr2ObjectFollowCurveKeyRotationSetting", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Curves/Tr2FollowCurveKey_Blue.cpp:11",
  chooser: [
    { name: "NO_ROTATION", value: RotationSetting.NO_ROTATION, description: "No Rotation" },
    { name: "LOCATOR_ROTATION", value: RotationSetting.LOCATOR_ROTATION, description: "Locator rotation" },
    { name: "MODEL_ROTATION", value: RotationSetting.MODEL_ROTATION, description: "Model rotation" }
  ]
});
