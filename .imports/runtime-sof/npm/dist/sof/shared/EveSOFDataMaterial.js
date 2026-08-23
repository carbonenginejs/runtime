import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_parameters, _init_extra_parameters, _init_name, _init_extra_name;

/** EveSOFDataMaterial (eve) - generated from schema shapeHash 044816c1.... */
let _EveSOFDataMaterial;
class EveSOFDataMaterial extends CjsModel {
  static {
    ({
      e: [_init_parameters, _init_extra_parameters, _init_name, _init_extra_name],
      c: [_EveSOFDataMaterial, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataMaterial",
      family: "eve"
    })], [[[io, io.persist, void 0, type.list("EveSOFDataParameter")], 16, "parameters"], [[io, io.persist, type, type.string], 16, "name"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_name(this);
  }
  /** m_parameters (PEveSOFDataParameterVector) [READ, PERSIST] */
  parameters = _init_parameters(this, []);

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_parameters(this), _init_name(this, ""));
  AssignParameters(out = {}, prefix = "") {
    for (const parameter of this.parameters) parameter.Assign(out, prefix);
    return out;
  }
  static {
    _initClass();
  }
}

export { _EveSOFDataMaterial as EveSOFDataMaterial };
//# sourceMappingURL=EveSOFDataMaterial.js.map
