// Per-object constant-data layout, one file per donor header.
//
// Declares the layouts for `EveTurretSetVSData` and `EveTurretSetPSData`.
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
 * EveTurretSet.h:47 (vs) / :63 (ps). The turret translation and rotation rings
 * are filled for VISIBLE turrets only; the remainder stays allocator garbage.
 */
export const EveTurretSet = Object.freeze({
    vs: {
        struct: "EveTurretSetVSData",
        fields: {
            baseCutoffData: { type: Types.VECTOR4 },
            turretSetData: { type: Types.VECTOR4 },
            shipMatrix: { type: Types.MATRIX4, default: IDENTITY },
            prevShipMatrix: { type: Types.MATRIX4, default: IDENTITY },
            // GPU bone-ring offsets - engine-owned.
            currentBoneOffset: { type: Types.UINT32 },
            prevBoneOffset: { type: Types.UINT32 },
            _unused: { type: Types.UINT32, count: 2 },
            // EVE_MAX_TURRETS_PER_SET (EveTurretSet.h:43)
            turretTranslation: { type: Types.VECTOR4, count: 24 },
            turretRotation: { type: Types.QUATERNION, count: 24 }
        }
    },
    ps: {
        struct: "EveTurretSetPSData",
        fields: {
            shipData: { type: Types.VECTOR4 },
            clipData1: { type: Types.VECTOR4 },
            clipRadius2Sq: { type: Types.FLOAT },
            unused: { type: Types.VECTOR3 },
            shLightingCoefficients: { type: Types.VECTOR4, count: 7, default: ZERO4 }
        }
    }
});
