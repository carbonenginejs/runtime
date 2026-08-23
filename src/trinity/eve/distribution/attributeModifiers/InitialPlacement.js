// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionAttributeModifiers/IEveDistributionModifier.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema eve/distribution/attributeModifiers/InitialPlacement.json.).
import { type } from "#schema";
import { CjsModel } from "#model";

/** Pairs one pooled distribution placement with the timeout that controls when its location may be triggered again. */
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
