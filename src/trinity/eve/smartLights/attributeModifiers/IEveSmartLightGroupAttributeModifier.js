// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/attributeModifiers/IEveSmartLightGroupAttributeModifier.h
import { carbon, impl, type } from "#schema";
import { EveSmartLightBaseAttributeModifier } from "./EveSmartLightBaseAttributeModifier.js";


/** Required smart-light group attribute-modifier contract. */
@type.define({ className: "IEveSmartLightGroupAttributeModifier", family: "eve/smartLights/attributeModifiers" })
export class IEveSmartLightGroupAttributeModifier extends EveSmartLightBaseAttributeModifier
{

  /** Updates modifier state for the current smart-light group activation. */
  @carbon.method
  @impl.abstract
  UpdateSyncronous(_updateContext, _params, _activationMultiplier)
  {
    throw new Error("IEveSmartLightGroupAttributeModifier.UpdateSyncronous must be implemented by a concrete modifier.");
  }

  /** Applies this modifier to one smart-light attribute. */
  @carbon.method
  @impl.abstract
  ProcessAttributeModifier(_attribute, _placement, _entityPosition, _entityDirection, _modifierStrength)
  {
    throw new Error("IEveSmartLightGroupAttributeModifier.ProcessAttributeModifier must be implemented by a concrete modifier.");
  }

  /** Accepts an optional controller variable. */
  @carbon.method
  @impl.noop
  SetControllerVariable(_name, _value)
  {
  }

  /** Accepts optional inherited colour properties. */
  @carbon.method
  @impl.noop
  SetInheritProperties(_colorSet)
  {
  }

}
