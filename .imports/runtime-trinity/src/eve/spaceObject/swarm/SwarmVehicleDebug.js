// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/EveSwarm.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema eve/spaceObject/swarm/SwarmVehicleDebug.json.).
import { type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";

/** SwarmVehicleDebug (eve/spaceObject/swarm) - generated from schema shapeHash f53e5a64.... */
@type.define({ className: "SwarmVehicleDebug", family: "eve/spaceObject/swarm" })
export class SwarmVehicleDebug extends CjsModel
{

  /** alignment (Vector3) */
  @type.vec3
  alignment = vec3.create();

  /** anchor (Vector3) */
  @type.vec3
  anchor = vec3.create();

  /** cohesion (Vector3) */
  @type.vec3
  cohesion = vec3.create();

  /** deceleration (Vector3) */
  @type.vec3
  deceleration = vec3.create();

  /** formation (Vector3) */
  @type.vec3
  formation = vec3.create();

  /** separation (Vector3) */
  @type.vec3
  separation = vec3.create();

  /** wander (Vector3) */
  @type.vec3
  wander = vec3.create();

}
