import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/attributeModifiers/EveSmartLightAttributeModifierControllerVariableListener.h
import { IsMatch } from "#blue";
import { IInitialize } from "../../../../global/blue/IInitialize.js";
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta, type, blue } from "#schema";
import { INotify } from "#blue";
import { EveSmartLightBaseAttributeModifier } from "./EveSmartLightBaseAttributeModifier.js";
import { IEveSmartLightGroupAttributeModifier } from "./IEveSmartLightGroupAttributeModifier.js";
import { EveSmartLightAttributeModifierBucket } from "./EveSmartLightAttributeModifierBucket.js";

/** EveSmartLightAttributeModifierControllerVariableListener (eve/smartLights/attributeModifiers) - generated from schema shapeHash 8438774e.... */
@blue.define({
  className: "EveSmartLightAttributeModifierControllerVariableListener",
  fields: [{ name: "active", type: { kind: "boolean" }, edit: { read: true, write: false, persist: false, notify: false }, carbon: { member: true } }]
})
@blue.inherit(IInitialize)
@blue.interface(EveSmartLightAttributeModifierBucket, IEveSmartLightGroupAttributeModifier, EveSmartLightBaseAttributeModifier, IInitialize, INotify)
export class EveSmartLightAttributeModifierControllerVariableListener extends EveSmartLightAttributeModifierBucket
{

  /** m_variableName (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  variableName = "";

  /** m_value (float) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.float32
  value = 0;

  /** m_invertReceivedValue (bool) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.boolean
  invertReceivedValue = false;

  /** m_defaultValue (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  defaultValue = 0;

  /**
   * Seeds the listener from its default value before the base crossfade seed
   * (EveSmartLightAttributeModifierControllerVariableListener.cpp:15-21).
   */
  @blue.method
  @meta.implemented
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
   */
  @blue.method
  @meta.implemented
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
   */
  @blue.method
  @meta.implemented
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
