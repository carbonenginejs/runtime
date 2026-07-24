import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { Tr2ExternalParameter as _Tr2ExternalParameter } from '../../generated/trinityCore/Tr2ExternalParameter.js';

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
  GetName() {
    return this.name;
  }
  SetName(name) {
    this.name = String(name ?? "");
  }
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
  ClearBindings() {
    this.externalParameters.length = 0;
  }
  BindToExternalParameter(externalParameter) {
    this.Initialize();
    if (!externalParameter?.IsValid?.() || externalParameter.GetName?.() !== this.name) return false;
    if (!this.ExtractDefault(externalParameter)) return false;
    this.externalParameters.push(externalParameter);
    return true;
  }
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
  SetValueToDefault() {
    if (this.defaults.length) this.value = this.defaults[0];
  }
  Used() {
    return this.externalParameters.length !== 0;
  }
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
