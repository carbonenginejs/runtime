// Per-object constant-data layout, one file per donor header.
//
// Declares the layouts for `EveChildBoosterSetVSData` and `EveChildBoosterSetPSData`.
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
 * EveChildBoosterSet.h:39-56. `worldMatrix` is written with SetAndTranspose
 * from the LOGICAL parent transform (Carbon Transpose at cpp:543);
 * `instanceOffset` is the ring-buffer frame offset the AL backend supplies.
 */
export const EveChildBoosterSet = Object.freeze({
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
