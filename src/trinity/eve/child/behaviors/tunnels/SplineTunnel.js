import { meta } from "#schema";
// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/SplineTunnelGroup.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema eve/child/behaviors/SplineTunnel.json.).
import { type, blue } from "#schema";

/** SplineTunnel (eve/child/behaviors) - generated from schema shapeHash d53f1701.... */
@meta.carbon("SplineTunnel")
export class SplineTunnel
{

  /** tunnelID (int) */
  @type.int32
  tunnelID = -1;

  /** tunnelGroupType (int) */
  @type.int32
  tunnelGroupType = 0;

  /** splinePoints (std::vector<SplineTunnelPoint>) */
  @type.list("SplineTunnelPoint")
  splinePoints = [];

  /** cylWidth (float) */
  @type.float32
  cylWidth = 20;

  /** accelerationMultiplier (float). Carbon leaves it unset. */
  @type.float32
  accelerationMultiplier = 0;

  /** pullSize (float) */
  @type.float32
  pullSize = 50;

  /** pointOfNoReturnSize (float) */
  @type.float32
  pointOfNoReturnSize = 20;

}
