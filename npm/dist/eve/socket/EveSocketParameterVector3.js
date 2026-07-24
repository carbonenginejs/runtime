import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveSocketParameterBindingBase as _EveSocketParameterBi } from './EveSocketParameterBindingBase.js';

let _initProto, _initClass, _init_value, _init_extra_value;

/** EveSocketParameterVector3 (eve/socket) - SOCKET_PARAMETER_DEFINE(Vector3, (0, 0, 0)). */
let _EveSocketParameterVe;
class EveSocketParameterVector3 extends _EveSocketParameterBi {
  static {
    ({
      e: [_init_value, _init_extra_value, _initProto],
      c: [_EveSocketParameterVe, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSocketParameterVector3",
      family: "eve/socket"
    })], [[[io, io.persist, type, type.vec3], 16, "value"], [[carbon, carbon.method, impl, impl.implemented], 18, "ClearBindings"], [[carbon, carbon.method, impl, impl.implemented], 18, "Reset"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetValueToDefault"]], 0, void 0, _EveSocketParameterBi));
  }
  /** m_value (Vector3) */
  value = (_initProto(this), _init_value(this, vec3.create()));

  /** m_defaults - one default captured per bound external parameter. */
  #defaults = (_init_extra_value(this), []);
  ClearBindings() {
    this.#defaults.length = 0;
    super.ClearBindings();
  }

  /** Restores every binding's default and copies it out, then clears. */
  Reset() {
    for (let index = 0; index < this.bindings.length; index++) {
      vec3.copy(this.value, this.#defaults[index]);
      this.bindings[index]?.CopyValue?.();
    }
    this.ClearBindings();
  }
  ExtractDefault(externalParameter) {
    const value = vec3.create();
    try {
      const source = externalParameter.GetValue();
      if (source && typeof source.length === "number" && source.length >= 3) {
        vec3.copy(value, source);
      }
    } catch {
      vec3.set(value, 0, 0, 0);
    }
    this.#defaults.push(value);
    return true;
  }
  SetValueToDefault() {
    if (this.#defaults.length) {
      vec3.copy(this.value, this.#defaults[0]);
    } else {
      vec3.set(this.value, 0, 0, 0);
    }
  }
  static {
    _initClass();
  }
}

export { _EveSocketParameterVe as EveSocketParameterVector3 };
//# sourceMappingURL=EveSocketParameterVector3.js.map
