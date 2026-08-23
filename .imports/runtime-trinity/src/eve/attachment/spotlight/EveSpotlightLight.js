// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EveSpotlightSet.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EveSpotlightSet.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsLightData } from "../../lights/CjsLightData.js";


/**
 * The spot light one spotlight item contributes, carrying its booster-gain
 * influence flag, light profile and the bone matrix resolved for it each frame.
 */
@type.define({ className: "EveSpotlightLight", family: "eve/attachment/spotlights" })
export class EveSpotlightLight extends CjsModel
{
  @io.owned
  @type.struct("CjsLightData")
  lightData = new CjsLightData();

  @type.mat4
  boneMatrix = mat4.create();

  @type.objectRef("Tr2LightProfileRes")
  lightProfile = null;

  @type.boolean
  boosterGainInfluence = false;

  @type.uint32
  index = 0;

  @type.string
  lightProfilePath = "";

  /**
   * Builds a spotlight light from a SOF-authored description, taking the light
   * profile path from the description or, failing that, from the light data's
   * texture path.
   */
  static FromSOF(value)
  {
    const values = value ?? {};
    return EveSpotlightLight.from({
      ...values,
      lightProfilePath: String(values.lightProfilePath ?? values.lightData?.texturePath ?? "")
    });
  }
}
