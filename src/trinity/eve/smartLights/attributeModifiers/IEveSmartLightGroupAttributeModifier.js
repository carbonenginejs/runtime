// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/attributeModifiers/IEveSmartLightGroupAttributeModifier.h
import { meta, blue } from "#schema";
import { EveSmartLightBaseAttributeModifier } from "./EveSmartLightBaseAttributeModifier.js";


/** Required smart-light group attribute-modifier contract. */
@blue.define("IEveSmartLightGroupAttributeModifier")
export class IEveSmartLightGroupAttributeModifier extends EveSmartLightBaseAttributeModifier
{

  /** Updates modifier state for the current smart-light group activation. */
  @blue.method
  @meta.abstract
  UpdateSyncronous(_updateContext, _params, _activationMultiplier)
  {
    throw new Error("IEveSmartLightGroupAttributeModifier.UpdateSyncronous must be implemented by a concrete modifier.");
  }

  /** Applies this modifier to one smart-light attribute. */
  @blue.method
  @meta.abstract
  ProcessAttributeModifier(_attribute, _placement, _entityPosition, _entityDirection, _modifierStrength)
  {
    throw new Error("IEveSmartLightGroupAttributeModifier.ProcessAttributeModifier must be implemented by a concrete modifier.");
  }

  /** Accepts an optional controller variable. */
  @blue.method
  @meta.noop
  SetControllerVariable(_name, _value)
  {
  }

  /** Accepts optional inherited colour properties. */
  @blue.method
  @meta.noop
  SetInheritProperties(_colorSet)
  {
  }

}
