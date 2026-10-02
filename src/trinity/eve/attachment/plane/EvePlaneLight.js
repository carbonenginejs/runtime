// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EvePlaneSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EvePlaneSet.cpp
import { DictReader } from "#blue/DictReader";
import { mat4 } from "#math/mat4";
import { meta } from "#schema";
import { CjsLightData } from "../../lights/CjsLightData.js";
import { FadeType } from "../EveSpaceObjectAttachmentUtils.js";


/**
 * The light one plane contributes, carrying its saturation, blink rate and
 * phase, fade type, light profile and the bone matrix resolved for it each
 * frame.
 */
@meta.define({ className: "EvePlaneLight", family: "eve/attachment/planes" })
export class EvePlaneLight
{
  static FadeType = FadeType;

  static FT_NONE = 0;
  static FT_BLINK = 1;
  static FT_FADEIN = 2;
  static FT_FADEOUT = 3;
  static FT_FADEINOUT = 4;

  @meta.owned
  @meta.type.struct("CjsLightData")
  lightData = new CjsLightData();

  @meta.type.float32
  saturation = 1;

  @meta.type.objectRef("Tr2LightProfileRes")
  lightProfile = null;

  @meta.type.int32
  @meta.type.enum("trinity.FadeType")
  fadeType = EvePlaneLight.FT_NONE;

  @meta.type.float32
  blinkPhase = 0;

  @meta.type.float32
  blinkRate = 0;

  @meta.type.uint32
  index = 0;

  @meta.type.mat4
  boneMatrix = mat4.create();

  @meta.type.path
  lightProfilePath = "";

  /**
   * Builds a plane light from a SOF-authored description, taking the light
   * profile path from the description or, failing that, from the light data's
   * texture path.
   */
  static FromSOF(value)
  {
    const values = value ?? {};
    const light = new EvePlaneLight();
    new DictReader({ declarations: true, initialize: false }).ReadInto(light, {
      ...values,
      lightProfilePath: String(values.lightProfilePath ?? values.lightData?.texturePath ?? "")
    }, null);
    return light;
  }
}
