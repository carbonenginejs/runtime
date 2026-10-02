// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveHazeSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveHazeSet.cpp
import { DictReader } from "#blue/DictReader";
import { mat4 } from "#math/mat4";
import { meta } from "#schema";
import { CjsLightData } from "../../lights/CjsLightData.js";


/**
 * The light one haze item contributes, carrying its booster-gain influence flag,
 * light profile and the bone matrix resolved for it each frame.
 */
@meta.define({ className: "EveHazeSetLight", family: "eve/attachment/haze" })
export class EveHazeSetLight
{
  @meta.owned
  @meta.type.struct("CjsLightData")
  lightData = new CjsLightData();

  @meta.type.objectRef("Tr2LightProfileRes")
  lightProfile = null;

  @meta.type.uint32
  index = 0;

  @meta.type.boolean
  boosterGainInfluence = false;

  @meta.type.mat4
  boneMatrix = mat4.create();

  @meta.type.string
  lightProfilePath = "";

  /**
   * Builds a haze light from a SOF-authored description, taking the light
   * profile path from the description or, failing that, from the light data's
   * texture path.
   */
  static FromSOF(value)
  {
    const values = value ?? {};
    const light = new EveHazeSetLight();
    new DictReader({ declarations: true, initialize: false }).ReadInto(light, {
      ...values,
      lightProfilePath: String(values.lightProfilePath ?? values.lightData?.texturePath ?? "")
    }, null);
    return light;
  }
}
