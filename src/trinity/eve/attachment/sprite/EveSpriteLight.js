// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteSet.cpp
import { DictReader } from "#blue/DictReader";
import { mat4 } from "#math/mat4";
import { meta, type, blue } from "#schema";
import { LightData } from "../../lights/LightData.js";


/**
 * The light one sprite contributes, carrying the blink rate, phase and scale
 * range that modulate its radius, plus its light profile and the bone matrix
 * resolved for it each frame.
 */
@blue.define("EveSpriteLight")
export class EveSpriteLight
{
  @meta.owned
  @type.root("LightData")
  lightData = new LightData();

  @type.float32
  blinkPhase = 0;

  @type.float32
  blinkRate = 0;

  @type.float32
  minScale = 0;

  @type.float32
  maxScale = 0;

  @type.rootRef("Tr2LightProfileRes")
  lightProfile = null;

  @type.uint32
  index = 0;

  @type.mat4
  boneMatrix = mat4.create();

  @type.wpath("Tr2LightProfileRes")
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
