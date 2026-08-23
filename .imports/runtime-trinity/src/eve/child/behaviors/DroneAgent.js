// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/Children/Behaviors/DroneAgent.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema eve/child/behaviors/DroneAgent.json.).
import { type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";

/** DroneAgent (eve/child/behaviors) - generated from schema shapeHash c50899e8.... */
@type.define({ className: "DroneAgent", family: "eve/child/behaviors" })
export class DroneAgent extends CjsModel
{

  /** closestAgentInGroup (DroneAgent*) */
  @type.objectRef("DroneAgent")
  closestAgentInGroup = null;

  /** rotation (Quaternion) */
  @type.quat
  rotation = quat.create();

  /** position (Vector3) */
  @type.vec3
  position = vec3.create();

  /** acceleration (Vector3) */
  @type.vec3
  acceleration = vec3.create();

  /** velocity (Vector3) */
  @type.vec3
  velocity = vec3.create();

  /** accelerationLength (float) */
  @type.float32
  accelerationLength = 0;

  /** velocityLength (float) */
  @type.float32
  velocityLength = 0;

  /** target (Vector3) */
  @type.vec3
  target = vec3.create();

  /** targetDirection (Vector3) */
  @type.vec3
  targetDirection = vec3.create();

  /** id (int) */
  @type.int32
  id = 0;

  /** lifetime (float) */
  @type.float32
  lifetime = 0;

  /** playFX (bool) */
  @type.boolean
  playFX = false;

  /** fxStartTime (Be::Time) */
  @type.float64
  fxStartTime = 0;

  /** lastTransform (Matrix) */
  @type.mat4
  lastTransform = mat4.create();

  /** xfade (float) */
  @type.float32
  xfade = 0;

  /** isVisible (bool) */
  @type.boolean
  isVisible = false;

  /** screenSize (float) */
  @type.float32
  screenSize = 0;

}
