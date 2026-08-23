import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { EveSOFDataBooster as _EveSOFDataBooster } from '../shared/EveSOFDataBooster.js';
import { EveSOFDataRaceDamage as _EveSOFDataRaceDamage } from './EveSOFDataRaceDamage.js';

let _initClass, _init_hullPrimaryHeatColorType, _init_extra_hullPrimaryHeatColorType, _init_hullReactorHeatColorType, _init_extra_hullReactorHeatColorType, _init_booster, _init_extra_booster, _init_damage, _init_extra_damage, _init_name, _init_extra_name;

/** EveSOFDataRace (eve) - generated from schema shapeHash f7cdba2b.... */
let _EveSOFDataRace;
class EveSOFDataRace extends CjsModel {
  static {
    ({
      e: [_init_hullPrimaryHeatColorType, _init_extra_hullPrimaryHeatColorType, _init_hullReactorHeatColorType, _init_extra_hullReactorHeatColorType, _init_booster, _init_extra_booster, _init_damage, _init_extra_damage, _init_name, _init_extra_name],
      c: [_EveSOFDataRace, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataRace",
      family: "eve"
    })], [[[io, io.persist, type, type.int32, void 0, type.enum("ColorType")], 16, "hullPrimaryHeatColorType"], [[io, io.persist, type, type.int32, void 0, type.enum("ColorType")], 16, "hullReactorHeatColorType"], [[io, io.persist, void 0, type.objectRef("EveSOFDataBooster")], 16, "booster"], [[io, io.persist, void 0, type.objectRef("EveSOFDataRaceDamage")], 16, "damage"], [[io, io.persist, type, type.string], 16, "name"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_name(this);
  }
  /** m_hullPrimaryHeatColorType (SOFDataFactionColorChooser::ColorType - enum ColorType) [READWRITE, PERSIST, ENUM] */
  hullPrimaryHeatColorType = _init_hullPrimaryHeatColorType(this, 16);

  /** m_hullReactorHeatColorType (SOFDataFactionColorChooser::ColorType - enum ColorType) [READWRITE, PERSIST, ENUM] */
  hullReactorHeatColorType = (_init_extra_hullPrimaryHeatColorType(this), _init_hullReactorHeatColorType(this, 14));

  /** m_booster (EveSOFDataBoosterPtr) [READWRITE, PERSIST] */
  booster = (_init_extra_hullReactorHeatColorType(this), _init_booster(this, null));

  /** m_damage (EveSOFDataRaceDamagePtr) [READWRITE, PERSIST] */
  damage = (_init_extra_booster(this), _init_damage(this, null));

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_damage(this), _init_name(this, ""));
  static combine(base, overrides, out = null) {
    out ??= new this();
    out.name = selectValue(base, overrides, "name", out.name);
    out.hullPrimaryHeatColorType = selectValue(base, overrides, "hullPrimaryHeatColorType", out.hullPrimaryHeatColorType);
    out.hullReactorHeatColorType = selectValue(base, overrides, "hullReactorHeatColorType", out.hullReactorHeatColorType);
    out.booster = base?.booster || overrides?.booster ? _EveSOFDataBooster.combine(base?.booster, overrides?.booster, out.booster) : null;
    out.damage = base?.damage || overrides?.damage ? _EveSOFDataRaceDamage.combine(base?.damage, overrides?.damage, out.damage) : null;
    return out;
  }
  static {
    _initClass();
  }
}
function selectValue(base, overrides, name, fallback) {
  const value = overrides?.[name];
  if (value !== null && value !== undefined && value !== "") return value;
  return base?.[name] ?? fallback;
}

export { _EveSOFDataRace as EveSOFDataRace };
//# sourceMappingURL=EveSOFDataRace.js.map
