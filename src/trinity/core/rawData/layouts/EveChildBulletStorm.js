// Per-object constant-data layout, one file per donor header.
//
// Declares the layout for `EveChildBulletStormPerObjectData`.
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
 * EveChildBulletStorm.h:20 - VS only. `targetPositionsWS` slots past the filled
 * target count stay allocator garbage (cpp:403-407); the bound is a bare
 * literal `[10]` in Carbon, not a named constant.
 */
export const EveChildBulletStorm = Object.freeze({
    vs: {
        struct: "EveChildBulletStormPerObjectData",
        fields: {
            worldTransform: { type: Types.MATRIX4, default: IDENTITY },
            effectInfo: { type: Types.VECTOR4 },
            targetPositionsWS: { type: Types.VECTOR4, count: 10 }
        }
    }
});
