import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initProto, _initClass, _init_factionColor, _init_extra_factionColor, _init_useFactionColor, _init_extra_useFactionColor, _init_attributeModifiers, _init_extra_attributeModifiers, _init_customColor, _init_extra_customColor;

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
function resolveGroupColor(customColor, useFactionColor, factionColor, parentColorSet) {
  if (useFactionColor && parentColorSet) {
    const index = factionColor | 0;
    if (index >= 0 && index < parentColorSet.length && parentColorSet[index]) {
      return parentColorSet[index];
    }
  }
  return customColor;
}

/** The shared faction-colour resolution and attribute-modifier surface flattened into every smart-light group implementation. */
let _EveSmartLightBaseGro;
class EveSmartLightBaseGroup extends CjsModel {
  static {
    ({
      e: [_init_factionColor, _init_extra_factionColor, _init_useFactionColor, _init_extra_useFactionColor, _init_attributeModifiers, _init_extra_attributeModifiers, _init_customColor, _init_extra_customColor, _initProto],
      c: [_EveSmartLightBaseGro, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSmartLightBaseGroup",
      family: "eve/smartLights"
    })], [[[io, io.notify, io, io.persist, type, type.int32], 16, "factionColor"], [[io, io.persist, type, type.boolean], 16, "useFactionColor"], [[io, io.persist, void 0, type.list("IEveSmartLightGroupAttributeModifier")], 16, "attributeModifiers"], [[io, io.persist, type, type.color], 16, "customColor"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetGroupColor"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetInheritProperties"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetColor"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetControllerVariable"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("List events carry no BELIST insert mask; the inserted value (or, absent one, the whole list) is re-fanned - SetInheritProperties is idempotent.")], 18, "OnListModified"]], 0, void 0, CjsModel));
  }
  /** m_selectedColor (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] */
  factionColor = (_initProto(this), _init_factionColor(this, -1));

  /** m_useFactionColor (bool) [READWRITE, PERSIST] */
  useFactionColor = (_init_extra_factionColor(this), _init_useFactionColor(this, false));

  /** m_attributeModifiers (PIEveSmartLightGroupAttributeModifierVector) [READ, PERSIST] */
  attributeModifiers = (_init_extra_useFactionColor(this), _init_attributeModifiers(this, []));

  /** m_color (Color) [READWRITE, PERSIST] */
  customColor = (_init_extra_attributeModifiers(this), _init_customColor(this, vec4.createLinear()));

  /** m_parentColorSet (const Color*) - inherited faction color set, never persisted. */
  #parentColorSet = (_init_extra_customColor(this), null);

  /** Faction-aware group color (EveSmartLightBaseGroup.cpp:43-53). */
  GetGroupColor() {
    return resolveGroupColor(this.customColor, this.useFactionColor, this.factionColor, this.#parentColorSet);
  }

  /**
   * Stores the inherited faction color set and fans it out to the attribute
   * modifiers (EveSmartLightBaseGroup.cpp:30-41).
   */
  SetInheritProperties(colorSet) {
    if (colorSet) {
      this.#parentColorSet = colorSet;
    }
    for (const attributeModifier of this.attributeModifiers) {
      attributeModifier?.SetInheritProperties?.(colorSet);
    }
  }

  /** Overwrites the custom color (EveSmartLightBaseGroup.cpp:55-58). */
  SetColor(color) {
    vec4.copy(this.customColor, color);
  }

  /** Fans a controller variable out to the attribute modifiers (EveSmartLightBaseGroup.cpp:60-66). */
  SetControllerVariable(name, value) {
    for (const attributeModifier of this.attributeModifiers) {
      attributeModifier?.SetControllerVariable?.(name, value);
    }
  }

  /**
   * Newly inserted attribute modifiers inherit the parent color set
   * (EveSmartLightBaseGroup.cpp:16-28).
   */
  OnListModified(_event, _key, _key2, value, list) {
    if (list === this.attributeModifiers && this.#parentColorSet) {
      if (value) {
        value.SetInheritProperties?.(this.#parentColorSet);
      } else {
        for (const attributeModifier of this.attributeModifiers) {
          attributeModifier?.SetInheritProperties?.(this.#parentColorSet);
        }
      }
    }
  }
  static {
    _initClass();
  }
}

export { _EveSmartLightBaseGro as EveSmartLightBaseGroup, resolveGroupColor };
//# sourceMappingURL=EveSmartLightBaseGroup.js.map
