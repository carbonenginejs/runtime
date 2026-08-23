// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveBannerSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveBannerSet.cpp
import { CjsModel } from "#model";
import { mat4 } from "#math/mat4";
import { io, type } from "#schema";
import { CjsLightData } from "../../lights/CjsLightData.js";


/**
 * The light one banner contributes, carrying its saturation, light profile and
 * the bone matrix resolved for it each frame.
 */
@type.define({ className: "EveBannerLight", family: "eve/attachment/banners" })
export class EveBannerLight extends CjsModel
{
  @io.owned
  @type.struct("CjsLightData")
  lightData = new CjsLightData();

  @type.float32
  saturation = 1;

  @type.objectRef("Tr2LightProfileRes")
  lightProfile = null;

  @type.uint32
  index = 0;

  @type.mat4
  boneMatrix = mat4.create();

  @type.string
  lightProfilePath = "";

  /**
   * Builds a banner light from a SOF-authored description, taking the light
   * profile path from the description or, failing that, from the light data's
   * texture path.
   */
  static FromSOF(value)
  {
    const values = value ?? {};
    return EveBannerLight.from({
      ...values,
      lightProfilePath: String(values.lightProfilePath ?? values.lightData?.texturePath ?? "")
    });
  }
}
