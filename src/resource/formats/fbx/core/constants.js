/** Standard FBX Model Properties70 fields interpreted by the geometry reader. */
export const FBX_MODEL_TRANSFORM_PROPERTY_NAMES = Object.freeze([
    "Lcl Translation",
    "Lcl Rotation",
    "Lcl Scaling",
    "InheritType",
    "GeometricTranslation",
    "GeometricRotation",
    "GeometricScaling",
    "RotationOrder",
    "RotationPivot",
    "ScalingPivot",
    "RotationOffset",
    "PreRotation",
    "PostRotation",
    "ScalingOffset"
]);

/** Properties that cannot safely share the bone Properties70 namespace with masks. */
export const FBX_RESERVED_BONE_MASK_PROPERTY_NAMES = Object.freeze([
    ...FBX_MODEL_TRANSFORM_PROPERTY_NAMES,
    "CjsSkeletonName"
]);
