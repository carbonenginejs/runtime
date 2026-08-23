import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveVirtualCameraBehaviourVector3Base as _EveVirtualCameraBeha$1 } from './EveVirtualCameraBehaviourVector3Base.js';

let _initProto, _initClass, _init_orbitCurve, _init_extra_orbitCurve, _init_distanceScalarCurve, _init_extra_distanceScalarCurve, _init_end, _init_extra_end, _init_proportional, _init_extra_proportional, _init_world, _init_extra_world, _init_start, _init_extra_start, _init_distance, _init_extra_distance;

/**
 * Vector3 behaviour that places the camera on a horizontal circle about the
 * anchor, sweeping from a start to an end angle over the timeline.
 */
let _EveVirtualCameraBeha;
class EveVirtualCameraBehaviourVector3Orbit extends _EveVirtualCameraBeha$1 {
  static {
    ({
      e: [_init_orbitCurve, _init_extra_orbitCurve, _init_distanceScalarCurve, _init_extra_distanceScalarCurve, _init_end, _init_extra_end, _init_proportional, _init_extra_proportional, _init_world, _init_extra_world, _init_start, _init_extra_start, _init_distance, _init_extra_distance, _initProto],
      c: [_EveVirtualCameraBeha, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveVirtualCameraBehaviourVector3Orbit",
      family: "eve/virtualCamera/behaviour"
    })], [[[io, io.persist, void 0, type.objectRef("Tr2CurveScalar")], 16, "orbitCurve"], [[io, io.persist, void 0, type.objectRef("Tr2CurveScalar")], 16, "distanceScalarCurve"], [[io, io.persist, type, type.float32], 16, "end"], [[io, io.persist, type, type.boolean], 16, "proportional"], [[io, io.persist, type, type.boolean], 16, "world"], [[io, io.notify, io, io.persist, type, type.float32], 16, "start"], [[io, io.persist, type, type.float32], 16, "distance"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetName"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"]], 0, void 0, _EveVirtualCameraBeha$1));
  }
  orbitCurve = (_initProto(this), _init_orbitCurve(this, null));
  distanceScalarCurve = (_init_extra_orbitCurve(this), _init_distanceScalarCurve(this, null));
  end = (_init_extra_distanceScalarCurve(this), _init_end(this, 180));
  proportional = (_init_extra_end(this), _init_proportional(this, true));
  world = (_init_extra_proportional(this), _init_world(this, false));
  start = (_init_extra_world(this), _init_start(this, 0));
  distance = (_init_extra_start(this), _init_distance(this, 1));

  /**
   * Creates the default constant distance-scalar curve and linear 0-to-1 orbit
   * curve, and names the behaviour "Orbit".
   */
  constructor() {
    super(), _init_extra_distance(this);
    this.distanceScalarCurve = _EveVirtualCameraBeha$1.createConstantCurve(1);
    this.orbitCurve = _EveVirtualCameraBeha$1.createEaseCurve();
    this.SetName("Orbit");
  }

  /** Sets the behaviour name and renames both owned curves to match. */
  SetName(name) {
    super.SetName(name);
    this.distanceScalarCurve?.SetName?.(`${this.name} - Distance Scalar Curve`);
    this.orbitCurve?.SetName?.(`${this.name} - Orbit Curve`);
  }

  /**
   * Returns the offset onto the orbit circle: world +Z, or the anchor's
   * horizontal forward direction when world is false, rotated about world up by
   * the start-to-end angle (degrees) reached by the orbit curve at normalized
   * timeline time, then scaled by distance, by the anchor radius when
   * proportional, and by the distance scalar curve.
   */
  Update(camera, _current, _deltaTime, localElapsedTime, _anchorPosition, anchorRadius, anchorForwardDirection, out = vec3.create()) {
    const duration = Number(camera?.GetAnimationTimelineLength?.() ?? 0);
    const time = duration !== 0 ? localElapsedTime / duration : 0;
    if (this.world) {
      vec3.set(out, 0, 0, 1);
    } else {
      vec3.set(out, anchorForwardDirection[0], 0, anchorForwardDirection[2]);
      if (vec3.squaredLength(out) === 0) {
        vec3.set(out, 0, 0, 1);
      } else {
        vec3.normalize(out, out);
      }
    }
    const amount = Number(this.orbitCurve?.GetValue?.(time) ?? time);
    const angle = (this.start + (this.end - this.start) * amount) * Math.PI / 180;
    vec3.transformQuat(out, out, quat.setAxisAngle(quat.create(), vec3.fromValues(0, 1, 0), angle));
    let range = this.distance;
    if (this.proportional) {
      range *= anchorRadius;
    }
    range *= Number(this.distanceScalarCurve?.GetValue?.(time) ?? 1);
    return vec3.scale(out, out, range);
  }
  static {
    _initClass();
  }
}

export { _EveVirtualCameraBeha as EveVirtualCameraBehaviourVector3Orbit };
//# sourceMappingURL=EveVirtualCameraBehaviourVector3Orbit.js.map
