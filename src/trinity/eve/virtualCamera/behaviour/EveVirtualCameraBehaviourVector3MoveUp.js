import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.h
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp
import { vec3 } from "#math/vec3";
import { blue } from "#schema";
import { INotify } from "#blue";
import { EveVirtualCameraBehaviourVector3MoveForward } from "./EveVirtualCameraBehaviourVector3MoveForward.js";


/**
 * Vector3 behaviour that displaces the camera along its own up axis by a
 * curve-shaped distance.
 */
@be.define("EveVirtualCameraBehaviourVector3MoveUp")
@be.mapInterface(INotify)
@be.exposureChainTo(EveVirtualCameraBehaviourVector3MoveForward)
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
   *
   * @adapted
   */

  Update(camera, _current, _deltaTime, localElapsedTime, _anchorPosition, anchorRadius, _anchorForwardDirection, out)
  {
    return vec3.scale(out, camera.GetUpDirection(out), this.GetCurrentValue(camera, localElapsedTime, anchorRadius));
  }
}
