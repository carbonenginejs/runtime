// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpriteSet.cpp
import { CjsModel } from "#model";
import { mat4 } from "#math/mat4";
import { io, type } from "#schema";
import { CjsLightData } from "../../lights/CjsLightData.js";


/**
 * The light one sprite contributes, carrying the blink rate, phase and scale
 * range that modulate its radius, plus its light profile and the bone matrix
 * resolved for it each frame.
 */
@type.define({ className: "EveSpriteLight", family: "eve/attachment/sprites" })
export class EveSpriteLight extends CjsModel
{
  @io.owned
  @type.struct("CjsLightData")
  lightData = new CjsLightData();

  @type.float32
  blinkPhase = 0;

  @type.float32
  blinkRate = 0;

  @type.float32
  minScale = 0;

  @type.float32
  maxScale = 0;

  @type.objectRef("Tr2LightProfileRes")
  lightProfile = null;

  @type.uint32
  index = 0;

  @type.mat4
  boneMatrix = mat4.create();

  @type.string
  lightProfilePath = "";

  /**
   * Builds a sprite light from a SOF-authored description, taking the light
   * profile path from the description or, failing that, from the light data's
   * texture path.
   */
  static FromSOF(value)
  {
    const values = value ?? {};
    return EveSpriteLight.from({
      ...values,
      lightProfilePath: String(values.lightProfilePath ?? values.lightData?.texturePath ?? "")
    });
  }
}
