// Source: trinity/trinity/Eve/EveSpaceScene.h:336-340 (EvePlanetPerObjData).
import { CjsConstantLayout } from "../CjsConstantLayout.js";


/** The two world-space planet spheres read by the screen-space shadow resolve. */
export class CjsEveSpaceSceneLayout
{
  static structConfig = Object.freeze({
    ps: {
      struct: "EvePlanetPerObjData",
      fields: {
        planetSphere: { type: CjsConstantLayout.Types.VECTOR4, count: 2 }
      }
    }
  });
}
