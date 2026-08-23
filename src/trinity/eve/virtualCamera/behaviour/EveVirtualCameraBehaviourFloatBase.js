// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.h
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";


/**
 * Base for the virtual camera behaviours that contribute a scalar delta to a
 * camera's field of view or roll each update.
 */
@type.define({
  className: "EveVirtualCameraBehaviourFloatBase",
  family: "eve/virtualCamera/behaviour"
})
export class EveVirtualCameraBehaviourFloatBase extends CjsModel
{
  @io.persist
  @type.boolean
  active = true;

  @io.notify
  @io.persist
  @type.string
  name = "";

  /** Returns the authored behaviour name shown in tooling. */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * Sets the behaviour name, coercing to a string; subclasses override this to
   * rename the curves they own alongside it.
   */
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    this.name = String(name);
  }

  /**
   * Re-applies the current name after a field change, which propagates it to any
   * owned curves through the subclass SetName override.
   */
  @carbon.method
  @impl.adapted
  OnModified(_options = {})
  {
    this.SetName(this.name);
    return true;
  }

  /** Reports whether the camera should evaluate this behaviour this update. */
  @carbon.method
  @impl.implemented
  IsActive()
  {
    return this.active;
  }
}
