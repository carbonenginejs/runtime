import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { vec2 } from '@carbonenginejs/runtime-utils/vec2';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveSocketParameterBindingBase as _EveSocketParameterBi } from './EveSocketParameterBindingBase.js';

let _initProto, _initClass, _init_value, _init_extra_value;

/** EveSocketParameterVector2 (eve/socket) - SOCKET_PARAMETER_DEFINE(Vector2, (0, 0)). */
let _EveSocketParameterVe;
class EveSocketParameterVector2 extends _EveSocketParameterBi {
  static {
    ({
      e: [_init_value, _init_extra_value, _initProto],
      c: [_EveSocketParameterVe, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSocketParameterVector2",
      family: "eve/socket"
    })], [[[io, io.persist, type, type.vec2], 16, "value"], [[carbon, carbon.method, impl, impl.implemented], 18, "ClearBindings"], [[carbon, carbon.method, impl, impl.implemented], 18, "Reset"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetValueToDefault"]], 0, void 0, _EveSocketParameterBi));
  }
  /** m_value (Vector2) */
  value = (_initProto(this), _init_value(this, vec2.create()));

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
      vec2.copy(this.value, this.#defaults[index]);
      this.bindings[index]?.CopyValue?.();
    }
    this.ClearBindings();
  }

  /**
   * Captures a copy of the external parameter's current value as a default,
   * keeping it at zero unless the source has at least two components; always
   * succeeds, so a bind is never refused on its account.
   */
  ExtractDefault(externalParameter) {
    const value = vec2.create();
    try {
      const source = externalParameter.GetValue();
      if (source && typeof source.length === "number" && source.length >= 2) {
        vec2.copy(value, source);
      }
    } catch {
      vec2.set(value, 0, 0);
    }
    this.#defaults.push(value);
    return true;
  }

  /**
   * Restores the first captured default into the existing value vector, or
   * zeroes it when nothing was captured.
   */
  SetValueToDefault() {
    if (this.#defaults.length) {
      vec2.copy(this.value, this.#defaults[0]);
    } else {
      vec2.set(this.value, 0, 0);
    }
  }
  static {
    _initClass();
  }
}

export { _EveSocketParameterVe as EveSocketParameterVector2 };
//# sourceMappingURL=EveSocketParameterVector2.js.map
