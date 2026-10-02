import { INotify } from "../../../../global/blue/INotify.js";
// Source: trinity/trinity/Eve/EveMultiEffectParameter.h
// Source: trinity/trinity/Eve/EveMultiEffectParameter.cpp
// Source: trinity/trinity/Eve/EveMultiEffectParameter_Blue.cpp
import { meta } from "#schema";
import { EveEffectRoot2 } from "../../spaceObject/EveEffectRoot2.js";
import { EveSpaceObject2 } from "../../spaceObject/EveSpaceObject2.js";
import { ParameterType } from "../../../generated/eve/enums.js";
import { IsMatch, blue, EnumRegistrationType } from "#blue";

/**
 * One named slot in an EveMultiEffect, holding the object bound to that name
 * together with the object type the effect expects there.
 */
@meta.define({ className: "EveMultiEffectParameter", family: "eve/effect" })
@meta.blue.inherit(INotify)
export class EveMultiEffectParameter
{
  @meta.blue.readwrite
  @meta.type.int32
  @meta.type.enum("trinity.EveMultiEffectParameter.ParameterType")
  type = 3;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.objectRef("IRoot")
  object = null;

  _owner = null;

  /** Binds an object to this slot, or clears it when given nothing. */
  @meta.blue.method
  @meta.implemented
  SetParameterObject(object)
  {
    this.object = object ?? null;
  }

  /**
   * Whether the bound object matches the declared parameter type; TYPE_ANYTHING
   * accepts any non-null object, and an unrecognised type accepts none.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon BlueCast checks map to JavaScript instanceof checks against the maintained runtime classes.")
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
  @meta.blue.method
  @meta.implemented
  SetOwner(owner)
  {
    this._owner = owner ?? null;
  }

  /** The object bound to this slot, or null. */
  @meta.blue.method
  @meta.implemented
  GetParameterObject()
  {
    return this.object;
  }

  /** The name bindings and controllers use to reach this slot. */
  @meta.blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * Rebinds the owning effect after a model update, since the bound object is
   * the slot's only notifying field.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("JS dispatches the native hook using the exposed member name; existing class-owned rendering/resource adaptations remain unchanged.")
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "object") && this._owner) this._owner.Rebind();
    return true;
  }

  static ParameterType = ParameterType;

}

// Registered as Carbon registers it (trinity/trinity/Eve/EveMultiEffectParameter_Blue.cpp:16).
blue.enums.RegisterEnum("trinity.EveMultiEffectParameter.ParameterType", EveMultiEffectParameter.ParameterType, {
  source: "trinity/trinity/Eve/EveMultiEffectParameter.h", family: "eve/effect", line: 16,
  exposedName: "EveMultiEffectParameterType", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Eve/EveMultiEffectParameter_Blue.cpp:8",
  chooser: [
    { name: "EveSpaceObject2", value: EveMultiEffectParameter.ParameterType.TYPE_EVESPACEOBJECT, description: "The parameter is of EveSpaceObject2 type" },
    { name: "EveEffectRoot2", value: EveMultiEffectParameter.ParameterType.TYPE_EVEEFFECTROOT, description: "The parameter is of EveEffectRoot2 type" },
    { name: "Anything", value: EveMultiEffectParameter.ParameterType.TYPE_ANYTHING, description: "The parameter can be anything" },
    { name: "Undefined", value: EveMultiEffectParameter.ParameterType.TYPE_UNDEFINED, description: "The parameter is of an undefined type" }
  ]
});

// Exact native Blue exposure: only these identities participate in loading.
meta.blue.interfaceTable({ interfaces: [INotify], chainTo: null })(EveMultiEffectParameter, { kind: "class" });
