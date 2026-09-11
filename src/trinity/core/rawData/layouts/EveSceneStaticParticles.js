// Per-object constant-data layout, one file per donor header.
//
// Declares the layout for `EveSceneStaticParticlesPerObjectData`.
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


/** EveSceneStaticParticles.h:105 */
export const EveSceneStaticParticles = Object.freeze({
    vs: {
        struct: "EveSceneStaticParticlesPerObjectData",
        fields: {
            world: { type: Types.MATRIX4, default: IDENTITY },
            lastWorld: { type: Types.MATRIX4, default: IDENTITY }
        }
    }
});
