// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
// Maintained as runtime-trinity's backend-neutral booster constant-data contract.
//   trinity/trinity/Eve/SpaceObject/Attachments/EveBoosterSet2.h:66
import { type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/**
 * Carbon `EveBoosterSetPerObjectData::PixelShaderData` - the trail intensities.
 *
 * `boosterIntensity` is declared on BOTH stages in Carbon; it is not a
 * duplicate to be collapsed. The producer writes it separately for each
 * (EveBoosterSet2Renderable.js:335 for the vertex stage, :339 for this one).
 */
@type.define({ className: "EveBoosterSetPSData", family: "eve/attachment/boosters" })
export class EveBoosterSetPSData extends CjsModel
{

  /** boosterIntensity (float) */
  @type.float32
  boosterIntensity = 0;

  /** trailIntensity (float) */
  @type.float32
  trailIntensity = 0;

  /** warpIntensity (float) */
  @type.float32
  warpIntensity = 0;

  /** padding2 (float) - Carbon's explicit register pad; never written. */
  @type.float32
  padding2 = 0;

}
