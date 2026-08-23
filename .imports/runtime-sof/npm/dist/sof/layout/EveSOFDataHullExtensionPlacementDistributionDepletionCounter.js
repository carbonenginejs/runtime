import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { IEveSOFDataHullExtensionPlacementDistribution as _IEveSOFDataHullExten } from './IEveSOFDataHullExtensionPlacementDistribution.js';

let _initClass, _init_depletionCounters, _init_extra_depletionCounters, _init_name, _init_extra_name;

/** EveSOFDataHullExtensionPlacementDistributionDepletionCounter (eve) - generated from schema shapeHash a7fc1a95.... */
let _EveSOFDataHullExtens;
class EveSOFDataHullExtensionPlacementDistributionDepletionCounter extends _IEveSOFDataHullExten {
  static {
    ({
      e: [_init_depletionCounters, _init_extra_depletionCounters, _init_name, _init_extra_name],
      c: [_EveSOFDataHullExtens, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullExtensionPlacementDistributionDepletionCounter",
      family: "eve"
    })], [[[io, io.persist, void 0, type.list("EveSOFDataDistributionDepletionCounter")], 16, "depletionCounters"], [[io, io.persist, type, type.string], 16, "name"]], 0, void 0, _IEveSOFDataHullExten));
  }
  constructor(...args) {
    super(...args);
    _init_extra_name(this);
  }
  /** m_depletionCounters (PEveSOFDataDistributionDepletionCounterVector) [READ, PERSIST] */
  depletionCounters = _init_depletionCounters(this, []);

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_depletionCounters(this), _init_name(this, ""));
  static {
    _initClass();
  }
}

export { _EveSOFDataHullExtens as EveSOFDataHullExtensionPlacementDistributionDepletionCounter };
//# sourceMappingURL=EveSOFDataHullExtensionPlacementDistributionDepletionCounter.js.map
