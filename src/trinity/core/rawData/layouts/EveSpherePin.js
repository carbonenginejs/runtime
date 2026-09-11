// Per-object constant-data layout, one file per donor header.
//
// Declares the layout for `EveSpherePinPerObjectData`.
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


/** EveSpherePin.h:25 - the ui variant (EveSpherePin.cpp:415-425). */
export const EveSpherePin = Object.freeze({
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
