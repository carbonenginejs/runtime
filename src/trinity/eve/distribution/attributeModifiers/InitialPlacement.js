// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionAttributeModifiers/IEveDistributionModifier.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema eve/distribution/attributeModifiers/InitialPlacement.json.).
import { type, blue } from "#schema";

/** Pairs one pooled distribution placement with the timeout that controls when its location may be triggered again. */
@blue.define("InitialPlacement")
export class InitialPlacement
{

  /** placement (PlacementDataWithIdentifier) */
  @type.rawStruct("PlacementDataWithIdentifier")
  placement = null;

  /** timeOutDuration (float) */
  @type.float32
  timeOutDuration = 0;

}
