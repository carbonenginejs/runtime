import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Tr2CurveScalar as _Tr2CurveScalar } from '../../../curves/Tr2CurveScalar.js';
import { Tr2CurveExtrapolation } from '../../../curves/enums.js';
import { TriPerlinCurve as _TriPerlinCurve } from '../../../curves/TriPerlinCurve.js';
import { EveVirtualCameraBehaviourVector3Base as _EveVirtualCameraBeha$1 } from './EveVirtualCameraBehaviourVector3Base.js';

let _initProto, _initClass, _init_octaves, _init_extra_octaves, _init_magnitudeCurve, _init_extra_magnitudeCurve, _init_magnitude, _init_extra_magnitude, _init_perlineScale, _init_extra_perlineScale, _init_scaleByView, _init_extra_scaleByView;

/**
 * Vector3 behaviour that shakes the camera with independent per-axis Perlin
 * noise applied along the camera's own right, up and forward axes.
 */
let _EveVirtualCameraBeha;
new class extends _identity {
  static [class EveVirtualCameraBehaviourVector3Shake extends _EveVirtualCameraBeha$1 {
    static {
      ({
        e: [_init_octaves, _init_extra_octaves, _init_magnitudeCurve, _init_extra_magnitudeCurve, _init_magnitude, _init_extra_magnitude, _init_perlineScale, _init_extra_perlineScale, _init_scaleByView, _init_extra_scaleByView, _initProto],
        c: [_EveVirtualCameraBeha, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveVirtualCameraBehaviourVector3Shake",
        family: "eve/virtualCamera/behaviour"
      })], [[[io, io.persist, type, type.int32], 16, "octaves"], [[io, io.persist, void 0, type.objectRef("Tr2CurveScalar")], 16, "magnitudeCurve"], [[io, io.persist, type, type.vec3], 16, "magnitude"], [[io, io.persist, type, type.float32], 16, "perlineScale"], [[io, io.persist, type, type.boolean], 16, "scaleByView"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetName"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"]], 0, void 0, _EveVirtualCameraBeha$1));
    }
    octaves = (_initProto(this), _init_octaves(this, 8));
    magnitudeCurve = (_init_extra_octaves(this), _init_magnitudeCurve(this, null));
    magnitude = (_init_extra_magnitudeCurve(this), _init_magnitude(this, vec3.fromValues(1, 0.6, 0.2)));
    perlineScale = (_init_extra_magnitude(this), _init_perlineScale(this, 1));
    scaleByView = (_init_extra_perlineScale(this), _init_scaleByView(this, true));
    #phase = (_init_extra_scaleByView(this), _EveVirtualCameraBeha.#allocatePhase());

    /**
     * Creates the default magnitude envelope curve and names the behaviour
     * "Shake".
     */
    constructor() {
      super();
      this.magnitudeCurve = _EveVirtualCameraBeha.#createMagnitudeCurve();
      this.SetName("Shake");
    }

    /** Sets the behaviour name and renames the owned magnitude curve to match. */
    SetName(name) {
      super.SetName(name);
      this.magnitudeCurve?.SetName?.(`${this.name} - Magnitude Curve`);
    }

    /**
     * Returns the shake offset for this frame: the authored per-axis magnitude
     * scaled by three decorrelated Perlin samples and by the magnitude envelope at
     * normalized timeline time, optionally compressed through atan and scaled by
     * the camera-to-interest distance when scaleByView is set, then mapped onto
     * the camera's right, up and forward axes.
     */
    Update(camera, _current, _deltaTime, localElapsedTime, _anchorPosition, _anchorRadius, _anchorForwardDirection, out = vec3.create()) {
      const offset = vec3.clone(this.magnitude);
      offset[0] *= _EveVirtualCameraBeha.#clampedNoise(localElapsedTime + this.#phase + 1.1, this.perlineScale, this.octaves);
      offset[1] *= _EveVirtualCameraBeha.#clampedNoise(localElapsedTime + this.#phase + 10.1, this.perlineScale, this.octaves);
      offset[2] *= _EveVirtualCameraBeha.#clampedNoise(localElapsedTime + this.#phase + 18.3, this.perlineScale, this.octaves);
      if (this.magnitudeCurve) {
        const duration = Number(camera?.GetAnimationTimelineLength?.() ?? 0);
        const time = duration !== 0 ? localElapsedTime / duration : 0;
        vec3.scale(offset, offset, Number(this.magnitudeCurve.GetValue?.(time) ?? 1));
      }
      if (this.scaleByView) {
        const distance = vec3.distance(camera.GetPointOfInterest(vec3.create()), camera.GetPosition(vec3.create()));
        offset[0] = Math.atan(offset[0]) * distance;
        offset[1] = Math.atan(offset[1]) * distance;
        offset[2] = Math.atan(offset[2]) * distance;
      }
      vec3.scale(out, camera.GetRightDirection(vec3.create()), offset[0]);
      vec3.scaleAndAdd(out, out, camera.GetUpDirection(vec3.create()), offset[1]);
      return vec3.scaleAndAdd(out, out, camera.GetForwardDirection(vec3.create()), offset[2]);
    }

    /**
     * Samples one axis of 1D Perlin noise at the given time offset scaled by
     * frequency, summing the configured number of octaves.
     */

    /**
     * Builds the default shake envelope over normalized time: an almost immediate
     * rise to full magnitude by 0.1, then a linear fade to zero at the end of the
     * timeline.
     */

    /**
     * Hands each new instance a distinct noise phase from a rolling 12-bit
     * counter, so shakes created together do not sample identical noise.
     */
  }];
  #nextPhase = 0;
  #clampedNoise(offset, frequency, octaves) {
    return _TriPerlinCurve.PerlinNoise1D(offset * frequency, 2, 2, octaves);
  }
  #createMagnitudeCurve() {
    const curve = new _Tr2CurveScalar();
    curve.SetExtrapolation(Tr2CurveExtrapolation.LINEAR);
    curve.AddKey(0, 0);
    curve.AddKey(0.001, 0.8);
    curve.AddKey(0.1, 1);
    curve.AddKey(1, 0);
    return curve;
  }
  #allocatePhase() {
    const phase = _EveVirtualCameraBeha.#nextPhase & 0xfff;
    _EveVirtualCameraBeha.#nextPhase++;
    return phase;
  }
  constructor() {
    super(_EveVirtualCameraBeha), _initClass();
  }
}();

export { _EveVirtualCameraBeha as EveVirtualCameraBehaviourVector3Shake };
//# sourceMappingURL=EveVirtualCameraBehaviourVector3Shake.js.map
