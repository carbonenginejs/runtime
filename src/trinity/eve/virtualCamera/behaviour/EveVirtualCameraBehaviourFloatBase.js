import { INotify } from "../../../../global/blue/INotify.js";
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.h
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp
import { meta } from "#schema";


/**
 * Base for the virtual camera behaviours that contribute a scalar delta to a
 * camera's field of view or roll each update.
 */
@meta.define({
  className: "EveVirtualCameraBehaviourFloatBase",
  family: "eve/virtualCamera/behaviour"
})
@meta.blue.inherit(INotify)
export class EveVirtualCameraBehaviourFloatBase
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  active = true;

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** Returns the authored behaviour name shown in tooling. */
  @meta.blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * Sets the behaviour name, coercing to a string; subclasses override this to
   * rename the curves they own alongside it.
   */
  @meta.blue.method
  @meta.implemented
  SetName(name)
  {
    this.name = String(name);
  }

  /**
   * Re-applies the current name after a field change, which propagates it to any
   * owned curves through the subclass SetName override.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("JS dispatches the native hook using the exposed member name; existing class-owned rendering/resource adaptations remain unchanged.")
  OnModified(propertyName)
  {
    if (propertyName === "name") this.SetName(this.name);
    return true;
  }

  /** Reports whether the camera should evaluate this behaviour this update. */
  @meta.blue.method
  @meta.implemented
  IsActive()
  {
    return this.active;
  }
}

// Exact native Blue exposure: only these identities participate in loading.
meta.blue.interfaceTable({ interfaces: [INotify], chainTo: null })(EveVirtualCameraBehaviourFloatBase, { kind: "class" });
