// Source: trinity/trinity/TriDevice.h
// Source: trinity/trinity/TriDevice.cpp
import { CjsModel } from "#model";
import { type } from "#schema";
import { UpscalingSetting, UpscalingTechnique } from "#consts/render-context";


/**
 * One device-reported upscaling technique and the quality settings and frame
 * generation support available for it.
 */
@type.define({
  className: "Tr2UpscalingTechniqueInfo",
  family: "trinityCore"
})
export class Tr2UpscalingTechniqueInfo extends CjsModel
{
  static UpscalingSetting = UpscalingSetting;

  static UpscalingTechnique = UpscalingTechnique;

  /** Tr2UpscalingTechniqueInfo::technique. */
  @type.uint32
  @type.enum("UpscalingTechnique")
  technique = 0;

  /** Tr2UpscalingTechniqueInfo::supportedSettings. */
  @type.uint32
  @type.enum("UpscalingSetting")
  supportedSettings = 0;

  /** Blue structure field `framegeneration` (C++ member `framegen`). */
  @type.boolean
  framegeneration = false;
}
