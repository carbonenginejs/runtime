import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { type } from '@carbonenginejs/runtime-utils/schema';

let _initClass, _init_WorldMat, _init_extra_WorldMat;

/**
 * Minimal pixel-stage per-object record carrying only the world matrix, matching
 * Carbon's shared Eve constant-buffer format.
 */
let _EvePerObjectPSData;
class EvePerObjectPSData extends CjsModel {
  static {
    ({
      e: [_init_WorldMat, _init_extra_WorldMat],
      c: [_EvePerObjectPSData, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EvePerObjectPSData",
      family: "eve"
    })], [[[type, type.mat4], 16, "WorldMat"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_WorldMat(this);
  }
  WorldMat = _init_WorldMat(this, mat4.create());
  static {
    _initClass();
  }
}

export { _EvePerObjectPSData as EvePerObjectPSData };
//# sourceMappingURL=EvePerObjectPSData.js.map
