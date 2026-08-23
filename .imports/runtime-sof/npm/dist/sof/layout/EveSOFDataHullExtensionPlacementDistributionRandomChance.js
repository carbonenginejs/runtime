import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { IEveSOFDataHullExtensionPlacementDistribution as _IEveSOFDataHullExten } from './IEveSOFDataHullExtensionPlacementDistribution.js';

let _initClass, _init_chanceOfUsage, _init_extra_chanceOfUsage, _init_name, _init_extra_name;

/** EveSOFDataHullExtensionPlacementDistributionRandomChance (eve) - generated from schema shapeHash 0c93607e.... */
let _EveSOFDataHullExtens;
class EveSOFDataHullExtensionPlacementDistributionRandomChance extends _IEveSOFDataHullExten {
  static {
    ({
      e: [_init_chanceOfUsage, _init_extra_chanceOfUsage, _init_name, _init_extra_name],
      c: [_EveSOFDataHullExtens, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullExtensionPlacementDistributionRandomChance",
      family: "eve"
    })], [[[io, io.persist, type, type.float32], 16, "chanceOfUsage"], [[io, io.persist, type, type.string], 16, "name"]], 0, void 0, _IEveSOFDataHullExten));
  }
  constructor(...args) {
    super(...args);
    _init_extra_name(this);
  }
  /** m_chanceOfUsage (float) [READWRITE, PERSIST] */
  chanceOfUsage = _init_chanceOfUsage(this, 1);

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_chanceOfUsage(this), _init_name(this, ""));
  static {
    _initClass();
  }
}

export { _EveSOFDataHullExtens as EveSOFDataHullExtensionPlacementDistributionRandomChance };
//# sourceMappingURL=EveSOFDataHullExtensionPlacementDistributionRandomChance.js.map
