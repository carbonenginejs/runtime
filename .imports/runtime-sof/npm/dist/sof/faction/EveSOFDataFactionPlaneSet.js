import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_groupIndex, _init_extra_groupIndex, _init_name, _init_extra_name, _init_color, _init_extra_color;

/** EveSOFDataFactionPlaneSet (eve) - generated from schema shapeHash e6cd0e1a.... */
let _EveSOFDataFactionPla;
class EveSOFDataFactionPlaneSet extends CjsModel {
  static {
    ({
      e: [_init_groupIndex, _init_extra_groupIndex, _init_name, _init_extra_name, _init_color, _init_extra_color],
      c: [_EveSOFDataFactionPla, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataFactionPlaneSet",
      family: "eve"
    })], [[[io, io.persist, type, type.int32], 16, "groupIndex"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.color], 16, "color"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_color(this);
  }
  /** m_groupIndex (int32_t) [READWRITE, PERSIST] */
  groupIndex = _init_groupIndex(this, -1);

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_groupIndex(this), _init_name(this, ""));

  /** m_color (Color) [READWRITE, PERSIST] */
  color = (_init_extra_name(this), _init_color(this, vec4.create()));
  static {
    _initClass();
  }
}

export { _EveSOFDataFactionPla as EveSOFDataFactionPlaneSet };
//# sourceMappingURL=EveSOFDataFactionPlaneSet.js.map
