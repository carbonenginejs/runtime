// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/EveSwarm.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema eve/spaceObject/swarm/SwarmVehicle.json.).
import { type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";

/** SwarmVehicle (eve/spaceObject/swarm) - generated from schema shapeHash ad1e4b43.... */
@type.define({ className: "SwarmVehicle", family: "eve/spaceObject/swarm" })
export class SwarmVehicle extends CjsModel
{

  /** rotation (Quaternion) */
  @type.quat
  rotation = quat.create();

  /** acceleration (Vector3) */
  @type.vec3
  acceleration = vec3.create();

  /** velocity (Vector3) */
  @type.vec3
  velocity = vec3.create();

  /** position (Vector3) */
  @type.vec3
  position = vec3.create();

  /** wanderTarget (Vector3) */
  @type.vec3
  wanderTarget = vec3.create();

  /** roll (float) */
  @type.float32
  roll = 0;

}
