// Source: trinity/trinity/TriDevice.h
// Source: trinity/trinity/TriDevice.cpp
import { type } from "#schema";
import { UpscalingSetting, UpscalingTechnique } from "#consts/render-context";
import "#blue/registerTrinityEnums";


/**
 * One device-reported upscaling technique and the quality settings and frame
 * generation support available for it. Carbon declares this as a structure-list
 * value, not an IRoot class; registration supplies its record schema without
 * inventing a native query interface. Defaults match the device fallback record.
 */
@type.define({
  className: "Tr2UpscalingTechniqueInfo",
  family: "trinityCore"
})
export class Tr2UpscalingTechniqueInfo
{
  static UpscalingSetting = UpscalingSetting;

  static UpscalingTechnique = UpscalingTechnique;

  /** Tr2UpscalingTechniqueInfo::technique. */
  @type.uint32
  @type.enum("trinity.Tr2UpscalingAL.Technique")
  technique = 0;

  /** Tr2UpscalingTechniqueInfo::supportedSettings. */
  @type.uint32
  @type.enum("trinity.Tr2UpscalingAL.Setting")
  supportedSettings = 0;

  /** Blue structure field `framegeneration` (C++ member `framegen`). */
  @type.boolean
  framegeneration = false;
}
