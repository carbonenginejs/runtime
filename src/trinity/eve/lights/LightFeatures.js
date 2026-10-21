// Source: trinity/trinity/Lights/Tr2Light.h:11-18
// Source: trinity/trinity/Lights/Tr2Light.cpp (LightFeatures::LightFeatures)
import { type, blue } from "#schema";

/**
 * Carbon LightFeatures: what a light's owner contributes to its conversion -
 * the light profile's index, and the parent's scale and brightness.
 *
 * Carbon: LightFeatures (trinity/trinity/Lights/Tr2Light.h:11)
 */
@blue.define({ className: "LightFeatures" })
export class LightFeatures
{

  /** profileIndex (int16_t) = 0 (cpp:31). */
  @type.int16
  profileIndex = 0;

  /** parentScale (float) = 1 (cpp:30). */
  @type.float32
  parentScale = 1;

  /** parentBrightness (float) = 1 (cpp:29). */
  @type.float32
  parentBrightness = 1;

}
