// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionAttributeModifiers/IEveDistributionModifier.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema eve/distribution/attributeModifiers/InitialPlacement.json.).
import { type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** InitialPlacement (eve/distribution/attributeModifiers) - generated from schema shapeHash f7f0f676.... */
@type.define({ className: "InitialPlacement", family: "eve/distribution/attributeModifiers" })
export class InitialPlacement extends CjsModel
{

  /** placement (PlacementDataWithIdentifier) */
  @type.rawStruct("PlacementDataWithIdentifier")
  placement = null;

  /** timeOutDuration (float) */
  @type.float32
  timeOutDuration = 0;

}
