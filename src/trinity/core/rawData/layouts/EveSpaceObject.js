// Per-object constant-data layout, one file per donor header.
//
// Declares the layouts for `EveSpaceObjectVSData` and `EveSpaceObjectPSData`.
//
// SEVERAL DECLARATIONS IN ONE FILE, which the one-class-per-file rule does not
// cover and deliberately so: these are not classes. A Carbon header declares
// every struct a producer uploads, and they are read and changed together, so
// the file follows the header rather than the declaration.
//
// Field ORDER and field SIZE are the whole binding contract - Carbon memcpys the
// C++ struct straight into the constant buffer, so its declaration order IS the
// byte layout the shader reads. Renaming a field is safe; reordering or resizing
// one silently shifts every field after it. Every matrix here is TRANSPOSED,
// matching Carbon's `= Transpose(m)` staging fill.

import { IDENTITY, Types, ZERO4 } from "../constantLayout.js";


/**
 * EveSpaceObject2.h:99 (vs) / :122 (ps) - the persistent pair. Unlike every
 * other entry here these live as members on the owner across frames and are
 * READ BACK (GetParentData cpp:1877-1883, GetPerObjectStructs cpp:1485-1490),
 * which is why the record exposes Get accessors at all.
 *
 * The HLSL counterpart names are from shadercompiler/tests/RayTracingTest.cpp:654-666,
 * which declares this block field-for-field.
 */
export const EveSpaceObject = Object.freeze({
    vs: {
        struct: "EveSpaceObjectVSData",
        fields: {
            worldTransform: { type: Types.MATRIX4, default: IDENTITY },
            worldTransformLast: { type: Types.MATRIX4, default: IDENTITY },
            invWorldTransform: { type: Types.MATRIX4, default: IDENTITY },
            // Four independent floats, not a bitfield: .x booster glow
            // intensity, .y activation strength, .z dirt level, .w bounding
            // sphere radius. Constructor value at cpp:195.
            shipData: { type: Types.VECTOR4, default: Object.freeze([1, 1, 0, 1]) },
            clipData: { type: Types.VECTOR4 },
            // Carbon's spelling (sic) - "ellpsoid" matches the source struct.
            ellpsoidRadii: { type: Types.VECTOR4 },
            ellpsoidCenter: { type: Types.VECTOR4 },
            // EVE_SPACEOBJECT_CUSTOWMASK_MAX (sic) = 2, EveSpaceObject2.h:49.
            // EveCustomMask::ZeroPerObjectData writes IDENTITY into an unused
            // slot, not zero (EveCustomMask.cpp:88-93).
            customMaskMatrix: { type: Types.MATRIX4, count: 2, default: IDENTITY },
            customMaskData: { type: Types.VECTOR4, count: 2 },
            // GPU ring offsets - engine-owned, no CPU derivation exists.
            boneOffsets: { type: Types.UINT32, count: 4 },
            morphTargetVertexDataOffset: { type: Types.UINT32 },
            morphTargetAnimationDataOffset: { type: Types.UINT32 },
            activeMorphTargetsCount: { type: Types.UINT32 },
            bakedMorphTargetVertexDataOffset: { type: Types.UINT32 },
            customData: { type: Types.VECTOR4, default: Object.freeze([0, 0, 0, 0]) }
        }
    },
    ps: {
        struct: "EveSpaceObjectPSData",
        fields: {
            worldTransform: { type: Types.MATRIX4, default: IDENTITY },
            worldTransformLast: { type: Types.MATRIX4, default: IDENTITY },
            invWorldTransform: { type: Types.MATRIX4, default: IDENTITY },
            shipData: { type: Types.VECTOR4, default: Object.freeze([1, 1, 0, 1]) },
            // Clipdata1.xyz / .w - a SIGNED squared radius; the sign carries
            // the inside/outside test (RayTracingTest.cpp:678-679).
            clipSphereCenter: { type: Types.VECTOR3 },
            clipRadiusSq: { type: Types.FLOAT },
            // Miscdata.xyzw - all four lanes used.
            clipRadius2Sq: { type: Types.FLOAT },
            impactDataOffset: { type: Types.FLOAT },
            clipSphereFactor2: { type: Types.FLOAT },
            clipSphereFactor: { type: Types.FLOAT },
            // Tr2ShLightingManager::PACKED_COEFFICIENT_COUNT = 7.
            shLightingCoefficients: { type: Types.VECTOR4, count: 7, default: ZERO4 },
            customMaskMaterialIDs: { type: Types.VECTOR4, count: 2 },
            customMaskTargets: { type: Types.VECTOR4, count: 2 },
            // Both slots packed into one vec4: (u0, v0, u1, v1).
            customMaskClamps: { type: Types.VECTOR4 },
            // EveSpaceObject2 never writes this; the children's literal is the
            // only documented neutral (EveChildMesh.cpp:65).
            screenSize: { type: Types.VECTOR4, default: Object.freeze([0.5, 0.5, 0.5, 1]) },
            customData: { type: Types.VECTOR4, default: Object.freeze([0, 0, 0, 0]) }
        }
    }
});
