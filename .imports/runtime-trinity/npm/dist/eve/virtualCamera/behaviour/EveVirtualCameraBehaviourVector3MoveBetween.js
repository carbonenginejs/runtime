import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveVirtualCameraBehaviourVector3Base as _EveVirtualCameraBeha$1 } from './EveVirtualCameraBehaviourVector3Base.js';

let _initProto, _initClass, _init_end, _init_extra_end, _init_proportional, _init_extra_proportional, _init_world, _init_extra_world, _init_interpolationCurve, _init_extra_interpolationCurve, _init_start, _init_extra_start;

/**
 * Vector3 behaviour that sweeps the camera value from one authored endpoint to
 * another across the animation timeline.
 */
let _EveVirtualCameraBeha;
class EveVirtualCameraBehaviourVector3MoveBetween extends _EveVirtualCameraBeha$1 {
  static {
    ({
      e: [_init_end, _init_extra_end, _init_proportional, _init_extra_proportional, _init_world, _init_extra_world, _init_interpolationCurve, _init_extra_interpolationCurve, _init_start, _init_extra_start, _initProto],
      c: [_EveVirtualCameraBeha, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveVirtualCameraBehaviourVector3MoveBetween",
      family: "eve/virtualCamera/behaviour"
    })], [[[io, io.persist, type, type.vec3], 16, "end"], [[io, io.persist, type, type.boolean], 16, "proportional"], [[io, io.persist, type, type.boolean], 16, "world"], [[io, io.persist, void 0, type.objectRef("Tr2CurveScalar")], 16, "interpolationCurve"], [[io, io.persist, type, type.vec3], 16, "start"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetName"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"]], 0, void 0, _EveVirtualCameraBeha$1));
  }
  end = (_initProto(this), _init_end(this, vec3.create()));
  proportional = (_init_extra_end(this), _init_proportional(this, false));
  world = (_init_extra_proportional(this), _init_world(this, true));
  interpolationCurve = (_init_extra_world(this), _init_interpolationCurve(this, null));
  start = (_init_extra_interpolationCurve(this), _init_start(this, vec3.create()));

  /**
   * Creates the default linear 0-to-1 interpolation curve and names the
   * behaviour "Move Between".
   */
  constructor() {
    super(), _init_extra_start(this);
    this.interpolationCurve = _EveVirtualCameraBeha$1.createEaseCurve();
    this.SetName("Move Between");
  }

  /** Sets the behaviour name and renames the owned interpolation curve to match. */
  SetName(name) {
    super.SetName(name);
    this.interpolationCurve?.SetName?.(`${this.name} - Interpolation Curve`);
  }

  /**
   * Returns the point interpolated from start to end by the interpolation curve
   * at normalized timeline time; both endpoints are multiplied by the anchor
   * radius when proportional is set and yawed into the anchor's heading when
   * world is false, and end is returned directly when the timeline has zero
   * length.
   */
  Update(camera, _current, _deltaTime, localElapsedTime, _anchorPosition, anchorRadius, anchorForwardDirection, out = vec3.create()) {
    const duration = Number(camera?.GetAnimationTimelineLength?.() ?? 0);
    if (duration === 0) {
      return vec3.copy(out, this.end);
    }
    const start = vec3.clone(this.start);
    const end = vec3.clone(this.end);
    if (this.proportional) {
      vec3.scale(start, start, anchorRadius);
      vec3.scale(end, end, anchorRadius);
    }
    if (!this.world) {
      _EveVirtualCameraBeha$1.rotateVectorWithAnchor(start, start, anchorForwardDirection);
      _EveVirtualCameraBeha$1.rotateVectorWithAnchor(end, end, anchorForwardDirection);
    }
    const time = localElapsedTime / duration;
    const amount = Number(this.interpolationCurve?.GetValue?.(time) ?? time);
    return vec3.lerp(out, start, end, amount);
  }
  static {
    _initClass();
  }
}

export { _EveVirtualCameraBeha as EveVirtualCameraBehaviourVector3MoveBetween };
//# sourceMappingURL=EveVirtualCameraBehaviourVector3MoveBetween.js.map
