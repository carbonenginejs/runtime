import { meta } from "#schema";
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionAttributeModifiers/IEveDistributionModifier.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema eve/distribution/attributeModifiers/InitialPlacement.json.).
import { type, blue } from "#schema";
import { PlacementDataWithIdentifier } from "../../PlacementDataWithIdentifier.js";

/** Pairs one pooled distribution placement with the timeout that controls when its location may be triggered again. */
@meta.carbon("InitialPlacement")
export class InitialPlacement
{

  /** placement (PlacementDataWithIdentifier), embedded by value (IEveDistributionModifier.h:48). */
  @type.rawStruct("PlacementDataWithIdentifier")
  placement = new PlacementDataWithIdentifier();

  /** timeOutDuration (float) */
  @type.float32
  timeOutDuration = 0;

}
