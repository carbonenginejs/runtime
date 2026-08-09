import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { Tr2ExternalParameter as _Tr2ExternalParameter } from '../../core/binding/Tr2ExternalParameter.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_value, _init_extra_value, _init_valueExposure, _init_extra_valueExposure, _init_externalParameters, _init_extra_externalParameters, _init_defaults, _init_extra_defaults;

/** EveSocketParameterString (eve/socket) - generated from schema shapeHash d055ced5.... */
let _EveSocketParameterSt;
class EveSocketParameterString extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_value, _init_extra_value, _init_valueExposure, _init_extra_valueExposure, _init_externalParameters, _init_extra_externalParameters, _init_defaults, _init_extra_defaults, _initProto],
      c: [_EveSocketParameterSt, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSocketParameterString",
      family: "eve/socket"
    })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.string], 16, "value"], [type.objectRef("Tr2ExternalParameter"), 0, "valueExposure"], [type.list("Tr2ExternalParameter"), 0, "externalParameters"], [type.list("std::string"), 0, "defaults"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "ClearBindings"], [[carbon, carbon.method, impl, impl.adapted], 18, "BindToExternalParameter"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetValueToDefault"], [[carbon, carbon.method, impl, impl.implemented], 18, "Used"], [[carbon, carbon.method, impl, impl.adapted], 18, "Propagate"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_defaults(this);
  }
  /** m_name (std::string) */
  name = (_initProto(this), _init_name(this, ""));

  /** m_value (std::string) */
  value = (_init_extra_name(this), _init_value(this, ""));

  /** m_valueExposure (Tr2ExternalParameterPtr) */
  valueExposure = (_init_extra_value(this), _init_valueExposure(this, null));

  /** m_externalParameters (PTr2ExternalParameterVector) */
  externalParameters = (_init_extra_valueExposure(this), _init_externalParameters(this, []));

  /** m_defaults (std::vector<std::string>) */
  defaults = (_init_extra_externalParameters(this), _init_defaults(this, []));

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

  /**
   * Creates the `valueExposure` external parameter pointing at this object's
   * `value` attribute on first call; later calls leave the existing one alone.
   */
  Initialize() {
    if (!this.valueExposure) {
      this.valueExposure = new _Tr2ExternalParameter();
      this.valueExposure.SetName("valueExposure");
      this.valueExposure.SetDestinationObject(this);
      this.valueExposure.SetDestinationAttribute("value");
      this.valueExposure.Initialize();
    }
    return true;
  }

  /**
   * Drops the bound external parameters; unlike the typed socket parameters, the
   * captured defaults are kept.
   */
  ClearBindings() {
    this.externalParameters.length = 0;
  }

  /**
   * Records a matching external parameter after capturing its current value as a default; strings are held directly instead of through a value binding, and propagation writes to them.
   *
   * @returns {boolean} True when the external parameter was valid, name-matched and stored.
   */
  BindToExternalParameter(externalParameter) {
    this.Initialize();
    if (!externalParameter?.IsValid?.() || externalParameter.GetName?.() !== this.name) return false;
    if (!this.ExtractDefault(externalParameter)) return false;
    this.externalParameters.push(externalParameter);
    return true;
  }

  /**
   * Captures the external parameter's current value as a string default,
   * substituting an empty string when the read throws; always succeeds.
   */
  ExtractDefault(externalParameter) {
    let value = "";
    try {
      value = String(externalParameter.GetValue());
    } catch {
      value = "";
    }
    this.defaults.push(value);
    return true;
  }

  /**
   * Restores the default captured for the first bound external parameter,
   * leaving the value untouched when none was captured.
   */
  SetValueToDefault() {
    if (this.defaults.length) this.value = this.defaults[0];
  }

  /** Reports whether any external parameter is bound to this one. */
  Used() {
    return this.externalParameters.length !== 0;
  }

  /**
   * Reads the current value through `valueExposure` and writes it into every
   * bound external parameter.
   */
  Propagate() {
    this.Initialize();
    if (!this.valueExposure.IsValid()) return;
    const value = this.valueExposure.GetValue();
    for (const externalParameter of this.externalParameters) externalParameter?.SetValue?.(value);
  }
  static {
    _initClass();
  }
}

export { _EveSocketParameterSt as EveSocketParameterString };
//# sourceMappingURL=EveSocketParameterString.js.map
