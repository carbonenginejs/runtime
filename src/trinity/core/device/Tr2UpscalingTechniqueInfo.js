// Source: trinity/trinity/TriDevice.h
// Source: trinity/trinity/TriDevice.cpp
import { meta } from "#schema";
import { UpscalingSetting, UpscalingTechnique } from "#consts/render-context";
import "#blue/registerTrinityEnums";


/**
 * One device-reported upscaling technique and the quality settings and frame
 * generation support available for it. Carbon declares this as a structure-list
 * value, not an IRoot class; registration supplies its record schema without
 * inventing a native query interface. Defaults match the device fallback record.
 */
@meta.define({
  className: "Tr2UpscalingTechniqueInfo",
  family: "trinityCore"
})
export class Tr2UpscalingTechniqueInfo
{
  /**
   * Quality-setting flags used to interpret supportedSettings.
   * @type {typeof UpscalingSetting}
   */
  static UpscalingSetting = UpscalingSetting;

  /**
   * Technique identifiers used by device capability records.
   * @type {typeof UpscalingTechnique}
   */
  static UpscalingTechnique = UpscalingTechnique;

  /**
   * Tr2UpscalingTechniqueInfo::technique.
   *
   * Upscaling technique identified by this capability record.
   * @type {number}
   */
  @meta.type.uint32
  @meta.type.enum("trinity.Tr2UpscalingAL.Technique")
  technique = 0;

  /**
   * Tr2UpscalingTechniqueInfo::supportedSettings.
   *
   * Bitmask of quality settings supported by this technique.
   * @type {number}
   */
  @meta.type.uint32
  @meta.type.enum("trinity.Tr2UpscalingAL.Setting")
  supportedSettings = 0;

  /**
   * Blue structure field `framegeneration` (C++ member `framegen`).
   *
   * Whether this technique supports frame generation.
   * @type {boolean}
   */
  @meta.type.boolean
  framegeneration = false;
}
