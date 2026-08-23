import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_groupIndex, _init_extra_groupIndex, _init_name, _init_extra_name, _init_coneColor, _init_extra_coneColor, _init_spriteColor, _init_extra_spriteColor, _init_flareColor, _init_extra_flareColor;

/** EveSOFDataFactionSpotlightSet (eve) - generated from schema shapeHash 22a58aeb.... */
let _EveSOFDataFactionSpo;
class EveSOFDataFactionSpotlightSet extends CjsModel {
  static {
    ({
      e: [_init_groupIndex, _init_extra_groupIndex, _init_name, _init_extra_name, _init_coneColor, _init_extra_coneColor, _init_spriteColor, _init_extra_spriteColor, _init_flareColor, _init_extra_flareColor],
      c: [_EveSOFDataFactionSpo, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataFactionSpotlightSet",
      family: "eve"
    })], [[[io, io.persist, type, type.int32], 16, "groupIndex"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.color], 16, "coneColor"], [[io, io.persist, type, type.color], 16, "spriteColor"], [[io, io.persist, type, type.color], 16, "flareColor"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_flareColor(this);
  }
  /** m_groupIndex (int32_t) [READWRITE, PERSIST] */
  groupIndex = _init_groupIndex(this, -1);

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_groupIndex(this), _init_name(this, ""));

  /** m_coneColor (Color) [READWRITE, PERSIST] */
  coneColor = (_init_extra_name(this), _init_coneColor(this, vec4.create()));

  /** m_spriteColor (Color) [READWRITE, PERSIST] */
  spriteColor = (_init_extra_coneColor(this), _init_spriteColor(this, vec4.create()));

  /** m_flareColor (Color) [READWRITE, PERSIST] */
  flareColor = (_init_extra_spriteColor(this), _init_flareColor(this, vec4.create()));
  static {
    _initClass();
  }
}

export { _EveSOFDataFactionSpo as EveSOFDataFactionSpotlightSet };
//# sourceMappingURL=EveSOFDataFactionSpotlightSet.js.map
