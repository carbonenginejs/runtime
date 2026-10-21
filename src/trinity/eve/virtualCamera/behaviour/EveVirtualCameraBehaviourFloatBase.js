import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.h
// Source: trinity/trinity/Eve/VirtualCamera/EveVirtualCameraBehaviour.cpp
import { IsMatch } from "#blue";
import { INotify } from "../../../../global/blue/INotify.js";
import { meta, type, blue } from "#schema";


/**
 * Base for the virtual camera behaviours that contribute a scalar delta to a
 * camera's field of view or roll each update.
 */
@blue.define({ className: "EveVirtualCameraBehaviourFloatBase", abstract: true })
@blue.inherit(INotify)
@blue.interface(INotify)
export class EveVirtualCameraBehaviourFloatBase
{
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  active = true;

  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.string
  name = "";

  /** Returns the authored behaviour name shown in tooling. */
  @blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * Sets the behaviour name, coercing to a string; subclasses override this to
   * rename the curves they own alongside it.
   */
  @blue.method
  @meta.implemented
  SetName(name)
  {
    this.name = String(name);
  }

  /**
   * Re-applies the current name after a field change, which propagates it to any
   * owned curves through the subclass SetName override.
   */
  @blue.method
  @meta.implemented
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "name")) this.SetName(this.name);
    return true;
  }

  /** Reports whether the camera should evaluate this behaviour this update. */
  @blue.method
  @meta.implemented
  IsActive()
  {
    return this.active;
  }
}

// Exact native Blue exposure: only these identities participate in loading.
