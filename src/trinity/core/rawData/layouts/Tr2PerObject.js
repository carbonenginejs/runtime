// Per-object constant-data layout, one file per donor header.
//
// Declares the layout for `Tr2PerObjectVSData`.
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
 * Tr2ConstantBufferFormats.h:35. Catalogued but deliberately PRODUCERLESS in
 * this package: its only Carbon filler is `Tr2InteriorPlaceable::GetPerObjectData`
 * (Interior/Tr2InteriorPlaceable.cpp:555-585), and interior placeables are not
 * Trinity-layer classes. The layout lives here because the catalog is the
 * org-wide truth, exported on the `/perobject` subpath; whichever package ports
 * the placeable consumes it from there rather than redeclaring it.
 */
export const Tr2PerObject = Object.freeze({
    vs: {
        struct: "Tr2PerObjectVSData",
        fields: {
            WorldMat: { type: Types.MATRIX4, default: IDENTITY },
            boundingCylinderLocalHeight: { type: Types.FLOAT },
            boundingCylinderLocalXZCenter: { type: Types.VECTOR2 },
            boundingCylinderRotation: { type: Types.FLOAT }
        }
    }
});
