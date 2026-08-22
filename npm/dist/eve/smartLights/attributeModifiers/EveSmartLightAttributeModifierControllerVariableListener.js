import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveSmartLightAttributeModifierBucket as _EveSmartLightAttribu$1 } from './EveSmartLightAttributeModifierBucket.js';

let _initProto, _initClass, _init_variableName, _init_extra_variableName, _init_value, _init_extra_value, _init_invertReceivedValue, _init_extra_invertReceivedValue, _init_defaultValue, _init_extra_defaultValue;

/** EveSmartLightAttributeModifierControllerVariableListener (eve/smartLights/attributeModifiers) - generated from schema shapeHash 8438774e.... */
let _EveSmartLightAttribu;
class EveSmartLightAttributeModifierControllerVariableListener extends _EveSmartLightAttribu$1 {
  static {
    ({
      e: [_init_variableName, _init_extra_variableName, _init_value, _init_extra_value, _init_invertReceivedValue, _init_extra_invertReceivedValue, _init_defaultValue, _init_extra_defaultValue, _initProto],
      c: [_EveSmartLightAttribu, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSmartLightAttributeModifierControllerVariableListener",
      family: "eve/smartLights/attributeModifiers"
    })], [[[io, io.persist, type, type.string], 16, "variableName"], [[io, io.notify, io, io.persist, type, type.float32], 16, "value"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "invertReceivedValue"], [[io, io.persist, type, type.float32], 16, "defaultValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The settle hook receives no changed-property list; value/invert edits are detected by comparing cached last-applied values.")], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetControllerVariable"]], 0, void 0, _EveSmartLightAttribu$1));
  }
  /** m_variableName (std::string) [READWRITE, PERSIST] */
  variableName = (_initProto(this), _init_variableName(this, ""));

  /** m_value (float) [READWRITE, PERSIST, NOTIFY] */
  value = (_init_extra_variableName(this), _init_value(this, 0));

  /** m_invertReceivedValue (bool) [READWRITE, PERSIST, NOTIFY] */
  invertReceivedValue = (_init_extra_value(this), _init_invertReceivedValue(this, false));

  /** m_defaultValue (float) [READWRITE, PERSIST] */
  defaultValue = (_init_extra_invertReceivedValue(this), _init_defaultValue(this, 0));

  /** Last value/invert pair the settle hook applied (JS-only change detection). */
  #lastAppliedValue = (_init_extra_defaultValue(this), 0);

  /** See #lastAppliedValue. */
  #lastAppliedInvert = false;

  /**
   * Seeds the listener from its default value before the base crossfade seed
   * (EveSmartLightAttributeModifierControllerVariableListener.cpp:15-21).
   */
  Initialize() {
    this.value = this.defaultValue;
    this.startsActive = this.defaultValue > 0.5;
    this.active = this.defaultValue > 0.5;
    this.#lastAppliedValue = this.value;
    this.#lastAppliedInvert = this.invertReceivedValue;
    return super.Initialize();
  }

  /**
   * Reapplies the activation state when the received value or the inversion
   * flag is edited, then defers to the base active-edit handling
   * (EveSmartLightAttributeModifierControllerVariableListener.cpp:23-39).
   */
  OnModified(options = {}) {
    if (this.value !== this.#lastAppliedValue || this.invertReceivedValue !== this.#lastAppliedInvert) {
      this.#lastAppliedValue = this.value;
      this.#lastAppliedInvert = this.invertReceivedValue;
      this.#ApplyValue();
    }
    return super.OnModified(options);
  }

  /**
   * Receives a controller variable: a name match updates the listener state,
   * and the value always fans out to the child modifiers
   * (EveSmartLightAttributeModifierControllerVariableListener.cpp:41-60).
   */
  SetControllerVariable(name, value) {
    if (this.variableName === name) {
      this.value = Number(value);
      this.#lastAppliedValue = this.value;
      this.#ApplyValue();
    }
    for (const modifier of this.attributeModifiers) {
      modifier.SetControllerVariable(name, value);
    }
  }

  /** Shared value-to-activation mapping (cpp:27-35 and cpp:46-53 are identical). */
  #ApplyValue() {
    if (this.invertReceivedValue) {
      this.SetActive(this.value < 1);
    } else {
      this.SetActive(this.value > 0);
    }
  }
  static {
    _initClass();
  }
}

export { _EveSmartLightAttribu as EveSmartLightAttributeModifierControllerVariableListener };
//# sourceMappingURL=EveSmartLightAttributeModifierControllerVariableListener.js.map
