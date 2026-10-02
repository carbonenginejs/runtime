// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpotlightSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpotlightSet.cpp
import { DictReader } from "#blue/DictReader";
import { mat4 } from "#math/mat4";
import { meta } from "#schema";
import { CjsLightData } from "../../lights/CjsLightData.js";


/**
 * The spot light one spotlight item contributes, carrying its booster-gain
 * influence flag, light profile and the bone matrix resolved for it each frame.
 */
@meta.define({ className: "EveSpotlightLight", family: "eve/attachment/spotlights" })
export class EveSpotlightLight
{
  @meta.owned
  @meta.type.struct("CjsLightData")
  lightData = new CjsLightData();

  @meta.type.mat4
  boneMatrix = mat4.create();

  @meta.type.objectRef("Tr2LightProfileRes")
  lightProfile = null;

  @meta.type.boolean
  boosterGainInfluence = false;

  @meta.type.uint32
  index = 0;

  @meta.type.string
  lightProfilePath = "";

  /**
   * Builds a spotlight light from a SOF-authored description, taking the light
   * profile path from the description or, failing that, from the light data's
   * texture path.
   */
  static FromSOF(value)
  {
    const values = value ?? {};
    const light = new EveSpotlightLight();
    new DictReader({ declarations: true, initialize: false }).ReadInto(light, {
      ...values,
      lightProfilePath: String(values.lightProfilePath ?? values.lightData?.texturePath ?? "")
    }, null);
    return light;
  }
}
