import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_depletionCounters, _init_extra_depletionCounters, _init_name, _init_extra_name, _init_placements, _init_extra_placements, _init_randomizeSeedOnLoad, _init_extra_randomizeSeedOnLoad, _init_seed, _init_extra_seed;

/** EveSOFDataLayout (eve) - generated from schema shapeHash 8fb7e831.... */
let _EveSOFDataLayout;
class EveSOFDataLayout extends CjsModel {
  static {
    ({
      e: [_init_depletionCounters, _init_extra_depletionCounters, _init_name, _init_extra_name, _init_placements, _init_extra_placements, _init_randomizeSeedOnLoad, _init_extra_randomizeSeedOnLoad, _init_seed, _init_extra_seed],
      c: [_EveSOFDataLayout, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataLayout",
      family: "eve"
    })], [[[io, io.persist, void 0, type.list("EveSOFDataDistributionDepletionCounter")], 16, "depletionCounters"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, void 0, type.list("IEveSOFDataHullExtensionPlacement")], 16, "placements"], [[io, io.persist, type, type.boolean], 16, "randomizeSeedOnLoad"], [[io, io.persist, type, type.int32], 16, "seed"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_seed(this);
  }
  /** m_depletionCounters (PEveSOFDataDistributionDepletionCounterVector) [READ, PERSIST] */
  depletionCounters = _init_depletionCounters(this, []);

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_depletionCounters(this), _init_name(this, ""));

  /** m_placements (PIEveSOFDataHullExtensionPlacementVector) [READ, PERSIST] */
  placements = (_init_extra_name(this), _init_placements(this, []));

  /** m_randomizeSeedOnLoad (bool) [READWRITE, PERSIST] */
  randomizeSeedOnLoad = (_init_extra_placements(this), _init_randomizeSeedOnLoad(this, false));

  /** m_seed (int32_t) [READWRITE, PERSIST] */
  seed = (_init_extra_randomizeSeedOnLoad(this), _init_seed(this, 1337));
  static {
    _initClass();
  }
}

export { _EveSOFDataLayout as EveSOFDataLayout };
//# sourceMappingURL=EveSOFDataLayout.js.map
