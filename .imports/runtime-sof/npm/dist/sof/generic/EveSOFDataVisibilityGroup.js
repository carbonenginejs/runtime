import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_description, _init_extra_description, _init_name, _init_extra_name;

/** EveSOFDataVisibilityGroup (eve) - generated from schema shapeHash a4e27d72.... */
let _EveSOFDataVisibility;
class EveSOFDataVisibilityGroup extends CjsModel {
  static {
    ({
      e: [_init_description, _init_extra_description, _init_name, _init_extra_name],
      c: [_EveSOFDataVisibility, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataVisibilityGroup",
      family: "eve"
    })], [[[io, io.persist, type, type.string], 16, "description"], [[io, io.persist, type, type.string], 16, "name"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_name(this);
  }
  /** m_description (std::string) [READWRITE, PERSIST] */
  description = _init_description(this, "");

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_description(this), _init_name(this, ""));
  static {
    _initClass();
  }
}

export { _EveSOFDataVisibility as EveSOFDataVisibilityGroup };
//# sourceMappingURL=EveSOFDataVisibilityGroup.js.map
