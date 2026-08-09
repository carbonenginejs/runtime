// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveSmartLightBaseGroup.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";

/**
 * Faction-color resolution shared by every class that flattens Carbon's
 * EveSmartLightBaseGroup secondary base (EveSmartLightBaseGroup.cpp:43-53):
 * the selected faction color when enabled and in range, otherwise the custom
 * color. Carbon's bound is SOFDataFactionColorChooser::TYPE_MAX; the inherited
 * JS color set (EveChildInheritProperties.GetProperties()) is exactly that
 * array, so its length is the bound. Returns a live vec4 - callers read only.
 * @param {Float32Array} customColor
 * @param {Boolean} useFactionColor
 * @param {Number} factionColor
 * @param {Array|null} parentColorSet
 * @returns {Float32Array}
 */
export function resolveGroupColor(customColor, useFactionColor, factionColor, parentColorSet)
{
  if (useFactionColor && parentColorSet)
  {
    const index = factionColor | 0;
    if (index >= 0 && index < parentColorSet.length && parentColorSet[index])
    {
      return parentColorSet[index];
    }
  }
  return customColor;
}

/** The shared faction-colour resolution and attribute-modifier surface flattened into every smart-light group implementation. */
@type.define({ className: "EveSmartLightBaseGroup", family: "eve/smartLights" })
export class EveSmartLightBaseGroup extends CjsModel
{

  /** m_selectedColor (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @io.notify
  @io.persist
  @type.int32
  factionColor = -1;

  /** m_useFactionColor (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  useFactionColor = false;

  /** m_attributeModifiers (PIEveSmartLightGroupAttributeModifierVector) [READ, PERSIST] */
  @io.persist
  @type.list("IEveSmartLightGroupAttributeModifier")
  attributeModifiers = [];

  /** m_color (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  customColor = vec4.createLinear();

  /** m_parentColorSet (const Color*) - inherited faction color set, never persisted. */
  #parentColorSet = null;

  /** Faction-aware group color (EveSmartLightBaseGroup.cpp:43-53). */
  @carbon.method
  @impl.implemented
  GetGroupColor()
  {
    return resolveGroupColor(this.customColor, this.useFactionColor, this.factionColor, this.#parentColorSet);
  }

  /**
   * Stores the inherited faction color set and fans it out to the attribute
   * modifiers (EveSmartLightBaseGroup.cpp:30-41).
   */
  @carbon.method
  @impl.implemented
  SetInheritProperties(colorSet)
  {
    if (colorSet)
    {
      this.#parentColorSet = colorSet;
    }

    for (const attributeModifier of this.attributeModifiers)
    {
      attributeModifier?.SetInheritProperties?.(colorSet);
    }
  }

  /** Overwrites the custom color (EveSmartLightBaseGroup.cpp:55-58). */
  @carbon.method
  @impl.implemented
  SetColor(color)
  {
    vec4.copy(this.customColor, color);
  }

  /** Fans a controller variable out to the attribute modifiers (EveSmartLightBaseGroup.cpp:60-66). */
  @carbon.method
  @impl.implemented
  SetControllerVariable(name, value)
  {
    for (const attributeModifier of this.attributeModifiers)
    {
      attributeModifier?.SetControllerVariable?.(name, value);
    }
  }

  /**
   * Newly inserted attribute modifiers inherit the parent color set
   * (EveSmartLightBaseGroup.cpp:16-28).
   */
  @carbon.method
  @impl.adapted
  @impl.reason("List events carry no BELIST insert mask; the inserted value (or, absent one, the whole list) is re-fanned - SetInheritProperties is idempotent.")
  OnListModified(_event, _key, _key2, value, list)
  {
    if (list === this.attributeModifiers && this.#parentColorSet)
    {
      if (value)
      {
        value.SetInheritProperties?.(this.#parentColorSet);
      }
      else
      {
        for (const attributeModifier of this.attributeModifiers)
        {
          attributeModifier?.SetInheritProperties?.(this.#parentColorSet);
        }
      }
    }
  }

}
