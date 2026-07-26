import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveVirtualCameraBehaviourFloatBase as _EveVirtualCameraBeha$1 } from './EveVirtualCameraBehaviourFloatBase.js';

let _initProto, _initClass, _init_scaleCurve, _init_extra_scaleCurve, _init_value, _init_extra_value;

/**
 * Float behaviour that adds an authored constant, optionally shaped across the
 * timeline by a scale curve.
 */
let _EveVirtualCameraBeha;
class EveVirtualCameraBehaviourFloatAdd extends _EveVirtualCameraBeha$1 {
  static {
    ({
      e: [_init_scaleCurve, _init_extra_scaleCurve, _init_value, _init_extra_value, _initProto],
      c: [_EveVirtualCameraBeha, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveVirtualCameraBehaviourFloatAdd",
      family: "eve/virtualCamera/behaviour"
    })], [[[io, io.persist, void 0, type.objectRef("Tr2CurveScalar")], 16, "scaleCurve"], [[io, io.persist, type, type.float32], 16, "value"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetName"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"]], 0, void 0, _EveVirtualCameraBeha$1));
  }
  scaleCurve = (_initProto(this), _init_scaleCurve(this, null));
  value = (_init_extra_scaleCurve(this), _init_value(this, 0));

  /**
   * Names the behaviour "Add"; no scale curve is created, so the constant is
   * unshaped until one is authored.
   */
  constructor() {
    super(), _init_extra_value(this);
    this.name = "Add";
  }

  /** Sets the behaviour name and renames the owned scale curve to match. */
  SetName(name) {
    super.SetName(name);
    this.scaleCurve?.SetName?.(`${this.name} - Scale Curve`);
  }

  /**
   * Returns the authored value, scaled by the scale curve at normalized timeline
   * time when one is set, and returned as-is when it is not.
   */
  Update(camera, _current, _deltaTime, localElapsedTime) {
    if (!this.scaleCurve) {
      return this.value;
    }
    const duration = Number(camera?.GetAnimationTimelineLength?.() ?? 0);
    const time = duration !== 0 ? localElapsedTime / duration : 0;
    return this.value * Number(this.scaleCurve.GetValue?.(time) ?? 1);
  }
  static {
    _initClass();
  }
}

export { _EveVirtualCameraBeha as EveVirtualCameraBehaviourFloatAdd };
//# sourceMappingURL=EveVirtualCameraBehaviourFloatAdd.js.map
