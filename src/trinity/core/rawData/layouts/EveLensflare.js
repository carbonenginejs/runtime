// Per-object constant-data layout, one file per donor header.
//
// Declares the layout for `EveLensflarePerObjectData`.
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
 * EveLensflare.cpp:41-45 - same bytes bound to VS and PS. `indices[2..3]` are
 * never written in Carbon and are left as allocator garbage.
 */
export const EveLensflare = Object.freeze({
    shared: {
        struct: "EveLensflarePerObjectData",
        fields: {
            directionScale: { type: Types.VECTOR4 },
            indices: { type: Types.UINT32, count: 4 }
        }
    }
});
