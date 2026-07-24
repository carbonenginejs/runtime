// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EveSpriteSet.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EveSpriteSet.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsLightData } from "../../lights/CjsLightData.js";


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

  static FromSOF(value)
  {
    const values = value ?? {};
    return EveSpriteLight.from({
      ...values,
      lightProfilePath: String(values.lightProfilePath ?? values.lightData?.texturePath ?? "")
    });
  }
}
