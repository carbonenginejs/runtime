import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/core-types/schema';
import { CjsModel } from '@carbonenginejs/core-types/model';

let _initClass, _init_gsf_path, _init_extra_gsf_path;

/** GStateBindingCallbackData (resources) - generated from schema shapeHash ffae27cd.... */
let _GStateBindingCallbac;
class GStateBindingCallbackData extends CjsModel {
  static {
    ({
      e: [_init_gsf_path, _init_extra_gsf_path],
      c: [_GStateBindingCallbac, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "GStateBindingCallbackData",
      family: "resources"
    })], [[[type, type.string], 16, "gsf_path"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_gsf_path(this);
  }
  /** gsf_path (std::string) */
  gsf_path = _init_gsf_path(this, "");
  static {
    _initClass();
  }
}

export { _GStateBindingCallbac as GStateBindingCallbackData };
//# sourceMappingURL=GStateBindingCallbackData.js.map
