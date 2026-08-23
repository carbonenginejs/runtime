import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_placements, _init_extra_placements, _init_distributionConditions, _init_extra_distributionConditions, _init_depletionCounters, _init_extra_depletionCounters, _init_enabled, _init_extra_enabled, _init_name, _init_extra_name;

/** EveSOFDataHullExtensionPlacementGroup (eve) - generated from schema shapeHash 31adf376.... */
let _EveSOFDataHullExtens;
class EveSOFDataHullExtensionPlacementGroup extends CjsModel {
  static {
    ({
      e: [_init_placements, _init_extra_placements, _init_distributionConditions, _init_extra_distributionConditions, _init_depletionCounters, _init_extra_depletionCounters, _init_enabled, _init_extra_enabled, _init_name, _init_extra_name],
      c: [_EveSOFDataHullExtens, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullExtensionPlacementGroup",
      family: "eve"
    })], [[[io, io.persist, void 0, type.list("IEveSOFDataHullExtensionPlacement")], 16, "placements"], [[io, io.persist, void 0, type.list("IEveSOFDataHullExtensionPlacementDistribution")], 16, "distributionConditions"], [[io, io.persist, void 0, type.list("EveSOFDataDistributionDepletionCounter")], 16, "depletionCounters"], [[io, io.persist, type, type.boolean], 16, "enabled"], [[io, io.persist, type, type.string], 16, "name"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_name(this);
  }
  /** m_placements (PIEveSOFDataHullExtensionPlacementVector) [READ, PERSIST] */
  placements = _init_placements(this, []);

  /** m_distributionConditions (PIEveSOFDataHullExtensionPlacementDistributionVector) [READ, PERSIST] */
  distributionConditions = (_init_extra_placements(this), _init_distributionConditions(this, []));

  /** m_depletionCounters (PEveSOFDataDistributionDepletionCounterVector) [READ, PERSIST] */
  depletionCounters = (_init_extra_distributionConditions(this), _init_depletionCounters(this, []));

  /** m_enabled (bool) [READWRITE, PERSIST] */
  enabled = (_init_extra_depletionCounters(this), _init_enabled(this, true));

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_enabled(this), _init_name(this, ""));
  static {
    _initClass();
  }
}

export { _EveSOFDataHullExtens as EveSOFDataHullExtensionPlacementGroup };
//# sourceMappingURL=EveSOFDataHullExtensionPlacementGroup.js.map
