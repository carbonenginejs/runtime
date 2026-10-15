// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.h
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp
import { vec3 } from "#math/vec3";
import { meta, blue } from "#schema";
import { INotify } from "#blue";
import { EveVirtualCameraBehaviourVector3MoveForward } from "./EveVirtualCameraBehaviourVector3MoveForward.js";


/**
 * Vector3 behaviour that displaces the camera along its own up axis by a
 * curve-shaped distance.
 */
@blue.define("EveVirtualCameraBehaviourVector3MoveUp")
@blue.interface(INotify)
@blue.chainTo(EveVirtualCameraBehaviourVector3MoveForward)
export class EveVirtualCameraBehaviourVector3MoveUp extends EveVirtualCameraBehaviourVector3MoveForward
{
  /**
   * Names the behaviour "Move Up" and inherits the forward variant's scale curve
   * setup.
   */
  constructor()
  {
    super("Move Up");
  }

  /**
   * Returns the camera's up direction scaled by the current distance; the up
   * axis already includes the camera roll.
   */
  @blue.method
  @meta.adapted
  Update(camera, _current, _deltaTime, localElapsedTime, _anchorPosition, anchorRadius, _anchorForwardDirection, out = vec3.create())
  {
    return vec3.scale(out, camera.GetUpDirection(out), this.GetCurrentValue(camera, localElapsedTime, anchorRadius));
  }
}
