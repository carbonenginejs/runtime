import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_viewDir, _init_extra_viewDir, _init_upDir, _init_extra_upDir;

/** ITr2ImpostorSource (trinityCore) - generated from schema shapeHash f693d201.... */
let _ITr2ImpostorSource;
class ITr2ImpostorSource extends CjsModel {
  static {
    ({
      e: [_init_viewDir, _init_extra_viewDir, _init_upDir, _init_extra_upDir],
      c: [_ITr2ImpostorSource, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "ITr2ImpostorSource",
      family: "trinityCore"
    })], [[[type, type.vec3], 16, "viewDir"], [[type, type.vec3], 16, "upDir"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_upDir(this);
  }
  /** viewDir (Vector3) */
  viewDir = _init_viewDir(this, vec3.create());

  /** upDir (Vector3) */
  upDir = (_init_extra_viewDir(this), _init_upDir(this, vec3.create()));
  static {
    _initClass();
  }
}

export { _ITr2ImpostorSource as ITr2ImpostorSource };
//# sourceMappingURL=ITr2ImpostorSource.js.map
