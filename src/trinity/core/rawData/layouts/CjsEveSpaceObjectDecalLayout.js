// Per-object constant-buffer layouts for `DecalVSPerObjectData` and `DecalPSPerObjectData`. See README.md.

import { CjsConstantLayout } from "../CjsConstantLayout.js";


const { Identity: IDENTITY, Types, Zero4: ZERO4 } = CjsConstantLayout;


/**
 * EveSpaceObjectDecal.h:27-45 - uploaded as two constant buffers
 * (cpp:975-976). `unused` shares clipRadius2Sq's register and is Carbon's
 * explicit pad; it is declared so the layout is right and never written.
 */
export class CjsEveSpaceObjectDecalLayout
{
  static structConfig = Object.freeze({
    vs: {
        struct: "DecalVSPerObjectData",
        fields: {
            worldMatrix: { type: Types.MATRIX4, default: IDENTITY },
            invWorldMatrix: { type: Types.MATRIX4, default: IDENTITY },
            decalMatrix: { type: Types.MATRIX4, default: IDENTITY },
            inverseDecalMatrix: { type: Types.MATRIX4, default: IDENTITY },
            parentBoneMatrix: { type: Types.MATRIX4, default: IDENTITY },
            invParentBoneMatrix: { type: Types.MATRIX4, default: IDENTITY }
        }
    },
    ps: {
        struct: "DecalPSPerObjectData",
        fields: {
            // .x killCount (a uint widened to float), .y the 0..1 visibility
            // ramp, .zw reserved (cpp:369-382).
            displayData: { type: Types.VECTOR4 },
            shipData: { type: Types.VECTOR4 },
            clipData: { type: Types.VECTOR4 },
            clipRadius2Sq: { type: Types.FLOAT },
            unused: { type: Types.VECTOR3 },
            shLightingCoefficients: { type: Types.VECTOR4, count: 7, default: ZERO4 }
        }
    }
  });
}
