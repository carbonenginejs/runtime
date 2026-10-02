// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/SplineTunnelGroup.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema eve/child/behaviors/SplineTunnelPoint.json.).
import { meta } from "#schema";
import { vec3 } from "#math/vec3";

/** SplineTunnelPoint (eve/child/behaviors) - generated from schema shapeHash da3b5246.... */
@meta.define({ className: "SplineTunnelPoint", family: "eve" })
export class SplineTunnelPoint
{

  /** accelerationMultiplier (float) */
  @meta.type.float32
  accelerationMultiplier = 1;

  /** pos (Vector3) */
  @meta.type.vec3
  pos = vec3.create();

  /** rot (Vector3) */
  @meta.type.vec3
  rot = vec3.create();

}
