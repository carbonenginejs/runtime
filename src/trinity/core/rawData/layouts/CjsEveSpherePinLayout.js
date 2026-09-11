// Per-object constant-buffer layout for `EveSpherePinPerObjectData`. See README.md.

import { CjsConstantLayout } from "../CjsConstantLayout.js";


const { Identity: IDENTITY, Types } = CjsConstantLayout;


/** EveSpherePin.h:25 - the ui variant (EveSpherePin.cpp:415-425). */
export class CjsEveSpherePinLayout
{
  static structConfig = Object.freeze({
    shared: {
        struct: "EveSpherePinPerObjectData",
        fields: {
            worldMatrix: { type: Types.MATRIX4, default: IDENTITY },
            pinPosition: { type: Types.VECTOR4 },
            pinRotation: { type: Types.VECTOR4 },
            pinColor: { type: Types.VECTOR4 },
            pinThreshold: { type: Types.VECTOR4 },
            pinRadiusPrecalc: { type: Types.VECTOR4 },
            pinUV: { type: Types.VECTOR4 }
        }
    }
  });
}
