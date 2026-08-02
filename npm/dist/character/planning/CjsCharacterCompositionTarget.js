import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_scope, _init_extra_scope, _init_region, _init_extra_region, _init_output, _init_extra_output, _init_size, _init_extra_size, _init_passes, _init_extra_passes, _init_origin, _init_extra_origin;

/** Logical output texture and its authoritative ordered composition passes. */
let _CjsCharacterComposit;
class CjsCharacterCompositionTarget extends CjsModel {
  static {
    ({
      e: [_init_scope, _init_extra_scope, _init_region, _init_extra_region, _init_output, _init_extra_output, _init_size, _init_extra_size, _init_passes, _init_extra_passes, _init_origin, _init_extra_origin],
      c: [_CjsCharacterComposit, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterCompositionTarget",
      family: "character"
    })], [[[io, io.readwrite, type, type.string], 16, "scope"], [[io, io.readwrite, type, type.string], 16, "region"], [[io, io.readwrite, type, type.string], 16, "output"], [[io, io.readwrite, type, type.vec2], 16, "size"], [[io, io.readwrite, void 0, type.list("CjsCharacterCompositionPass")], 16, "passes"], [[io, io.readwrite, void 0, type.model("CjsCharacterOrigin")], 16, "origin"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_origin(this);
  }
  scope = _init_scope(this, "");
  region = (_init_extra_scope(this), _init_region(this, ""));
  output = (_init_extra_region(this), _init_output(this, ""));
  size = (_init_extra_output(this), _init_size(this, null));
  passes = (_init_extra_size(this), _init_passes(this, []));
  origin = (_init_extra_passes(this), _init_origin(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterComposit as CjsCharacterCompositionTarget };
//# sourceMappingURL=CjsCharacterCompositionTarget.js.map
