// Per-object constant-buffer layouts for `EveTurretSetVSData` and `EveTurretSetPSData`. See README.md.

import { CjsConstantLayout } from "../CjsConstantLayout.js";


const { Identity: IDENTITY, Types, Zero4: ZERO4 } = CjsConstantLayout;


/**
 * EveTurretSet.h:47 (vs) / :63 (ps). The turret translation and rotation rings
 * are filled for VISIBLE turrets only; the remainder stays allocator garbage.
 */
export class CjsEveTurretSetLayout
{
  static structConfig = Object.freeze({
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
}
