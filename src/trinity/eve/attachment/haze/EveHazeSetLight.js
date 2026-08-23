// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveHazeSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveHazeSet.cpp
import { CjsModel } from "#model";
import { mat4 } from "#math/mat4";
import { io, type } from "#schema";
import { CjsLightData } from "../../lights/CjsLightData.js";


/**
 * The light one haze item contributes, carrying its booster-gain influence flag,
 * light profile and the bone matrix resolved for it each frame.
 */
@type.define({ className: "EveHazeSetLight", family: "eve/attachment/haze" })
export class EveHazeSetLight extends CjsModel
{
  @io.owned
  @type.struct("CjsLightData")
  lightData = new CjsLightData();

  @type.objectRef("Tr2LightProfileRes")
  lightProfile = null;

  @type.uint32
  index = 0;

  @type.boolean
  boosterGainInfluence = false;

  @type.mat4
  boneMatrix = mat4.create();

  @type.string
  lightProfilePath = "";

  /**
   * Builds a haze light from a SOF-authored description, taking the light
   * profile path from the description or, failing that, from the light data's
   * texture path.
   */
  static FromSOF(value)
  {
    const values = value ?? {};
    return EveHazeSetLight.from({
      ...values,
      lightProfilePath: String(values.lightProfilePath ?? values.lightData?.texturePath ?? "")
    });
  }
}
