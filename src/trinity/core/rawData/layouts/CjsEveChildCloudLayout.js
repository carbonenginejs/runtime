// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildCloud.cpp:48-58
import { CjsConstantLayout } from "../CjsConstantLayout.js";

const { Types } = CjsConstantLayout;

/** Native legacy cloud VS payload; field order is the shader ABI. */
export class CjsEveChildCloudLayout
{
  static structConfig = {
    vs: {
      struct: "EveChildCloudPerObjectData",
      fields: {
        world: { type: Types.MATRIX4 },
        worldView: { type: Types.MATRIX4 },
        worldViewInv: { type: Types.MATRIX4 },
        projectionInv: { type: Types.MATRIX4 },
        nearPlaneLocal: { type: Types.VECTOR4 },
        eyePosLocal: { type: Types.VECTOR3 },
        screenDepth: { type: Types.FLOAT },
        screenSize: { type: Types.VECTOR4 }
      }
    }
  };
}
