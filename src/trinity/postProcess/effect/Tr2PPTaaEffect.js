// Source: trinity/trinity/PostProcess/Effects/Tr2PPTaaEffect.h
// Source: trinity/trinity/PostProcess/Effects/Tr2PPTaaEffect.cpp
import { edit, type } from "#schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";
import { Debug } from "../../generated/postProcess/enums.js";
import { blue, EnumRegistrationType } from "#blue";


/**
 * Temporal anti-aliasing settings: quality level, the early-out threshold below
 * which pixels are left alone, and the debug visualization selector.
 */
@type.define({ className: "Tr2PPTaaEffect", family: "postProcess" })
export class Tr2PPTaaEffect extends Tr2PPEffect
{

  @edit.readwrite
  @type.int32
  @type.enum("trinity.Tr2PPTaaEffect.Debug")
  debug = Tr2PPTaaEffect.TAA_DEBUG_OFF;

  @edit.readwrite
  @type.int32
  @type.enum("trinity.Tr2PPTaaEffect.Quality")
  quality = Tr2PPTaaEffect.TAA_HIGH;

  @edit.readwrite
  @type.float32
  earlyOutThreshold = 0.001;

  /**
   * Reports TAA as contributing whenever it is displayed; unlike the other
   * effects it has no intensity or scale to gate on.
   */
  IsActive()
  {
    return this.display !== false;
  }

  static Quality = Object.freeze({ TAA_LOW: 1, TAA_MEDIUM: 2, TAA_HIGH: 3 });

  static Debug = Debug;

  static TAA_LOW = 1;

  static TAA_MEDIUM = 2;

  static TAA_HIGH = 3;

  static TAA_DEBUG_OFF = 0;

  static TAA_DEBUG_MOTION_VECTORS = 1;

  static TAA_DEBUG_EARLY_OUT_MASK = 2;

}

blue.enums.RegisterEnum("trinity.Tr2PPTaaEffect.Quality", Tr2PPTaaEffect.Quality, {
  source: "trinity/trinity/PostProcess/Effects/Tr2PPTaaEffect.h", family: "postProcess", line: 16,
  exposedName: "TaaQuality", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/PostProcess/Effects/Tr2PPTaaEffect_Blue.cpp:9",
  chooser: [
    { name: "Low", value: Tr2PPTaaEffect.Quality.TAA_LOW, description: "Low Quality" },
    { name: "Medium", value: Tr2PPTaaEffect.Quality.TAA_MEDIUM, description: "Medium Quality" },
    { name: "High", value: Tr2PPTaaEffect.Quality.TAA_HIGH, description: "High Quality" }
  ]
});

blue.enums.RegisterEnum("trinity.Tr2PPTaaEffect.Debug", Tr2PPTaaEffect.Debug, {
  source: "trinity/trinity/PostProcess/Effects/Tr2PPTaaEffect.h", family: "postProcess", line: 23,
  exposedName: "TaaDebug", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/PostProcess/Effects/Tr2PPTaaEffect_Blue.cpp:17",
  chooser: [
    { name: "Off", value: Tr2PPTaaEffect.Debug.TAA_DEBUG_OFF, description: "Debug Off" },
    { name: "Motion Vectors", value: Tr2PPTaaEffect.Debug.TAA_DEBUG_MOTION_VECTORS, description: "Show Motion Vectors" },
    { name: "Early Out Mask", value: Tr2PPTaaEffect.Debug.TAA_DEBUG_EARLY_OUT_MASK, description: "Show Early Out Mask" }
  ]
});
