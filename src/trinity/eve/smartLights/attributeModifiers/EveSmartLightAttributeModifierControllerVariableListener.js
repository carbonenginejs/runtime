// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/attributeModifiers/EveSmartLightAttributeModifierControllerVariableListener.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, edit, type } from "#schema";
import { EveSmartLightAttributeModifierBucket } from "./EveSmartLightAttributeModifierBucket.js";

/** EveSmartLightAttributeModifierControllerVariableListener (eve/smartLights/attributeModifiers) - generated from schema shapeHash 8438774e.... */
@type.define({ className: "EveSmartLightAttributeModifierControllerVariableListener", family: "eve/smartLights/attributeModifiers" })
export class EveSmartLightAttributeModifierControllerVariableListener extends EveSmartLightAttributeModifierBucket
{

  /** m_variableName (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  variableName = "";

  /** m_value (float) [READWRITE, PERSIST, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.float32
  value = 0;

  /** m_invertReceivedValue (bool) [READWRITE, PERSIST, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.boolean
  invertReceivedValue = false;

  /** m_defaultValue (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  defaultValue = 0;

  /**
   * Seeds the listener from its default value before the base crossfade seed
   * (EveSmartLightAttributeModifierControllerVariableListener.cpp:15-21).
   */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.adapted
  @impl.reason("JS identifies Carbon's changed member address by its exposed property name.")
  OnModified(propertyName)
  {
    if (propertyName === "value" || propertyName === "invertReceivedValue") this.#ApplyValue();
    super.OnModified(propertyName);
    return true;
  }

  /**
   * Receives a controller variable: a name match updates the listener state,
   * and the value always fans out to the child modifiers
   * (EveSmartLightAttributeModifierControllerVariableListener.cpp:41-60).
   */
  @carbon.method
  @impl.implemented
  SetControllerVariable(name, value)
  {
    if (this.variableName === name)
    {
      this.value = Number(value);
      this.#ApplyValue();
    }

    for (const modifier of this.attributeModifiers)
    {
      modifier.SetControllerVariable(name, value);
    }
  }

  /** Shared value-to-activation mapping (cpp:27-35 and cpp:46-53 are identical). */
  #ApplyValue()
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
