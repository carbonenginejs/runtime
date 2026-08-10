import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { EveSOFDataHullExtensionPlacement as _EveSOFDataHullExtens$1 } from './EveSOFDataHullExtensionPlacement.js';

let _initClass, _init_depletionCounters, _init_extra_depletionCounters, _init_name, _init_extra_name, _init_placements, _init_extra_placements;

/** EveSOFDataHullExtensionBucket (eve) - generated from schema shapeHash af31c426.... */
// Carbon really does declare Bucket as a subclass of the concrete Placement
// type (EveSOFData.h:2088-2104) but Blue-maps ONLY name, depletionCounters,
// and placements (EveSOFData_Blue2.cpp:292-299): the base placement surface
// is not exposed for this type. The JavaScript inheritance stays real; the
// inherited fields are hidden from this class's schema surface only.
let _EveSOFDataHullExtens;
class EveSOFDataHullExtensionBucket extends _EveSOFDataHullExtens$1 {
  static {
    ({
      e: [_init_depletionCounters, _init_extra_depletionCounters, _init_name, _init_extra_name, _init_placements, _init_extra_placements],
      c: [_EveSOFDataHullExtens, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullExtensionBucket",
      family: "eve"
    }), type.hideInherited(["distributionConditions", "extendsBoundingSphere", "extendsShieldEllipsoid", "isShared", "isInstanced", "enabled", "distribution", "descriptor", "locatorSetName", "offset"])], [[[io, io.persist, void 0, type.list("EveSOFDataDistributionDepletionCounter")], 16, "depletionCounters"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, void 0, type.list("EveSOFDataHullExtensionPlacement")], 16, "placements"]], 0, void 0, _EveSOFDataHullExtens$1));
  }
  constructor(...args) {
    super(...args);
    _init_extra_placements(this);
  }
  /** m_depletionCounters (PEveSOFDataDistributionDepletionCounterVector) [READ, PERSIST] */
  depletionCounters = _init_depletionCounters(this, []);

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_depletionCounters(this), _init_name(this, ""));

  /** m_placements (PEveSOFDataHullExtensionPlacementVector) [READ, PERSIST] */
  placements = (_init_extra_name(this), _init_placements(this, []));

  /** Carbon bucket/group-like discriminator used by the JavaScript runtime. */
  IsBucket() {
    return true;
  }
  static {
    _initClass();
  }
}

export { _EveSOFDataHullExtens as EveSOFDataHullExtensionBucket };
//# sourceMappingURL=EveSOFDataHullExtensionBucket.js.map
