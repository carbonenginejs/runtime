// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/SplineTunnelGroup.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema eve/child/behaviors/SplineTunnelPoint.json.).
import { type, blue, meta } from "#schema";
import { vec3 } from "#math/vec3";

/** SplineTunnelPoint (eve/child/behaviors) - generated from schema shapeHash da3b5246.... */
@meta.carbon("SplineTunnelPoint")
export class SplineTunnelPoint
{

  /** accelerationMultiplier (float) */
  @type.float32
  accelerationMultiplier = 1;

  /** pos (Vector3) */
  @type.vec3
  pos = vec3.create();

  /** rot (Vector3) */
  @type.vec3
  rot = vec3.create();

  /**
   * Carbon's friend `operator==` (SplineTunnelGroup.h:15-18), which
   * JavaScript cannot overload: exact comparison of every member.
   * @param {SplineTunnelPoint} other
   * @returns {boolean}
   */
  @meta.renamed("operator==")
  Equals(other)
  {
    return this.accelerationMultiplier === other.accelerationMultiplier
      && vec3.exactEquals(this.pos, other.pos)
      && vec3.exactEquals(this.rot, other.rot);
  }

  /**
   * Carbon's friend `operator!=` (SplineTunnelGroup.h:20-23).
   * @param {SplineTunnelPoint} other
   * @returns {boolean}
   */
  @meta.renamed("operator!=")
  NotEquals(other)
  {
    return !this.Equals(other);
  }

}
