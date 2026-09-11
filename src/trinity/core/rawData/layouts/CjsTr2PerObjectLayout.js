// Per-object constant-buffer layout for `Tr2PerObjectVSData`. See README.md.

import { CjsConstantLayout } from "../CjsConstantLayout.js";


const { Identity: IDENTITY, Types } = CjsConstantLayout;


/**
 * Tr2ConstantBufferFormats.h:35. Catalogued but deliberately PRODUCERLESS in
 * this package: its only Carbon filler is `Tr2InteriorPlaceable::GetPerObjectData`
 * (Interior/Tr2InteriorPlaceable.cpp:555-585), and interior placeables are not
 * Trinity-layer classes. The layout lives here because the catalog is the
 * org-wide truth, exported on the `/perobject` subpath; whichever package ports
 * the placeable consumes it from there rather than redeclaring it.
 */
export class CjsTr2PerObjectLayout
{
  static structConfig = Object.freeze({
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
}
