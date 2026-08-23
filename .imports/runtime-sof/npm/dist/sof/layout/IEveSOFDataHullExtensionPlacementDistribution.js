import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_name, _init_extra_name;

/** Common Carbon interface for hull-extension placement conditions. */
let _IEveSOFDataHullExten;
class IEveSOFDataHullExtensionPlacementDistribution extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name],
      c: [_IEveSOFDataHullExten, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "IEveSOFDataHullExtensionPlacementDistribution",
      family: "eve"
    })], [[[type, type.string], 16, "name"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_name(this);
  }
  /** m_name (std::string); persisted by each concrete Blue class. */
  name = _init_name(this, "");
  static {
    _initClass();
  }
}

export { _IEveSOFDataHullExten as IEveSOFDataHullExtensionPlacementDistribution };
//# sourceMappingURL=IEveSOFDataHullExtensionPlacementDistribution.js.map
