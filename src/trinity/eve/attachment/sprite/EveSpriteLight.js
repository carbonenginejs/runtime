// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteSet.cpp
import { DictReader } from "#blue/DictReader";
import { mat4 } from "#math/mat4";
import { meta } from "#schema";
import { CjsLightData } from "../../lights/CjsLightData.js";


/**
 * The light one sprite contributes, carrying the blink rate, phase and scale
 * range that modulate its radius, plus its light profile and the bone matrix
 * resolved for it each frame.
 */
@meta.define({ className: "EveSpriteLight", family: "eve/attachment/sprites" })
export class EveSpriteLight
{
  @meta.owned
  @meta.type.struct("CjsLightData")
  lightData = new CjsLightData();

  @meta.type.float32
  blinkPhase = 0;

  @meta.type.float32
  blinkRate = 0;

  @meta.type.float32
  minScale = 0;

  @meta.type.float32
  maxScale = 0;

  @meta.type.objectRef("Tr2LightProfileRes")
  lightProfile = null;

  @meta.type.uint32
  index = 0;

  @meta.type.mat4
  boneMatrix = mat4.create();

  @meta.type.path
  lightProfilePath = "";

  /**
   * Builds a sprite light from a SOF-authored description, taking the light
   * profile path from the description or, failing that, from the light data's
   * texture path.
   */
  static FromSOF(value)
  {
    const values = value ?? {};
    const light = new EveSpriteLight();
    new DictReader({ declarations: true, initialize: false }).ReadInto(light, {
      ...values,
      lightProfilePath: String(values.lightProfilePath ?? values.lightData?.texturePath ?? "")
    }, null);
    return light;
  }
}
