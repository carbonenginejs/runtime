// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/DroneAgent.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema eve/child/behaviors/DroneAgent.json.).
import { meta } from "#schema";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/** DroneAgent (eve/child/behaviors) - generated from schema shapeHash c50899e8.... */
@meta.define({ className: "DroneAgent", family: "eve/child/behaviors" })
export class DroneAgent
{

  /** closestAgentInGroup (DroneAgent*) */
  @meta.type.objectRef("DroneAgent")
  closestAgentInGroup = null;

  /** rotation (Quaternion) */
  @meta.type.quat
  rotation = quat.create();

  /** position (Vector3) */
  @meta.type.vec3
  position = vec3.create();

  /** acceleration (Vector3) */
  @meta.type.vec3
  acceleration = vec3.create();

  /** velocity (Vector3) */
  @meta.type.vec3
  velocity = vec3.create();

  /** accelerationLength (float) */
  @meta.type.float32
  accelerationLength = 0;

  /** velocityLength (float) */
  @meta.type.float32
  velocityLength = 0;

  /** target (Vector3) */
  @meta.type.vec3
  target = vec3.create();

  /** targetDirection (Vector3) */
  @meta.type.vec3
  targetDirection = vec3.create();

  /** id (int) */
  @meta.type.int32
  id = 0;

  /** lifetime (float) */
  @meta.type.float32
  lifetime = 0;

  /** playFX (bool) */
  @meta.type.boolean
  playFX = false;

  /** fxStartTime (Be::Time) */
  @meta.type.float64
  fxStartTime = 0;

  /** lastTransform (Matrix) */
  @meta.type.mat4
  lastTransform = mat4.create();

  /** xfade (float) */
  @meta.type.float32
  xfade = 0;

  /** isVisible (bool) */
  @meta.type.boolean
  isVisible = false;

  /** screenSize (float) */
  @meta.type.float32
  screenSize = 0;

}
