// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.h
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp
import { vec3 } from "#math/vec3";
import { meta } from "#schema";
import { EveVirtualCameraBehaviourVector3MoveForward } from "./EveVirtualCameraBehaviourVector3MoveForward.js";


/**
 * Vector3 behaviour that displaces the camera sideways along its own right axis
 * by a curve-shaped distance.
 */
@meta.define({
  className: "EveVirtualCameraBehaviourVector3MoveRight",
  family: "eve/virtualCamera/behaviour"
})
export class EveVirtualCameraBehaviourVector3MoveRight extends EveVirtualCameraBehaviourVector3MoveForward
{
  /**
   * Names the behaviour "Move Right" and inherits the forward variant's scale
   * curve setup.
   */
  constructor()
  {
    super("Move Right");
  }

  /** Returns the camera's right direction scaled by the current distance. */
  @meta.blue.method
  @meta.adapted
  Update(camera, _current, _deltaTime, localElapsedTime, _anchorPosition, anchorRadius, _anchorForwardDirection, out = vec3.create())
  {
    return vec3.scale(out, camera.GetRightDirection(out), this.GetCurrentValue(camera, localElapsedTime, anchorRadius));
  }
}
