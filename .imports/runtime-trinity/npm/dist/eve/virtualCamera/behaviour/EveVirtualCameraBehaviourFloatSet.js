import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveVirtualCameraBehaviourFloatBase as _EveVirtualCameraBeha$1 } from './EveVirtualCameraBehaviourFloatBase.js';

let _initProto, _initClass, _init_value, _init_extra_value;

/**
 * Float behaviour that overrides whatever the earlier behaviours accumulated
 * with an authored constant.
 */
let _EveVirtualCameraBeha;
class EveVirtualCameraBehaviourFloatSet extends _EveVirtualCameraBeha$1 {
  static {
    ({
      e: [_init_value, _init_extra_value, _initProto],
      c: [_EveVirtualCameraBeha, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveVirtualCameraBehaviourFloatSet",
      family: "eve/virtualCamera/behaviour"
    })], [[[io, io.persist, type, type.float32], 16, "value"], [[carbon, carbon.method, impl, impl.implemented], 18, "Update"]], 0, void 0, _EveVirtualCameraBeha$1));
  }
  value = (_initProto(this), _init_value(this, 0));

  /**
   * Stamps the authored behaviour name that identifies this entry in a camera
   * behaviour list.
   */
  constructor() {
    super(), _init_extra_value(this);
    this.name = "Set";
  }

  /**
   * Returns the delta that replaces the incoming value with the authored one,
   * since the camera accumulates behaviour results additively.
   */
  Update(_camera, current) {
    return this.value - current;
  }
  static {
    _initClass();
  }
}

export { _EveVirtualCameraBeha as EveVirtualCameraBehaviourFloatSet };
//# sourceMappingURL=EveVirtualCameraBehaviourFloatSet.js.map
