import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_faction, _init_extra_faction, _init_generic, _init_extra_generic, _init_hull, _init_extra_hull, _init_layout, _init_extra_layout, _init_material, _init_extra_material, _init_pattern, _init_extra_pattern, _init_race, _init_extra_race;

/** Root SOF data catalog. */
let _EveSOFData;
class EveSOFData extends CjsModel {
  static {
    ({
      e: [_init_faction, _init_extra_faction, _init_generic, _init_extra_generic, _init_hull, _init_extra_hull, _init_layout, _init_extra_layout, _init_material, _init_extra_material, _init_pattern, _init_extra_pattern, _init_race, _init_extra_race],
      c: [_EveSOFData, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFData",
      family: "eve"
    })], [[[io, io.persist, void 0, type.list("EveSOFDataFaction")], 16, "faction"], [[io, io.persist, void 0, type.objectRef("EveSOFDataGeneric")], 16, "generic"], [[io, io.persist, void 0, type.list("EveSOFDataHull")], 16, "hull"], [[io, io.persist, void 0, type.list("EveSOFDataLayout")], 16, "layout"], [[io, io.persist, void 0, type.list("EveSOFDataMaterial")], 16, "material"], [[io, io.persist, void 0, type.list("EveSOFDataPattern")], 16, "pattern"], [[io, io.persist, void 0, type.list("EveSOFDataRace")], 16, "race"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_race(this);
  }
  /** m_faction (PEveSOFDataFactionVector) [READ, PERSIST] */
  faction = _init_faction(this, []);

  /** m_generic (EveSOFDataGenericPtr) [READWRITE, PERSIST] */
  generic = (_init_extra_faction(this), _init_generic(this, null));

  /** m_hull (PEveSOFDataHullVector) [READ, PERSIST] */
  hull = (_init_extra_generic(this), _init_hull(this, []));

  /** m_layout (PEveSOFDataLayoutVector) [READ, PERSIST] */
  layout = (_init_extra_hull(this), _init_layout(this, []));

  /** m_material (PEveSOFDataMaterialVector) [READ, PERSIST] */
  material = (_init_extra_layout(this), _init_material(this, []));

  /** m_pattern (PEveSOFDataPatternVector) [READ, PERSIST] */
  pattern = (_init_extra_material(this), _init_pattern(this, []));

  /** m_race (PEveSOFDataRaceVector) [READ, PERSIST] */
  race = (_init_extra_pattern(this), _init_race(this, []));
  static {
    _initClass();
  }
}

export { _EveSOFData as EveSOFData };
//# sourceMappingURL=EveSOFData.js.map
