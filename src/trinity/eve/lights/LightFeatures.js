// Source: trinity/trinity/Lights/Tr2Light.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema eve/lights/LightFeatures.json.).
import { meta } from "#schema";

/** LightFeatures (eve/lights) - generated from schema shapeHash 47b89708.... */
@meta.define({ className: "LightFeatures", family: "eve/lights" })
export class LightFeatures
{

  /** profileIndex (int16_t) */
  @meta.type.int16
  profileIndex = 0;

  /** parentScale (float) */
  @meta.type.float32
  parentScale = 1;

  /** parentBrightness (float) */
  @meta.type.float32
  parentBrightness = 1;

}
