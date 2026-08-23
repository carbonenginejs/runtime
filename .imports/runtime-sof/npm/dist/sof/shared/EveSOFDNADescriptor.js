import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_material, _init_extra_material, _init_material2, _init_extra_material2, _init_material3, _init_extra_material3, _init_material4, _init_extra_material4, _init_faction, _init_extra_faction, _init_hull, _init_extra_hull, _init_layout, _init_extra_layout, _init_pattern, _init_extra_pattern, _init_race, _init_extra_race;

/** EveSOFDNADescriptor (eve) - generated from schema shapeHash db1ef974.... */
let _EveSOFDNADescriptor;
class EveSOFDNADescriptor extends CjsModel {
  static {
    ({
      e: [_init_material, _init_extra_material, _init_material2, _init_extra_material2, _init_material3, _init_extra_material3, _init_material4, _init_extra_material4, _init_faction, _init_extra_faction, _init_hull, _init_extra_hull, _init_layout, _init_extra_layout, _init_pattern, _init_extra_pattern, _init_race, _init_extra_race],
      c: [_EveSOFDNADescriptor, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDNADescriptor",
      family: "eve"
    })], [[[io, io.persist, type, type.string], 16, "material1"], [[io, io.persist, type, type.string], 16, "material2"], [[io, io.persist, type, type.string], 16, "material3"], [[io, io.persist, type, type.string], 16, "material4"], [[io, io.persist, type, type.string], 16, "faction"], [[io, io.persist, type, type.string], 16, "hull"], [[io, io.persist, type, type.string], 16, "layout"], [[io, io.persist, type, type.string], 16, "pattern"], [[io, io.persist, type, type.string], 16, "race"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_race(this);
  }
  /** m_material1 (std::string) [READWRITE, PERSIST] */
  material1 = _init_material(this, "");

  /** m_material2 (std::string) [READWRITE, PERSIST] */
  material2 = (_init_extra_material(this), _init_material2(this, ""));

  /** m_material3 (std::string) [READWRITE, PERSIST] */
  material3 = (_init_extra_material2(this), _init_material3(this, ""));

  /** m_material4 (std::string) [READWRITE, PERSIST] */
  material4 = (_init_extra_material3(this), _init_material4(this, ""));

  /** m_faction (std::string) [READWRITE, PERSIST] */
  faction = (_init_extra_material4(this), _init_faction(this, ""));

  /** m_hull (std::string) [READWRITE, PERSIST] */
  hull = (_init_extra_faction(this), _init_hull(this, ""));

  /** m_layout (std::string) [READWRITE, PERSIST] */
  layout = (_init_extra_hull(this), _init_layout(this, ""));

  /** m_pattern (std::string) [READWRITE, PERSIST] */
  pattern = (_init_extra_layout(this), _init_pattern(this, ""));

  /** m_race (std::string) [READWRITE, PERSIST] */
  race = (_init_extra_pattern(this), _init_race(this, ""));
  static {
    _initClass();
  }
}

export { _EveSOFDNADescriptor as EveSOFDNADescriptor };
//# sourceMappingURL=EveSOFDNADescriptor.js.map
