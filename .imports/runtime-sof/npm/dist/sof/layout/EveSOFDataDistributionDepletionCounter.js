import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_value, _init_extra_value, _init_name, _init_extra_name;

/** EveSOFDataDistributionDepletionCounter (eve) - generated from schema shapeHash 33483ac2.... */
let _EveSOFDataDistributi;
class EveSOFDataDistributionDepletionCounter extends CjsModel {
  static {
    ({
      e: [_init_value, _init_extra_value, _init_name, _init_extra_name],
      c: [_EveSOFDataDistributi, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataDistributionDepletionCounter",
      family: "eve"
    })], [[[io, io.persist, type, type.int32], 16, "value"], [[io, io.persist, type, type.string], 16, "name"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_name(this);
  }
  /** m_value (int32_t) [READWRITE, PERSIST] */
  value = _init_value(this, 1);

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_value(this), _init_name(this, ""));
  static {
    _initClass();
  }
}

export { _EveSOFDataDistributi as EveSOFDataDistributionDepletionCounter };
//# sourceMappingURL=EveSOFDataDistributionDepletionCounter.js.map
