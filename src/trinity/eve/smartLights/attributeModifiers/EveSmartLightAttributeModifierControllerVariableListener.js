// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/attributeModifiers/EveSmartLightAttributeModifierControllerVariableListener.h
import { exposure as be } from "#be";
import { IsMatch } from "#blue";
import { IInitialize } from "../../../../blue/exposure/IInitialize.js";
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type } from "#schema";
import { INotify } from "#blue";
import { EveSmartLightBaseAttributeModifier } from "./EveSmartLightBaseAttributeModifier.js";
import { IEveSmartLightGroupAttributeModifier } from "./IEveSmartLightGroupAttributeModifier.js";
import { EveSmartLightAttributeModifierBucket } from "./EveSmartLightAttributeModifierBucket.js";

/** EveSmartLightAttributeModifierControllerVariableListener (eve/smartLights/attributeModifiers) - generated from schema shapeHash 8438774e.... */
@be.define({
  name: "EveSmartLightAttributeModifierControllerVariableListener",
  inherit: [ IInitialize ],
  // EveSmartLightAttributeModifierControllerVariableListener_Blue.cpp:11-34, in Carbon's order.
  interfaces: [ EveSmartLightAttributeModifierBucket, IEveSmartLightGroupAttributeModifier, EveSmartLightBaseAttributeModifier, IInitialize, INotify ],
  members: [
    [ be.ATTR, "attributeModifiers", be.READ | be.PERSIST | be.NOTIFY ],
    [ be.ATTR, "name", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "variableName", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "value", be.READWRITE | be.PERSIST | be.NOTIFY ],
    [ be.ATTR, "defaultValue", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "invertReceivedValue", be.READWRITE | be.PERSIST | be.NOTIFY ],
    [ be.ATTR, "attributeMultiplier", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "active", be.READ ],
    [ be.ATTR, "crossFadeDuration", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "crossFadeIntensity", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "activationValue", be.READ ],
    [ be.ATTR, "finalAttributeMultiplier", be.READ ]
  ]
})
export class EveSmartLightAttributeModifierControllerVariableListener extends EveSmartLightAttributeModifierBucket
{

  /** m_variableName (std::string) [READWRITE, PERSIST] */

  @type.string
  variableName = "";

  /** m_value (float) [READWRITE, PERSIST, NOTIFY] */


  @type.float32
  value = 0;

  /** m_invertReceivedValue (bool) [READWRITE, PERSIST, NOTIFY] */


  @type.boolean
  invertReceivedValue = false;

  /** m_defaultValue (float) [READWRITE, PERSIST] */

  @type.float32
  defaultValue = 0;

  /**
   * Seeds the listener from its default value before the base crossfade seed
   * (EveSmartLightAttributeModifierControllerVariableListener.cpp:15-21).
   *
   * @implemented
   */

  Initialize()
  {
    this.value = this.defaultValue;
    this.startsActive = this.defaultValue > 0.5;
    this.active = this.defaultValue > 0.5;
    return super.Initialize();
  }

  /**
   * Reapplies the activation state when the received value or the inversion
   * flag is edited, then defers to the base active-edit handling
   * (EveSmartLightAttributeModifierControllerVariableListener.cpp:23-39).
   *
   * @implemented
   */

  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "value") || IsMatch(propertyName, "invertReceivedValue")) this._ApplyValue();
    super.OnModified(propertyName);
    return true;
  }

  /**
   * Receives a controller variable: a name match updates the listener state,
   * and the value always fans out to the child modifiers
   * (EveSmartLightAttributeModifierControllerVariableListener.cpp:41-60).
   *
   * @implemented
   */

  SetControllerVariable(name, value)
  {
    if (this.variableName === name)
    {
      this.value = Number(value);
      this._ApplyValue();
    }

    for (const modifier of this.attributeModifiers)
    {
      modifier.SetControllerVariable(name, value);
    }
  }

  /** Shared value-to-activation mapping (cpp:27-35 and cpp:46-53 are identical). */
  _ApplyValue()
  {
    if (this.invertReceivedValue)
    {
      this.SetActive(this.value < 1);
    }
    else
    {
      this.SetActive(this.value > 0);
    }
  }

}
