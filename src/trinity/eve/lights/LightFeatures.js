// Source: trinity/trinity/Lights/Tr2Light.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema eve/lights/LightFeatures.json.).
import { type } from "#schema";
import { CjsModel } from "#model";

/** LightFeatures (eve/lights) - generated from schema shapeHash 47b89708.... */
@type.define({ className: "LightFeatures", family: "eve/lights" })
export class LightFeatures extends CjsModel
{

  /** profileIndex (int16_t) */
  @type.int16
  profileIndex = 0;

  /** parentScale (float) */
  @type.float32
  parentScale = 1;

  /** parentBrightness (float) */
  @type.float32
  parentBrightness = 1;

}
