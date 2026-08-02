import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_region, _init_extra_region, _init_source, _init_extra_source, _init_subtract, _init_extra_subtract, _init_combine, _init_extra_combine, _init_origin, _init_extra_origin;

/** Reusable appearance coverage expression shared across logical composition passes. */
let _CjsCharacterCoverage;
class CjsCharacterCoverage extends CjsModel {
  static {
    ({
      e: [_init_region, _init_extra_region, _init_source, _init_extra_source, _init_subtract, _init_extra_subtract, _init_combine, _init_extra_combine, _init_origin, _init_extra_origin],
      c: [_CjsCharacterCoverage, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterCoverage",
      family: "character"
    })], [[[io, io.readwrite, type, type.string], 16, "region"], [[io, io.readwrite, void 0, type.model("CjsCharacterTextureChannel")], 16, "source"], [[io, io.readwrite, void 0, type.list("CjsCharacterTextureChannel")], 16, "subtract"], [[io, io.readwrite, type, type.string], 16, "combine"], [[io, io.readwrite, void 0, type.model("CjsCharacterOrigin")], 16, "origin"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_origin(this);
  }
  region = _init_region(this, "");
  source = (_init_extra_region(this), _init_source(this, null));
  subtract = (_init_extra_source(this), _init_subtract(this, []));
  combine = (_init_extra_subtract(this), _init_combine(this, ""));
  origin = (_init_extra_combine(this), _init_origin(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterCoverage as CjsCharacterCoverage };
//# sourceMappingURL=CjsCharacterCoverage.js.map
