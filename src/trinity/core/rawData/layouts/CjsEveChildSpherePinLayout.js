import { CjsSchema } from "#schema";
// Per-object constant-buffer layout for `EveChildSpherePinPerObjectData`. See README.md.

import { CjsConstantLayout } from "../CjsConstantLayout.js";


const { Identity: IDENTITY, Types } = CjsConstantLayout;


/** EveChildSpherePin.h:16 - the same field run as the ui pin.
 *
 * Modelled on: EveChildSpherePinPerObjectData (trinity/trinity/Eve/SpaceObject/Children/EveChildSpherePin.h:16)
 */
export class CjsEveChildSpherePinLayout
{
  static structConfig = Object.freeze({
    shared: {
        struct: "EveChildSpherePinPerObjectData",
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

CjsSchema.meta.define(CjsEveChildSpherePinLayout, {"className": "CjsEveChildSpherePinLayout"});
