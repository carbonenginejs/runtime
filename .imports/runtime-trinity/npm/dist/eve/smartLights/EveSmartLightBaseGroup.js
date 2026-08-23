import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { resolveFactionColor } from '../resolveFactionColor.js';
import { BELIST_INSERTED } from '../../controllers/contracts.js';

let _initProto, _initClass, _init_factionColor, _init_extra_factionColor, _init_useFactionColor, _init_extra_useFactionColor, _init_attributeModifiers, _init_extra_attributeModifiers, _init_customColor, _init_extra_customColor;

/**
 * Faction-color resolution shared by every class that flattens Carbon's
 * EveSmartLightBaseGroup secondary base (EveSmartLightBaseGroup.cpp:43-53):
 * the selected faction color when enabled and in range, otherwise the custom
 * color. Carbon's bound is SOFDataFactionColorChooser::TYPE_MAX; the inherited
 * JS accepts Carbon's array and the combined runtime's named SOF colour-set
 * model. The resolved value is copied into caller-owned storage.
 * @param {Float32Array} customColor
 * @param {Boolean} useFactionColor
 * @param {Number} factionColor
 * @param {Array|Object|null} parentColorSet
 * @param {Float32Array} out
 * @returns {Float32Array}
 */
function resolveGroupColor(customColor, useFactionColor, factionColor, parentColorSet, out = vec4.createLinear()) {
  return resolveFactionColor(out, customColor, useFactionColor, factionColor, parentColorSet);
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
    })], [[[io, io.notify, io, io.persist, type, type.int32], 16, "factionColor"], [[io, io.persist, type, type.boolean], 16, "useFactionColor"], [[io, io.persist, void 0, type.list("IEveSmartLightGroupAttributeModifier")], 16, "attributeModifiers"], [[io, io.persist, type, type.color], 16, "customColor"], [[carbon, carbon.method, impl, impl.noop], 18, "UpdateAsyncronous"], [[carbon, carbon.method, impl, impl.noop], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.noop], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.noop], 18, "GetRenderables"], [[carbon, carbon.method, impl, impl.noop], 18, "AddQuadsToQuadRenderer"], [[carbon, carbon.method, impl, impl.noop], 18, "RegisterWithQuadRenderer"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetGroupColor"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetInheritProperties"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetColor"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetControllerVariable"], [[carbon, carbon.method, impl, impl.implemented], 18, "OnListModified"]], 0, void 0, CjsModel));
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

  /** Caller-owned faction-colour result; never aliases the SOF model. */
  #resolvedGroupColor = vec4.createLinear();

  /** IEveSmartLightGroup default: no asynchronous work. */
  UpdateAsyncronous(_updateContext, _params, _distribution) {}

  /** IEveSmartLightGroup default: no synchronous work. */
  UpdateSyncronous(_updateContext, _params, _distribution) {}

  /** IEveSmartLightGroup default: no visibility state. */
  UpdateVisibility(_updateContext, _parentTransform, _parentLod) {}

  /** IEveSmartLightGroup default: contributes no renderables. */
  GetRenderables(renderables = []) {
    return renderables;
  }

  /** IEveSmartLightGroup default: contributes no quads. */
  AddQuadsToQuadRenderer(_placements, _size, _frustum, _quadRenderer) {}

  /** IEveSmartLightGroup default: registers no quad effect. */
  RegisterWithQuadRenderer(_quadRenderer) {}

  /** Faction-aware group color (EveSmartLightBaseGroup.cpp:43-53). */
  GetGroupColor() {
    return resolveGroupColor(this.customColor, this.useFactionColor, this.factionColor, this.#parentColorSet, this.#resolvedGroupColor);
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
      attributeModifier.SetInheritProperties(colorSet);
    }
  }

  /** Overwrites the custom color (EveSmartLightBaseGroup.cpp:55-58). */
  SetColor(color) {
    vec4.copy(this.customColor, color);
  }

  /** Fans a controller variable out to the attribute modifiers (EveSmartLightBaseGroup.cpp:60-66). */
  SetControllerVariable(name, value) {
    for (const attributeModifier of this.attributeModifiers) {
      attributeModifier.SetControllerVariable(name, value);
    }
  }

  /**
   * Newly inserted attribute modifiers inherit the parent color set
   * (EveSmartLightBaseGroup.cpp:16-28).
   */
  OnListModified(event, _key, _key2, value, list) {
    if (list === this.attributeModifiers && Number(event) === BELIST_INSERTED && this.#parentColorSet && value) {
      value.SetInheritProperties(this.#parentColorSet);
    }
  }
  static {
    _initClass();
  }
}

export { _EveSmartLightBaseGro as EveSmartLightBaseGroup, resolveGroupColor };
//# sourceMappingURL=EveSmartLightBaseGroup.js.map
