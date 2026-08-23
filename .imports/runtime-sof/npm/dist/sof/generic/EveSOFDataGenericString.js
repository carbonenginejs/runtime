import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_str, _init_extra_str;

/** EveSOFDataGenericString (eve) - generated from schema shapeHash ebea2832.... */
let _EveSOFDataGenericStr;
class EveSOFDataGenericString extends CjsModel {
  static {
    ({
      e: [_init_str, _init_extra_str],
      c: [_EveSOFDataGenericStr, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataGenericString",
      family: "eve"
    })], [[[io, io.persist, type, type.string], 16, "str"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_str(this);
  }
  /** m_str (std::string) [READWRITE, PERSIST] */
  str = _init_str(this, "");
  static {
    _initClass();
  }
}

export { _EveSOFDataGenericStr as EveSOFDataGenericString };
//# sourceMappingURL=EveSOFDataGenericString.js.map
