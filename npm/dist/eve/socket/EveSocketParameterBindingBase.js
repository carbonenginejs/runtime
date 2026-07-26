import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_name, _init_extra_name, _init_bindings, _init_extra_bindings;

/** EveSocketParameterBindingBase (eve/socket) - generated from schema shapeHash d75356dd.... */
let _EveSocketParameterBi;
class EveSocketParameterBindingBase extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_bindings, _init_extra_bindings, _initProto],
      c: [_EveSocketParameterBi, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSocketParameterBindingBase",
      family: "eve/socket"
    })], [[[type, type.string], 16, "name"], [type.list("ITr2ValueBinding"), 0, "bindings"], [[carbon, carbon.method, impl, impl.implemented], 18, "ClearBindings"], [[carbon, carbon.method, impl, impl.adapted], 18, "BindToExternalParameter"], [[carbon, carbon.method, impl, impl.implemented], 18, "Used"], [[carbon, carbon.method, impl, impl.implemented], 18, "Propagate"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_bindings(this);
  }
  /** name (m_name =) */
  name = (_initProto(this), _init_name(this, ""));

  /** m_bindings (PITr2ValueBindingVector) */
  bindings = (_init_extra_name(this), _init_bindings(this, []));

  /** Returns the name an external parameter has to match before it can bind here. */
  GetName() {
    return this.name;
  }

  /**
   * Sets the name external parameters must match to bind, coercing null to an
   * empty string.
   */
  SetName(name) {
    this.name = String(name ?? "");
  }

  /** Drops every value binding, leaving the current value in place. */
  ClearBindings() {
    this.bindings.length = 0;
  }

  /**
   * Creates a binding that reads this parameter's `value` field and writes it to the external parameter, keeping it only when the names match, the binding initializes and a default could be captured.
   *
   * @returns {boolean} True when the binding was created and stored.
   */
  BindToExternalParameter(externalParameter) {
    if (!externalParameter?.IsValid?.() || externalParameter.GetName?.() !== this.name) return false;
    const binding = externalParameter.CreateBinding?.();
    if (!binding) return false;
    binding.SetSource?.("value", this);
    binding.Initialize?.();
    if (!binding.IsValid?.() || !this.ExtractDefault(externalParameter)) return false;
    this.bindings.push(binding);
    return true;
  }

  /**
   * Hook where a typed subclass records the external parameter's current value
   * as a restore default; the base captures nothing and refuses the bind by
   * returning false.
   */
  ExtractDefault(_externalParameter) {
    return false;
  }

  /** Reports whether anything is bound to this parameter. */
  Used() {
    return this.bindings.length !== 0;
  }

  /** Pushes the current value out through every binding. */
  Propagate() {
    for (const binding of this.bindings) binding?.CopyValue?.();
  }
  static {
    _initClass();
  }
}

export { _EveSocketParameterBi as EveSocketParameterBindingBase };
//# sourceMappingURL=EveSocketParameterBindingBase.js.map
