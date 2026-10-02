// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionAttributeModifiers/IEveDistributionModifier.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema eve/distribution/attributeModifiers/InitialPlacement.json.).
import { meta } from "#schema";

/** Pairs one pooled distribution placement with the timeout that controls when its location may be triggered again. */
@meta.define({ className: "InitialPlacement", family: "eve/distribution/attributeModifiers" })
export class InitialPlacement
{

  /** placement (PlacementDataWithIdentifier) */
  @meta.type.rawStruct("PlacementDataWithIdentifier")
  placement = null;

  /** timeOutDuration (float) */
  @meta.type.float32
  timeOutDuration = 0;

}
