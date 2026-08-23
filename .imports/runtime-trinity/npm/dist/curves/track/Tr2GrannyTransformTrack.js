import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsGrannyCurves } from './CjsGrannyCurves.js';
import { Tr2GrannyTrack as _Tr2GrannyTrack } from './Tr2GrannyTrack.js';

let _initProto, _initClass, _init_compressCurves, _init_extra_compressCurves, _init_rotation, _init_extra_rotation, _init_translation, _init_extra_translation, _init_scale, _init_extra_scale;

/**
 * Granny track that samples a bone's position, orientation and scale-shear
 * curves together, exposing them as a translation vector, rotation quaternion
 * and scale vector.
 */
let _Tr2GrannyTransformTr;
class Tr2GrannyTransformTrack extends _Tr2GrannyTrack {
  static {
    ({
      e: [_init_compressCurves, _init_extra_compressCurves, _init_rotation, _init_extra_rotation, _init_translation, _init_extra_translation, _init_scale, _init_extra_scale, _initProto],
      c: [_Tr2GrannyTransformTr, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2GrannyTransformTrack",
      family: "curves"
    })], [[[io, io.readwrite, type, type.boolean], 16, "compressCurves"], [[io, io.read, type, type.quat], 16, "rotation"], [[io, io.read, type, type.vec3], 16, "translation"], [[io, io.read, type, type.vec3], 16, "scale"], [[carbon, carbon.method, impl, impl.implemented], 18, "TracksReady"], [[carbon, carbon.method, impl, impl.implemented], 18, "ResetTracks"], [[carbon, carbon.method, impl, impl.adapted], 18, "ApplyTracks"], [[carbon, carbon.method, impl, impl.adapted], 18, "UpdateValueImpl"]], 0, void 0, _Tr2GrannyTrack));
  }
  compressCurves = (_initProto(this), _init_compressCurves(this, false));
  rotation = (_init_extra_compressCurves(this), _init_rotation(this, quat.create()));
  translation = (_init_extra_rotation(this), _init_translation(this, vec3.create()));
  scale = (_init_extra_translation(this), _init_scale(this, vec3.create()));
  #positionCurve = (_init_extra_scale(this), null);
  #orientationCurve = null;
  #scaleCurve = null;
  #scaleShearScratch = new Array(9).fill(0);

  /**
   * Checks whether transform track handles are ready.
   */
  TracksReady() {
    return this.#positionCurve !== null && this.#orientationCurve !== null && this.#scaleCurve !== null;
  }

  /**
   * Clears transform track handles.
   */
  ResetTracks() {
    this.#positionCurve = null;
    this.#orientationCurve = null;
    this.#scaleCurve = null;
  }

  /**
   * Applies transform track handles.
   */
  ApplyTracks(group, duration, _timeStep) {
    const track = CjsGrannyCurves.findTransformTrack(group, this.name);
    if (!track) {
      return;
    }
    const positionCurve = CjsGrannyCurves.decodeGrannyCurve(track.position, 3);
    const orientationCurve = CjsGrannyCurves.decodeGrannyCurve(track.orientation, 4);
    const scaleCurve = CjsGrannyCurves.decodeGrannyCurve(track.scaleShear, 9);
    if (!positionCurve || !orientationCurve || !scaleCurve) {
      return;
    }
    this.duration = duration;
    this.#positionCurve = positionCurve;
    this.#orientationCurve = orientationCurve;
    this.#scaleCurve = scaleCurve;
    this.UpdateValue(0);
  }

  /**
   * Updates sampled transform values.
   */
  UpdateValueImpl(time) {
    if (!this.#positionCurve || !this.#orientationCurve || !this.#scaleCurve) {
      return;
    }
    CjsGrannyCurves.sampleGrannyCurve(this.translation, this.#positionCurve, time, this.cycle, this.duration);
    CjsGrannyCurves.sampleGrannyCurve(this.rotation, this.#orientationCurve, time, this.cycle, this.duration);
    quat.normalize(this.rotation, this.rotation);
    const scaleShear = CjsGrannyCurves.sampleGrannyCurve(this.#scaleShearScratch, this.#scaleCurve, time, this.cycle, this.duration);
    this.scale[0] = Math.hypot(scaleShear[0], scaleShear[1], scaleShear[2]);
    this.scale[1] = Math.hypot(scaleShear[3], scaleShear[4], scaleShear[5]);
    this.scale[2] = Math.hypot(scaleShear[6], scaleShear[7], scaleShear[8]);
  }
  static {
    _initClass();
  }
}

export { _Tr2GrannyTransformTr as Tr2GrannyTransformTrack };
//# sourceMappingURL=Tr2GrannyTransformTrack.js.map
