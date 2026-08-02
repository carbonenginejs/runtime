import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_mode, _init_extra_mode, _init_coverage, _init_extra_coverage;

/** Logical alpha policy for one final character texture binding. */
let _CjsCharacterBindingA;
class CjsCharacterBindingAlpha extends CjsModel {
  static {
    ({
      e: [_init_mode, _init_extra_mode, _init_coverage, _init_extra_coverage],
      c: [_CjsCharacterBindingA, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterBindingAlpha",
      family: "character"
    })], [[[io, io.readwrite, type, type.string], 16, "mode"], [[io, io.readwrite, void 0, type.model("CjsCharacterCoverage")], 16, "coverage"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_coverage(this);
  }
  mode = _init_mode(this, "");
  coverage = (_init_extra_mode(this), _init_coverage(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterBindingA as CjsCharacterBindingAlpha };
//# sourceMappingURL=CjsCharacterBindingAlpha.js.map
