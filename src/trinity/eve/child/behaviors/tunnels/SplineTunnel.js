// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/SplineTunnelGroup.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema eve/child/behaviors/SplineTunnel.json.).
import { type } from "#schema";
import { CjsModel } from "#model";

/** SplineTunnel (eve/child/behaviors) - generated from schema shapeHash d53f1701.... */
@type.define({ className: "SplineTunnel", family: "eve" })
export class SplineTunnel extends CjsModel
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

  /** accelerationMultiplier (float) */
  @type.float32
  // Carbon leaves this unused native member uninitialized. The portable
  // record uses the multiplicative identity as a deterministic value.
  accelerationMultiplier = 1;

  /** pullSize (float) */
  @type.float32
  pullSize = 50;

  /** pointOfNoReturnSize (float) */
  @type.float32
  pointOfNoReturnSize = 20;

}
