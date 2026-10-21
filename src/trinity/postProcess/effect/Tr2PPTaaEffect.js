import { exposure as be } from "#be";
// Source: trinity/trinity/PostProcess/Effects/Tr2PPTaaEffect.h
// Source: trinity/trinity/PostProcess/Effects/Tr2PPTaaEffect.cpp
import { type, blue as legacyBlue } from "#schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";
import { Debug } from "../../generated/postProcess/enums.js";
import { blue, EnumRegistrationType } from "#blue";


/**
 * Temporal anti-aliasing settings: quality level, the early-out threshold below
 * which pixels are left alone, and the debug visualization selector.
 */
@be.define("Tr2PPTaaEffect")
@be.exposureChainTo(Tr2PPEffect)
@be.mapInterface(Tr2PPEffect)
export class Tr2PPTaaEffect extends Tr2PPEffect
{

  @legacyBlue.readwrite
  @type.int32
  @type.enum("trinity.Tr2PPTaaEffect.Debug")
  debug = Tr2PPTaaEffect.TAA_DEBUG_OFF;

  @legacyBlue.readwrite
  @type.int32
  @type.enum("trinity.Tr2PPTaaEffect.Quality")
  quality = Tr2PPTaaEffect.TAA_HIGH;

  @be.mapAttribute(be.READWRITE)
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

  static Quality = { TAA_LOW: 1, TAA_MEDIUM: 2, TAA_HIGH: 3 };

  static Debug = Debug;

  static TAA_LOW = 1;

  static TAA_MEDIUM = 2;

  static TAA_HIGH = 3;

  static TAA_DEBUG_OFF = 0;

  static TAA_DEBUG_MOTION_VECTORS = 1;

  static TAA_DEBUG_EARLY_OUT_MASK = 2;

}

blue.enums.Create("trinity.Tr2PPTaaEffect.Quality", Tr2PPTaaEffect.Quality, {
  exposedName: "TaaQuality", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooser: [
    { name: "Low", value: Tr2PPTaaEffect.Quality.TAA_LOW, description: "Low Quality" },
    { name: "Medium", value: Tr2PPTaaEffect.Quality.TAA_MEDIUM, description: "Medium Quality" },
    { name: "High", value: Tr2PPTaaEffect.Quality.TAA_HIGH, description: "High Quality" }
  ]
});
