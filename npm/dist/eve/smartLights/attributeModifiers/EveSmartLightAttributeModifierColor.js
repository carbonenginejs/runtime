import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveSmartLightBaseAttributeModifier as _EveSmartLightBaseAtt } from './EveSmartLightBaseAttributeModifier.js';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initProto, _initClass, _init_factionColor, _init_extra_factionColor, _init_blendValue, _init_extra_blendValue, _init_useFactionColor, _init_extra_useFactionColor, _init_blendColor, _init_extra_blendColor, _init_brightnessMultiplier, _init_extra_brightnessMultiplier, _init_saturationMultiplier, _init_extra_saturationMultiplier;

/** EveSmartLightAttributeModifierColor (eve/smartLights/attributeModifiers) - generated from schema shapeHash 1d22dfd5.... */
let _EveSmartLightAttribu;
class EveSmartLightAttributeModifierColor extends _EveSmartLightBaseAtt {
  static {
    ({
      e: [_init_factionColor, _init_extra_factionColor, _init_blendValue, _init_extra_blendValue, _init_useFactionColor, _init_extra_useFactionColor, _init_blendColor, _init_extra_blendColor, _init_brightnessMultiplier, _init_extra_brightnessMultiplier, _init_saturationMultiplier, _init_extra_saturationMultiplier, _initProto],
      c: [_EveSmartLightAttribu, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSmartLightAttributeModifierColor",
      family: "eve/smartLights/attributeModifiers"
    })], [[[io, io.notify, io, io.persist, type, type.int32], 16, "factionColor"], [[io, io.persist, type, type.float32], 16, "blendValue"], [[io, io.persist, type, type.boolean], 16, "useFactionColor"], [[io, io.persist, type, type.color], 16, "blendColor"], [[io, io.persist, type, type.float32], 16, "brightnessMultiplier"], [[io, io.persist, type, type.float32], 16, "saturationMultiplier"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetInheritProperties"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetGroupColor"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "ProcessAttributeModifier"]], 0, void 0, _EveSmartLightBaseAtt));
  }
  /** m_selectedColor (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] */
  factionColor = (_initProto(this), _init_factionColor(this, -1));

  /** m_blendValue (float) [READWRITE, PERSIST] */
  blendValue = (_init_extra_factionColor(this), _init_blendValue(this, 1));

  /** m_useFactionColor (bool) [READWRITE, PERSIST] */
  useFactionColor = (_init_extra_blendValue(this), _init_useFactionColor(this, false));

  /** m_blendColor (Color) [READWRITE, PERSIST] */
  blendColor = (_init_extra_useFactionColor(this), _init_blendColor(this, vec4.createLinear()));

  /** m_brightnessMultiplier (float) [READWRITE, PERSIST] */
  brightnessMultiplier = (_init_extra_blendColor(this), _init_brightnessMultiplier(this, 1));

  /** m_saturationMultiplier (float) [READWRITE, PERSIST] */
  saturationMultiplier = (_init_extra_brightnessMultiplier(this), _init_saturationMultiplier(this, 1));

  /** m_parentColorSet (const Color*) - inherited faction color set, never persisted. */
  #parentColorSet = (_init_extra_saturationMultiplier(this), null);

  /** Stores the inherited faction color set (EveSmartLightAttributeModifierColor.cpp:18-24). */
  SetInheritProperties(colorSet) {
    if (colorSet) {
      this.#parentColorSet = colorSet;
    }
  }

  /**
   * Resolves the blend color: the selected faction color when enabled and in
   * range, otherwise the authored blend color
   * (EveSmartLightAttributeModifierColor.cpp:26-36). Carbon's bound is
   * SOFDataFactionColorChooser::TYPE_MAX; the inherited JS color set is
   * exactly that array, so its length is the bound.
   */
  GetGroupColor() {
    if (this.useFactionColor && this.#parentColorSet) {
      const index = this.factionColor | 0;
      if (index >= 0 && index < this.#parentColorSet.length && this.#parentColorSet[index]) {
        return this.#parentColorSet[index];
      }
    }
    return this.blendColor;
  }

  /** Advances the crossfade state machine (EveSmartLightAttributeModifierColor.cpp:38-41). */
  UpdateSyncronous(updateContext, _params, activationMultiplier) {
    this.UpdateActivationStrength(activationMultiplier, updateContext?.GetDeltaT?.() ?? 0);
  }

  /**
   * Blends the attribute color toward the group color, applies the
   * activation-scaled saturation and brightness multipliers, and clamps to
   * [0, 1] (EveSmartLightAttributeModifierColor.cpp:43-69). Component math
   * only - no allocation.
   */
  ProcessAttributeModifier(attribute, placement, _entityPosition, _entityDirection, modifierStrength) {
    const activationStrength = this.GetActivationStrength(placement) * modifierStrength;
    if (activationStrength <= 0) {
      return;
    }
    const activationAdjustedBrightnessMultiplier = 1 + activationStrength * (this.brightnessMultiplier - 1);
    const activationAdjustedBlendValue = activationStrength * this.blendValue;
    const activationAdjustedSaturationMultiplier = 1 + activationStrength * (this.saturationMultiplier - 1);
    const groupColor = this.GetGroupColor();
    let r = attribute[0] + (groupColor[0] - attribute[0]) * activationAdjustedBlendValue;
    let g = attribute[1] + (groupColor[1] - attribute[1]) * activationAdjustedBlendValue;
    let b = attribute[2] + (groupColor[2] - attribute[2]) * activationAdjustedBlendValue;
    if (activationAdjustedSaturationMultiplier !== 1) {
      // color intensity
      const i = r * 0.299 + g * 0.587 + b * 0.114;
      const saturation = Math.max(0, activationAdjustedSaturationMultiplier);
      r = i + (r - i) * saturation;
      g = i + (g - i) * saturation;
      b = i + (b - i) * saturation;
    }
    attribute[0] = Math.min(1, Math.max(0, r * activationAdjustedBrightnessMultiplier));
    attribute[1] = Math.min(1, Math.max(0, g * activationAdjustedBrightnessMultiplier));
    attribute[2] = Math.min(1, Math.max(0, b * activationAdjustedBrightnessMultiplier));
  }
  static {
    _initClass();
  }
}

export { _EveSmartLightAttribu as EveSmartLightAttributeModifierColor };
//# sourceMappingURL=EveSmartLightAttributeModifierColor.js.map
