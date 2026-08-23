import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveSocketParameterBindingBase as _EveSocketParameterBi } from './EveSocketParameterBindingBase.js';

let _initProto, _initClass, _init_value, _init_extra_value;

/** EveSocketParameterBool (eve/socket) - SOCKET_PARAMETER_DEFINE(bool, false). */
let _EveSocketParameterBo;
class EveSocketParameterBool extends _EveSocketParameterBi {
  static {
    ({
      e: [_init_value, _init_extra_value, _initProto],
      c: [_EveSocketParameterBo, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSocketParameterBool",
      family: "eve/socket"
    })], [[[io, io.persist, type, type.boolean], 16, "value"], [[carbon, carbon.method, impl, impl.implemented], 18, "ClearBindings"], [[carbon, carbon.method, impl, impl.implemented], 18, "Reset"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetValueToDefault"]], 0, void 0, _EveSocketParameterBi));
  }
  /** m_value (bool) */
  value = (_initProto(this), _init_value(this, false));

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
   * Captures the external parameter's current value as a boolean default, using
   * false when the read throws; always succeeds, so a bind is never refused on
   * its account.
   */
  ExtractDefault(externalParameter) {
    let value = false;
    try {
      value = !!externalParameter.GetValue();
    } catch {
      value = false;
    }
    this.#defaults.push(value);
    return true;
  }

  /**
   * Restores the first captured default, falling back to false when nothing was
   * captured.
   */
  SetValueToDefault() {
    this.value = this.#defaults.length ? this.#defaults[0] : false;
  }
  static {
    _initClass();
  }
}

export { _EveSocketParameterBo as EveSocketParameterBool };
//# sourceMappingURL=EveSocketParameterBool.js.map
