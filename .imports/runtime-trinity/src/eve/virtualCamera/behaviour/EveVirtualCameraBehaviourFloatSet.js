// Source: E:\carbonengine\trinity\trinity\Eve\VirtualCamera\EveVirtualCameraBehaviour.h
// Source: E:\carbonengine\trinity\trinity\Eve\VirtualCamera\EveVirtualCameraBehaviour.cpp
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveVirtualCameraBehaviourFloatBase } from "./EveVirtualCameraBehaviourFloatBase.js";


/**
 * Float behaviour that overrides whatever the earlier behaviours accumulated
 * with an authored constant.
 */
@type.define({
  className: "EveVirtualCameraBehaviourFloatSet",
  family: "eve/virtualCamera/behaviour"
})
export class EveVirtualCameraBehaviourFloatSet extends EveVirtualCameraBehaviourFloatBase
{
  @io.persist
  @type.float32
  value = 0;

  /**
   * Stamps the authored behaviour name that identifies this entry in a camera
   * behaviour list.
   */
  constructor()
  {
    super();
    this.name = "Set";
  }

  /**
   * Returns the delta that replaces the incoming value with the authored one,
   * since the camera accumulates behaviour results additively.
   */
  @carbon.method
  @impl.implemented
  Update(_camera, current)
  {
    return this.value - current;
  }
}
