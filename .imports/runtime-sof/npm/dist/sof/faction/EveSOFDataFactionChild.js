import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_groupIndex, _init_extra_groupIndex, _init_name, _init_extra_name, _init_isVisible, _init_extra_isVisible;

/** EveSOFDataFactionChild (eve) - generated from schema shapeHash 283273de.... */
let _EveSOFDataFactionChi;
class EveSOFDataFactionChild extends CjsModel {
  static {
    ({
      e: [_init_groupIndex, _init_extra_groupIndex, _init_name, _init_extra_name, _init_isVisible, _init_extra_isVisible],
      c: [_EveSOFDataFactionChi, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataFactionChild",
      family: "eve"
    })], [[[io, io.persist, type, type.int32], 16, "groupIndex"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.boolean], 16, "isVisible"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_isVisible(this);
  }
  /** m_groupIndex (int32_t) [READWRITE, PERSIST] */
  groupIndex = _init_groupIndex(this, -1);

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_groupIndex(this), _init_name(this, ""));

  /** m_isVisible (bool) [READWRITE, PERSIST] */
  isVisible = (_init_extra_name(this), _init_isVisible(this, false));
  static {
    _initClass();
  }
}

export { _EveSOFDataFactionChi as EveSOFDataFactionChild };
//# sourceMappingURL=EveSOFDataFactionChild.js.map
