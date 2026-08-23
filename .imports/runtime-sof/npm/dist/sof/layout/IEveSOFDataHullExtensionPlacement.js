import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass;

/** Empty Carbon marker interface for hull-extension placement list members (EveSOFData.h:1911-1915). */
let _IEveSOFDataHullExten;
class IEveSOFDataHullExtensionPlacement extends CjsModel {
  static {
    [_IEveSOFDataHullExten, _initClass] = _applyDecs2311(this, [type.define({
      className: "IEveSOFDataHullExtensionPlacement",
      family: "eve"
    })], [], 0, void 0, CjsModel).c;
  }
  static {
    _initClass();
  }
}

export { _IEveSOFDataHullExten as IEveSOFDataHullExtensionPlacement };
//# sourceMappingURL=IEveSOFDataHullExtensionPlacement.js.map
