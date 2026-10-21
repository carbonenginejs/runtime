import { IRoot } from "../../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/EveMultiEffectParameter.h
// Source: trinity/trinity/Eve/EveMultiEffectParameter.cpp
// Source: trinity/trinity/Eve/EveMultiEffectParameter_Blue.cpp
import { INotify } from "../../../../global/blue/INotify.js";
import { CjsSchema, meta, type, blue } from "#schema";
import { EveEffectRoot2 } from "../../spaceObject/EveEffectRoot2.js";
import { EveSpaceObject2 } from "../../spaceObject/EveSpaceObject2.js";
import { ParameterType } from "../../../generated/eve/enums.js";
import { IsMatch, blue as be } from "#blue";

/**
 * One named slot in an EveMultiEffect, holding the object bound to that name
 * together with the object type the effect expects there.
 */
@blue.define("EveMultiEffectParameter")
@blue.inherit(INotify)
@blue.interface(INotify)
export class EveMultiEffectParameter extends IRoot
{
  @blue.readwrite
  @type.int32
  @type.enum("trinity.EveMultiEffectParameter.ParameterType")
  type = 3;

  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  @blue.notify
  @blue.readwrite
  @type.object.ref("IRoot")
  object = null;

  _owner = null;

  /**
   * Carbon MAP_PROPERTY_READONLY "isValid" over IsValid
   * (EveMultiEffectParameter_Blue.cpp:26): whether the bound object matches
   * the declared parameter type.
   */
  @blue.property()
  @type.boolean
  @meta.implemented
  get isValid()
  {
    return this.IsValid();
  }

  /** Binds an object to this slot, or clears it when given nothing. */

  @meta.implemented
  SetParameterObject(object)
  {
    this.object = object ?? null;
  }

  /**
   * Whether the bound object matches the declared parameter type; TYPE_ANYTHING
   * accepts any non-null object, and an unrecognised type accepts none
   * (Carbon's BlueCastPtr to the concrete class).
   */

  @meta.implemented
  IsValid()
  {
    if (!this.object) return false;
    switch (this.type)
    {
      case EveMultiEffectParameter.ParameterType.TYPE_EVESPACEOBJECT:
        return CjsSchema.cast(this.object, EveSpaceObject2) !== null;
      case EveMultiEffectParameter.ParameterType.TYPE_EVEEFFECTROOT:
        return CjsSchema.cast(this.object, EveEffectRoot2) !== null;
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

  @meta.implemented
  SetOwner(owner)
  {
    this._owner = owner ?? null;
  }

  /** The object bound to this slot, or null. */

  @meta.implemented
  GetParameterObject()
  {
    return this.object;
  }

  /** The name bindings and controllers use to reach this slot. */

  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * Rebinds the owning effect after a model update, since the bound object is
   * the slot's only notifying field.
   */

  @meta.implemented
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "object") && this._owner) this._owner.Rebind();
    return true;
  }

  static ParameterType = ParameterType;

}


// Exact native Blue exposure: only these identities participate in loading.
