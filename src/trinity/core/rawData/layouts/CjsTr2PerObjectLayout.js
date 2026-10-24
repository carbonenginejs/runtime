import { CjsSchema } from "#schema";
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
 *
 * Modelled on: Tr2PerObjectVSData (trinity/trinity/Tr2ConstantBufferFormats.h:35)
 */
export class CjsTr2PerObjectLayout
{
  /**
   * Interior/Tr2InteriorConstantBufferFormats.h:37-48. The ten six-register
   * light structs form one packed span; the native character light producer
   * writes those lanes without adding a nested layout mechanism.
   */
  static interiorStructConfig = Object.freeze({
    ps: {
      struct: "Tr2InteriorPerObjectPSData",
      fields: {
        lightCount: { type: Types.INT32 },
        padding: { type: Types.INT32, count: 3 },
        pointLights: { type: Types.VECTOR4, count: 60 },
        shadowCaster0: { type: Types.VECTOR4 },
        shadowCaster1: { type: Types.VECTOR4 },
        spotLights: { type: Types.MATRIX4, count: 4 }
      }
    }
  });

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

CjsSchema.meta.define(CjsTr2PerObjectLayout, {"className": "CjsTr2PerObjectLayout"});
