// Per-object constant-buffer layouts for `EveBoosterSetVSData` and `EveBoosterSetPSData`. See README.md.

import { CjsConstantLayout } from "../CjsConstantLayout.js";


const { Identity: IDENTITY, Types } = CjsConstantLayout;


/**
 * EveBoosterSet2.h:48-71 - a VertexShaderData + PixelShaderData pair uploaded
 * as two constant buffers (cpp:1325-1329). `boosterIntensity` is declared on
 * BOTH stages and written separately for each; it is not a duplicate. The
 * padding scalars are Carbon's explicit register pads and stay unwritten.
 */
export class CjsEveBoosterSetLayout
{
  static structConfig = Object.freeze({
    vs: {
        struct: "EveBoosterSetVSData",
        fields: {
            shipMatrix: { type: Types.MATRIX4, default: IDENTITY },
            boosterIntensity: { type: Types.FLOAT },
            shipSpeed: { type: Types.FLOAT },
            maxBoosterSize: { type: Types.FLOAT },
            padding: { type: Types.FLOAT },
            // EVE_MAX_CONTROL_POINT_COUNT (EveBoosterSet2.h:36)
            trailsControlPositions: { type: Types.VECTOR4, count: 5 },
            trailsControlNormals: { type: Types.VECTOR4, count: 5 }
        }
    },
    ps: {
        struct: "EveBoosterSetPSData",
        fields: {
            boosterIntensity: { type: Types.FLOAT },
            trailIntensity: { type: Types.FLOAT },
            warpIntensity: { type: Types.FLOAT },
            padding2: { type: Types.FLOAT }
        }
    }
  });
}
