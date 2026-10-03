// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildCloud2.h:125-145
import { CjsConstantLayout } from "../CjsConstantLayout.js";
const { Types } = CjsConstantLayout;

/** Native Cloud2 PerObjectData; 34 registers shared by vertex and pixel families. */
export class CjsEveChildCloud2Layout
{
  static structConfig = {
    shared: {
      struct: "EveChildCloud2PerObjectData",
      fields: {
        world: { type: Types.MATRIX4 },
        projectionInv: { type: Types.MATRIX4 },
        worldViewInv: { type: Types.MATRIX4 },
        lightmapDimensions: { type: Types.UINT32, count: 4 },
        noiseConfig: { type: Types.UINT32, count: 4 },
        sunDirection: { type: Types.VECTOR3 },
        depthSlice0: { type: Types.FLOAT },
        viewPosition: { type: Types.VECTOR3 },
        depthSlice1: { type: Types.FLOAT },
        viewDirection: { type: Types.VECTOR3 },
        depthSlice2: { type: Types.FLOAT },
        relativeScaling: { type: Types.VECTOR3 },
        lodFactor: { type: Types.FLOAT },
        targetInvSize: { type: Types.VECTOR2 },
        unused2: { type: Types.VECTOR2 },
        // Four LightData structs, each position.xyz/radius then color.rgb/innerRadius.
        lights: { type: Types.VECTOR4, count: 8 },
        mapOffsets: { type: Types.VECTOR4, count: 3 },
        lightViewProj: { type: Types.MATRIX4 }
      }
    }
  };
}
