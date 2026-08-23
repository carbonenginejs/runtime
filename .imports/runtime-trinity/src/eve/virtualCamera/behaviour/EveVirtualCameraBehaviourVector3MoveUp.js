// Source: E:\carbonengine\trinity\trinity\Eve\VirtualCamera\EveVirtualCameraBehaviour.h
// Source: E:\carbonengine\trinity\trinity\Eve\VirtualCamera\EveVirtualCameraBehaviour.cpp
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { carbon, impl, type } from "@carbonenginejs/runtime-utils/schema";
import { EveVirtualCameraBehaviourVector3MoveForward } from "./EveVirtualCameraBehaviourVector3MoveForward.js";


/**
 * Vector3 behaviour that displaces the camera along its own up axis by a
 * curve-shaped distance.
 */
@type.define({
  className: "EveVirtualCameraBehaviourVector3MoveUp",
  family: "eve/virtualCamera/behaviour"
})
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
  @carbon.method
  @impl.adapted
  Update(camera, _current, _deltaTime, localElapsedTime, _anchorPosition, anchorRadius, _anchorForwardDirection, out = vec3.create())
  {
    return vec3.scale(out, camera.GetUpDirection(out), this.GetCurrentValue(camera, localElapsedTime, anchorRadius));
  }
}
