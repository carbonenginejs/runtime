// Source: E:\carbonengine\trinity\trinity\Eve\VirtualCamera\EveVirtualCameraBehaviour.h
// Source: E:\carbonengine\trinity\trinity\Eve\VirtualCamera\EveVirtualCameraBehaviour.cpp
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveVirtualCameraBehaviourVector3Base } from "./EveVirtualCameraBehaviourVector3Base.js";


/**
 * Vector3 behaviour that applies a fixed, time-independent displacement, either
 * in world space or in the anchor's yaw frame.
 */
@type.define({
  className: "EveVirtualCameraBehaviourVector3Offset",
  family: "eve/virtualCamera/behaviour"
})
export class EveVirtualCameraBehaviourVector3Offset extends EveVirtualCameraBehaviourVector3Base
{
  @io.persist
  @type.boolean
  proportional = true;

  @io.persist
  @type.boolean
  world = false;

  @io.persist
  @type.vec3
  offset = vec3.create();

  /**
   * Names the behaviour "Offset"; it owns no curves, so the offset is constant
   * over the timeline.
   */
  constructor()
  {
    super();
    this.name = "Offset";
  }

  /**
   * Returns the authored offset, yawed into the anchor's heading unless world is
   * set and multiplied by the anchor radius when proportional is set; it ignores
   * time and delta time entirely.
   */
  @carbon.method
  @impl.adapted
  Update(_camera, _current, _deltaTime, _localElapsedTime, _anchorPosition, anchorRadius, anchorForwardDirection, out = vec3.create())
  {
    if (this.world)
    {
      vec3.copy(out, this.offset);
    }
    else
    {
      EveVirtualCameraBehaviourVector3Base.rotateVectorWithAnchor(out, this.offset, anchorForwardDirection);
    }
    if (this.proportional)
    {
      vec3.scale(out, out, anchorRadius);
    }
    return out;
  }
}
