// Source: trinity/trinity/Eve/SpaceObject/EveSwarm.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema eve/spaceObject/swarm/SwarmVehicle.json.).
import { meta } from "#schema";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/** SwarmVehicle (eve/spaceObject/swarm) - generated from schema shapeHash ad1e4b43.... */
@meta.define({ className: "SwarmVehicle", family: "eve/spaceObject/swarm" })
export class SwarmVehicle
{

  /** rotation (Quaternion) */
  @meta.type.quat
  rotation = quat.create();

  /** acceleration (Vector3) */
  @meta.type.vec3
  acceleration = vec3.create();

  /** velocity (Vector3) */
  @meta.type.vec3
  velocity = vec3.create();

  /** position (Vector3) */
  @meta.type.vec3
  position = vec3.create();

  /** wanderTarget (Vector3) */
  @meta.type.vec3
  wanderTarget = vec3.create();

  /** roll (float) */
  @meta.type.float32
  roll = 0;

}
