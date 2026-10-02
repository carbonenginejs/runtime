import { IInitialize } from "../../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/attributeModifiers/EveSmartLightAttributeModifierControllerVariableListener.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";
import { EveSmartLightAttributeModifierBucket } from "./EveSmartLightAttributeModifierBucket.js";

/** EveSmartLightAttributeModifierControllerVariableListener (eve/smartLights/attributeModifiers) - generated from schema shapeHash 8438774e.... */
@meta.define({ className: "EveSmartLightAttributeModifierControllerVariableListener", family: "eve/smartLights/attributeModifiers" })
@meta.blue.inherit(IInitialize)
@meta.blue.mapInterface(IInitialize)
export class EveSmartLightAttributeModifierControllerVariableListener extends EveSmartLightAttributeModifierBucket
{

  /** m_variableName (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  variableName = "";

  /** m_value (float) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  value = 0;

  /** m_invertReceivedValue (bool) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  invertReceivedValue = false;

  /** m_defaultValue (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  defaultValue = 0;

  /**
   * Seeds the listener from its default value before the base crossfade seed
   * (EveSmartLightAttributeModifierControllerVariableListener.cpp:15-21).
   */
  @meta.blue.method
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
  @meta.blue.method
  @meta.adapted
  @meta.reason("JS identifies Carbon's changed member address by its exposed property name.")
  OnModified(propertyName)
  {
    if (propertyName === "value" || propertyName === "invertReceivedValue") this._ApplyValue();
    super.OnModified(propertyName);
    return true;
  }

  /**
   * Receives a controller variable: a name match updates the listener state,
   * and the value always fans out to the child modifiers
   * (EveSmartLightAttributeModifierControllerVariableListener.cpp:41-60).
   */
  @meta.blue.method
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
