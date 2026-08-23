import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveVirtualCameraBehaviourVector3Base as _EveVirtualCameraBeha$1 } from './EveVirtualCameraBehaviourVector3Base.js';

let _initProto, _initClass, _init_proportional, _init_extra_proportional, _init_world, _init_extra_world, _init_offset, _init_extra_offset;

/**
 * Vector3 behaviour that applies a fixed, time-independent displacement, either
 * in world space or in the anchor's yaw frame.
 */
let _EveVirtualCameraBeha;
class EveVirtualCameraBehaviourVector3Offset extends _EveVirtualCameraBeha$1 {
  static {
    ({
      e: [_init_proportional, _init_extra_proportional, _init_world, _init_extra_world, _init_offset, _init_extra_offset, _initProto],
      c: [_EveVirtualCameraBeha, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveVirtualCameraBehaviourVector3Offset",
      family: "eve/virtualCamera/behaviour"
    })], [[[io, io.persist, type, type.boolean], 16, "proportional"], [[io, io.persist, type, type.boolean], 16, "world"], [[io, io.persist, type, type.vec3], 16, "offset"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"]], 0, void 0, _EveVirtualCameraBeha$1));
  }
  proportional = (_initProto(this), _init_proportional(this, true));
  world = (_init_extra_proportional(this), _init_world(this, false));
  offset = (_init_extra_world(this), _init_offset(this, vec3.create()));

  /**
   * Names the behaviour "Offset"; it owns no curves, so the offset is constant
   * over the timeline.
   */
  constructor() {
    super(), _init_extra_offset(this);
    this.name = "Offset";
  }

  /**
   * Returns the authored offset, yawed into the anchor's heading unless world is
   * set and multiplied by the anchor radius when proportional is set; it ignores
   * time and delta time entirely.
   */
  Update(_camera, _current, _deltaTime, _localElapsedTime, _anchorPosition, anchorRadius, anchorForwardDirection, out = vec3.create()) {
    if (this.world) {
      vec3.copy(out, this.offset);
    } else {
      _EveVirtualCameraBeha$1.rotateVectorWithAnchor(out, this.offset, anchorForwardDirection);
    }
    if (this.proportional) {
      vec3.scale(out, out, anchorRadius);
    }
    return out;
  }
  static {
    _initClass();
  }
}

export { _EveVirtualCameraBeha as EveVirtualCameraBehaviourVector3Offset };
//# sourceMappingURL=EveVirtualCameraBehaviourVector3Offset.js.map
