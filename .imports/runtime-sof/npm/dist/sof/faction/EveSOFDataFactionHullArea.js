import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_parameters, _init_extra_parameters, _init_name, _init_extra_name;

/** EveSOFDataFactionHullArea (eve) - generated from schema shapeHash 31000f7c.... */
let _EveSOFDataFactionHul;
class EveSOFDataFactionHullArea extends CjsModel {
  static {
    ({
      e: [_init_parameters, _init_extra_parameters, _init_name, _init_extra_name],
      c: [_EveSOFDataFactionHul, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataFactionHullArea",
      family: "eve"
    })], [[[io, io.persist, void 0, type.list("EveSOFDataParameter")], 16, "parameters"], [[io, io.persist, type, type.string], 16, "name"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_name(this);
  }
  /** m_parameters (PEveSOFDataParameterVector) [READ, PERSIST] */
  parameters = _init_parameters(this, []);

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  name = (_init_extra_parameters(this), _init_name(this, ""));
  FindParameter(name) {
    const normalized = String(name ?? "").toUpperCase();
    if (!normalized) return null;
    return this.parameters.find(value => String(value?.name ?? "").toUpperCase() === normalized) ?? null;
  }
  static {
    _initClass();
  }
}

export { _EveSOFDataFactionHul as EveSOFDataFactionHullArea };
//# sourceMappingURL=EveSOFDataFactionHullArea.js.map
