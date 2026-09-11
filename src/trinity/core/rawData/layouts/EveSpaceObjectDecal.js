// Per-object constant-data layout, one file per donor header.
//
// Declares the layouts for `DecalVSPerObjectData` and `DecalPSPerObjectData`.
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

import { IDENTITY, Types, ZERO4 } from "../constantLayout.js";


/**
 * EveSpaceObjectDecal.h:27-45 - uploaded as two constant buffers
 * (cpp:975-976). `unused` shares clipRadius2Sq's register and is Carbon's
 * explicit pad; it is declared so the layout is right and never written.
 */
export const EveSpaceObjectDecal = Object.freeze({
    vs: {
        struct: "DecalVSPerObjectData",
        fields: {
            worldMatrix: { type: Types.MATRIX4, default: IDENTITY },
            invWorldMatrix: { type: Types.MATRIX4, default: IDENTITY },
            decalMatrix: { type: Types.MATRIX4, default: IDENTITY },
            inverseDecalMatrix: { type: Types.MATRIX4, default: IDENTITY },
            parentBoneMatrix: { type: Types.MATRIX4, default: IDENTITY },
            invParentBoneMatrix: { type: Types.MATRIX4, default: IDENTITY }
        }
    },
    ps: {
        struct: "DecalPSPerObjectData",
        fields: {
            // .x killCount (a uint widened to float), .y the 0..1 visibility
            // ramp, .zw reserved (cpp:369-382).
            displayData: { type: Types.VECTOR4 },
            shipData: { type: Types.VECTOR4 },
            clipData: { type: Types.VECTOR4 },
            clipRadius2Sq: { type: Types.FLOAT },
            unused: { type: Types.VECTOR3 },
            shLightingCoefficients: { type: Types.VECTOR4, count: 7, default: ZERO4 }
        }
    }
});
