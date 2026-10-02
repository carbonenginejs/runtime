// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveBannerSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveBannerSet.cpp
import { DictReader } from "#blue/DictReader";
import { mat4 } from "#math/mat4";
import { meta } from "#schema";
import { CjsLightData } from "../../lights/CjsLightData.js";


/**
 * The light one banner contributes, carrying its saturation, light profile and
 * the bone matrix resolved for it each frame.
 */
@meta.define({ className: "EveBannerLight", family: "eve/attachment/banners" })
export class EveBannerLight
{
  @meta.owned
  @meta.type.struct("CjsLightData")
  lightData = new CjsLightData();

  @meta.type.float32
  saturation = 1;

  @meta.type.objectRef("Tr2LightProfileRes")
  lightProfile = null;

  @meta.type.uint32
  index = 0;

  @meta.type.mat4
  boneMatrix = mat4.create();

  @meta.type.string
  lightProfilePath = "";

  /**
   * Builds a banner light from a SOF-authored description, taking the light
   * profile path from the description or, failing that, from the light data's
   * texture path.
   */
  static FromSOF(value)
  {
    const values = value ?? {};
    const light = new EveBannerLight();
    new DictReader({ declarations: true, initialize: false }).ReadInto(light, {
      ...values,
      lightProfilePath: String(values.lightProfilePath ?? values.lightData?.texturePath ?? "")
    }, null);
    return light;
  }
}
