// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.h
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp
import { meta, type, blue } from "#schema";
import { INotify } from "#blue";
import { EveVirtualCameraBehaviourFloatBase } from "./EveVirtualCameraBehaviourFloatBase.js";


/**
 * Float behaviour that overrides whatever the earlier behaviours accumulated
 * with an authored constant.
 */
@blue.define("EveVirtualCameraBehaviourFloatSet")
@blue.interface(INotify)
@blue.chainTo(EveVirtualCameraBehaviourFloatBase)
export class EveVirtualCameraBehaviourFloatSet extends EveVirtualCameraBehaviourFloatBase
{
  @blue.readwrite
  @blue.persist
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
  @blue.method
  @meta.implemented
  Update(_camera, current)
  {
    return this.value - current;
  }
}
