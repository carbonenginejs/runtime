import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/attributeModifiers/IEveSmartLightGroupAttributeModifier.h
import { EveSmartLightBaseAttributeModifier } from "./EveSmartLightBaseAttributeModifier.js";


/** Required smart-light group attribute-modifier contract. */
@be.interface("IEveSmartLightGroupAttributeModifier")
export class IEveSmartLightGroupAttributeModifier extends EveSmartLightBaseAttributeModifier
{

  /**
   * Updates modifier state for the current smart-light group activation.
   *
   * @abstract
   */
  @be.abstract
  UpdateSyncronous(_updateContext, _params, _activationMultiplier) {}

  /**
   * Applies this modifier to one smart-light attribute.
   *
   * @abstract
   */
  @be.abstract
  ProcessAttributeModifier(_attribute, _placement, _entityPosition, _entityDirection, _modifierStrength) {}

  /**
   * Accepts an optional controller variable.
   *
   * @adapted
   */

  SetControllerVariable(_name, _value)
  {
  }

  /**
   * Accepts optional inherited colour properties.
   *
   * @adapted
   */

  SetInheritProperties(_colorSet)
  {
  }

}
