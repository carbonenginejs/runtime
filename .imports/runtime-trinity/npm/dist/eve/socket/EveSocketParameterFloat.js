import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveSocketParameterBindingBase as _EveSocketParameterBi } from './EveSocketParameterBindingBase.js';

let _initProto, _initClass, _init_value, _init_extra_value;

/** EveSocketParameterFloat (eve/socket) - SOCKET_PARAMETER_DEFINE(float, 0.0f). */
let _EveSocketParameterFl;
class EveSocketParameterFloat extends _EveSocketParameterBi {
  static {
    ({
      e: [_init_value, _init_extra_value, _initProto],
      c: [_EveSocketParameterFl, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSocketParameterFloat",
      family: "eve/socket"
    })], [[[io, io.persist, type, type.float32], 16, "value"], [[carbon, carbon.method, impl, impl.implemented], 18, "ClearBindings"], [[carbon, carbon.method, impl, impl.implemented], 18, "Reset"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetValueToDefault"]], 0, void 0, _EveSocketParameterBi));
  }
  /** m_value (float) */
  value = (_initProto(this), _init_value(this, 0));

  /** m_defaults - one default captured per bound external parameter. */
  #defaults = (_init_extra_value(this), []);

  /**
   * Discards the captured defaults along with the bindings, so nothing can be
   * restored afterwards.
   */
  ClearBindings() {
    this.#defaults.length = 0;
    super.ClearBindings();
  }

  /** Restores every binding's default and copies it out, then clears. */
  Reset() {
    for (let index = 0; index < this.bindings.length; index++) {
      this.value = this.#defaults[index];
      this.bindings[index]?.CopyValue?.();
    }
    this.ClearBindings();
  }

  /**
   * Captures the external parameter's current value as a numeric default,
   * substituting 0 when the read throws or is not finite; always succeeds, so a
   * bind is never refused on its account.
   */
  ExtractDefault(externalParameter) {
    let value = 0;
    try {
      value = Number(externalParameter.GetValue());
    } catch {
      value = 0;
    }
    this.#defaults.push(Number.isFinite(value) ? value : 0);
    return true;
  }

  /**
   * Restores the first captured default, falling back to 0 when nothing was
   * captured.
   */
  SetValueToDefault() {
    this.value = this.#defaults.length ? this.#defaults[0] : 0;
  }
  static {
    _initClass();
  }
}

export { _EveSocketParameterFl as EveSocketParameterFloat };
//# sourceMappingURL=EveSocketParameterFloat.js.map
