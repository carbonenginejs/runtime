// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EvePlaneSet.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EvePlaneSet.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { io, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsLightData } from "../../lights/CjsLightData.js";


@type.define({ className: "EvePlaneLight", family: "eve/attachment/planes" })
export class EvePlaneLight extends CjsModel
{
  static FadeType = Object.freeze({
    FT_NONE: 0,
    FT_BLINK: 1,
    FT_FADEIN: 2,
    FT_FADEOUT: 3,
    FT_FADEINOUT: 4
  });

  static FT_NONE = 0;
  static FT_BLINK = 1;
  static FT_FADEIN = 2;
  static FT_FADEOUT = 3;
  static FT_FADEINOUT = 4;

  @io.owned
  @type.struct("CjsLightData")
  lightData = new CjsLightData();

  @type.float32
  saturation = 1;

  @type.objectRef("Tr2LightProfileRes")
  lightProfile = null;

  @type.int32
  @schema.enum("FadeType")
  fadeType = EvePlaneLight.FT_NONE;

  @type.float32
  blinkPhase = 0;

  @type.float32
  blinkRate = 0;

  @type.uint32
  index = 0;

  @type.mat4
  boneMatrix = mat4.create();

  @type.string
  lightProfilePath = "";

  static FromSOF(value)
  {
    const values = value ?? {};
    return EvePlaneLight.from({
      ...values,
      lightProfilePath: String(values.lightProfilePath ?? values.lightData?.texturePath ?? "")
    });
  }
}
