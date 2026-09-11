// Per-object constant-data layout, one file per donor header.
//
// Declares the layout for `EveSpacePerObjectData`.
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
 * EveSpaceObject2.h:143 - the merged VS+PS variant used by the instanced path.
 * Uploaded through a STRUCTURED BUFFER rather than a constant buffer
 * (EveInstancedMeshManager.cpp:69-77), so it carries no register.
 *
 * Field order is NOT the same as the EveSpaceObject VS/PS pair: the five clip
 * scalars sit at fields 6-10 here, before the ellipsoid. Since the upload is a
 * raw memcpy, that order is the contract.
 */
export const EveSpacePerObject = Object.freeze({
    shared: {
        struct: "EveSpacePerObjectData",
        fields: {
            worldTransform: { type: Types.MATRIX4, default: IDENTITY },
            worldTransformLast: { type: Types.MATRIX4, default: IDENTITY },
            invWorldTransform: { type: Types.MATRIX4, default: IDENTITY },
            // This struct's own initialiser is (0,0,0,0), unlike the
            // EveSpaceObject2 constructor's (1,1,0,1).
            shipData: { type: Types.VECTOR4 },
            clipSphereCenter: { type: Types.VECTOR3 },
            clipRadiusSq: { type: Types.FLOAT },
            clipRadius2Sq: { type: Types.FLOAT },
            impactDataOffset: { type: Types.FLOAT },
            clipSphereFactor2: { type: Types.FLOAT },
            clipSphereFactor: { type: Types.FLOAT },
            ellpsoidRadii: { type: Types.VECTOR4 },
            ellpsoidCenter: { type: Types.VECTOR4 },
            // EveSpaceObject2.h:160 initialises this to all-zero, contradicting
            // EveCustomMask::ZeroPerObjectData's IdentityMatrix. The zero path
            // is the live one, so identity wins; reproduced as written.
            customMaskMatrix: { type: Types.MATRIX4, count: 2, default: IDENTITY },
            customMaskData: { type: Types.VECTOR4, count: 2 },
            customMaskMaterialIDs: { type: Types.VECTOR4, count: 2 },
            customMaskTargets: { type: Types.VECTOR4, count: 2 },
            customMaskClamps: { type: Types.VECTOR4 },
            boneOffsets: { type: Types.UINT32, count: 4 },
            customData: { type: Types.VECTOR4 },
            shLighting: { type: Types.VECTOR4, count: 7, default: ZERO4 }
        }
    }
});
