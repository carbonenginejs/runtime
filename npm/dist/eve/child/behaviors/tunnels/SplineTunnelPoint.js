import { applyDecs2311 as _applyDecs2311 } from '../../../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_accelerationMultiplier, _init_extra_accelerationMultiplier, _init_pos, _init_extra_pos, _init_rot, _init_extra_rot;

/** SplineTunnelPoint (eve/child/behaviors) - generated from schema shapeHash da3b5246.... */
let _SplineTunnelPoint;
class SplineTunnelPoint extends CjsModel {
  static {
    ({
      e: [_init_accelerationMultiplier, _init_extra_accelerationMultiplier, _init_pos, _init_extra_pos, _init_rot, _init_extra_rot],
      c: [_SplineTunnelPoint, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "SplineTunnelPoint",
      family: "eve"
    })], [[[type, type.float32], 16, "accelerationMultiplier"], [[type, type.vec3], 16, "pos"], [[type, type.vec3], 16, "rot"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_rot(this);
  }
  /** accelerationMultiplier (float) */
  accelerationMultiplier = _init_accelerationMultiplier(this, 1);

  /** pos (Vector3) */
  pos = (_init_extra_accelerationMultiplier(this), _init_pos(this, vec3.create()));

  /** rot (Vector3) */
  rot = (_init_extra_pos(this), _init_rot(this, vec3.create()));
  static {
    _initClass();
  }
}

export { _SplineTunnelPoint as SplineTunnelPoint };
//# sourceMappingURL=SplineTunnelPoint.js.map
