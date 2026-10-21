// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveBannerSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveBannerSet.cpp
import { DictReader } from "#blue/DictReader";
import { mat4 } from "#math/mat4";
import { meta, type, blue } from "#schema";
import { LightData } from "../../lights/LightData.js";


/**
 * The light one banner contributes, carrying its saturation, light profile and
 * the bone matrix resolved for it each frame.
 */
@meta.carbon("EveBannerLight")
export class EveBannerLight
{
  @meta.owned
  @type.object.embed("LightData")
  lightData = new LightData();

  @type.float32
  saturation = 1;

  @type.rootRef("Tr2LightProfileRes")
  lightProfile = null;

  @type.uint32
  index = 0;

  @type.mat4
  boneMatrix = mat4.create();

  @type.wpath("Tr2LightProfileRes")
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
