import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass;

/** Empty Carbon marker interface for hull locator-set list members (EveSOFData.h:1107-1111). */
let _IEveSOFDataHullLocat;
class IEveSOFDataHullLocatorSet extends CjsModel {
  static {
    [_IEveSOFDataHullLocat, _initClass] = _applyDecs2311(this, [type.define({
      className: "IEveSOFDataHullLocatorSet",
      family: "eve"
    })], [], 0, void 0, CjsModel).c;
  }
  static {
    _initClass();
  }
}

export { _IEveSOFDataHullLocat as IEveSOFDataHullLocatorSet };
//# sourceMappingURL=IEveSOFDataHullLocatorSet.js.map
