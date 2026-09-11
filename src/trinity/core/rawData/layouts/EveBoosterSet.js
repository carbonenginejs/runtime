// Per-object constant-data layout, one file per donor header.
//
// Declares the layouts for `EveBoosterSetVSData` and `EveBoosterSetPSData`.
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

import { IDENTITY, Types } from "../constantLayout.js";


/**
 * EveBoosterSet2.h:48-71 - a VertexShaderData + PixelShaderData pair uploaded
 * as two constant buffers (cpp:1325-1329). `boosterIntensity` is declared on
 * BOTH stages and written separately for each; it is not a duplicate. The
 * padding scalars are Carbon's explicit register pads and stay unwritten.
 */
export const EveBoosterSet = Object.freeze({
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
