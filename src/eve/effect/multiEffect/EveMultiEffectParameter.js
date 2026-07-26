// Source: E:\carbonengine\trinity\trinity\Eve\EveMultiEffectParameter.h
// Source: E:\carbonengine\trinity\trinity\Eve\EveMultiEffectParameter.cpp
// Source: E:\carbonengine\trinity\trinity\Eve\EveMultiEffectParameter_Blue.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { EveEffectRoot2 } from "../../spaceObject/EveEffectRoot2.js";
import { EveSpaceObject2 } from "../../spaceObject/EveSpaceObject2.js";

/**
 * One named slot in an EveMultiEffect, holding the object bound to that name
 * together with the object type the effect expects there.
 */
@type.define({ className: "EveMultiEffectParameter", family: "eve/effect" })
export class EveMultiEffectParameter extends CjsModel
{
  @io.readwrite
  @type.int32
  @schema.enum("ParameterType")
  type = 3;

  @io.persist
  @type.string
  name = "";

  @io.notify
  @io.readwrite
  @type.objectRef("IRoot")
  object = null;

  #owner = null;

  /** Binds an object to this slot, or clears it when given nothing. */
  @carbon.method
  @impl.implemented
  SetParameterObject(object)
  {
    this.object = object ?? null;
  }

  /**
   * Whether the bound object matches the declared parameter type; TYPE_ANYTHING
   * accepts any non-null object, and an unrecognised type accepts none.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon BlueCast checks map to JavaScript instanceof checks against the maintained runtime classes.")
  IsValid()
  {
    if (!this.object) return false;
    switch (this.type)
    {
      case EveMultiEffectParameter.ParameterType.TYPE_EVESPACEOBJECT:
        return this.object instanceof EveSpaceObject2;
      case EveMultiEffectParameter.ParameterType.TYPE_EVEEFFECTROOT:
        return this.object instanceof EveEffectRoot2;
      case EveMultiEffectParameter.ParameterType.TYPE_ANYTHING:
        return true;
      default:
        return false;
    }
  }

  /**
   * Sets the effect rebound when this slot's object changes; passing nothing
   * detaches the slot.
   */
  @carbon.method
  @impl.implemented
  SetOwner(owner)
  {
    this.#owner = owner ?? null;
  }

  /** The object bound to this slot, or null. */
  @carbon.method
  @impl.implemented
  GetParameterObject()
  {
    return this.object;
  }

  /** The name bindings and controllers use to reach this slot. */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * Rebinds the owning effect after a model update, since the bound object is
   * the slot's only notifying field.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("The runtime settle hook receives the completed model update rather than Carbon's Be::Var pointer; object is the only notifying field.")
  OnModified()
  {
    this.#owner?.Rebind?.();
    return true;
  }

  static ParameterType = Object.freeze({
    TYPE_EVESPACEOBJECT: 0,
    TYPE_EVEEFFECTROOT: 1,
    TYPE_ANYTHING: 2,
    TYPE_UNDEFINED: 3,
  });

}
