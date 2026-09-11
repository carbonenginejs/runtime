// Per-object constant-buffer layouts for `EveChildBoosterSetVSData` and `EveChildBoosterSetPSData`. See README.md.

import { CjsConstantLayout } from "../CjsConstantLayout.js";


const { Identity: IDENTITY, Types } = CjsConstantLayout;


/**
 * EveChildBoosterSet.h:39-56. `worldMatrix` is written with SetAndTranspose
 * from the LOGICAL parent transform (Carbon Transpose at cpp:543);
 * `instanceOffset` is the ring-buffer frame offset the AL backend supplies.
 */
export class CjsEveChildBoosterSetLayout
{
  static structConfig = Object.freeze({
    vs: {
        struct: "EveChildBoosterSetVSData",
        fields: {
            worldMatrix: { type: Types.MATRIX4, default: IDENTITY },
            padding0: { type: Types.FLOAT },
            padding1: { type: Types.FLOAT },
            maxBoosterSize: { type: Types.FLOAT },
            instanceOffset: { type: Types.UINT32 }
        }
    },
    ps: {
        struct: "EveChildBoosterSetPSData",
        fields: {
            padding0: { type: Types.FLOAT },
            padding1: { type: Types.FLOAT },
            warpIntensity: { type: Types.FLOAT },
            padding2: { type: Types.FLOAT }
        }
    }
  });
}
