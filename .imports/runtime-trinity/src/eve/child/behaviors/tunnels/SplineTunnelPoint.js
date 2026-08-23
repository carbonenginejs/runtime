// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/Children/Behaviors/SplineTunnelGroup.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema eve/child/behaviors/SplineTunnelPoint.json.).
import { type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";

/** SplineTunnelPoint (eve/child/behaviors) - generated from schema shapeHash da3b5246.... */
@type.define({ className: "SplineTunnelPoint", family: "eve" })
export class SplineTunnelPoint extends CjsModel
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

}
