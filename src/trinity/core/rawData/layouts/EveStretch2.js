// Per-object constant-data layout, one file per donor header.
//
// Declares the layout for `EveStretch2PerObjectData`.
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

import { Types } from "../constantLayout.js";


/**
 * EveStretch2.cpp:327-337 - Carbon uploads the contiguous member run
 * m_source..m_effectData[2] (EveStretch2.h:105-109) as four vec4s to VS and PS.
 */
export const EveStretch2 = Object.freeze({
    shared: {
        struct: "EveStretch2PerObjectData",
        fields: {
            sourceData: { type: Types.VECTOR4 },
            destinationData: { type: Types.VECTOR4 },
            effectData: { type: Types.VECTOR4, count: 2 }
        }
    }
});
