import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsGrannyCurves } from './CjsGrannyCurves.js';
import { Tr2GrannyTrack as _Tr2GrannyTrack } from './Tr2GrannyTrack.js';

let _initProto, _initClass, _init_value, _init_extra_value;

/**
 * Granny track that samples a named one-dimensional vector track and exposes it
 * as a scalar value.
 */
let _Tr2GrannyVectorTrack;
class Tr2GrannyVectorTrack extends _Tr2GrannyTrack {
  static {
    ({
      e: [_init_value, _init_extra_value, _initProto],
      c: [_Tr2GrannyVectorTrack, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2GrannyVectorTrack",
      family: "curves"
    })], [[[io, io.read, type, type.float32], 16, "value"], [[carbon, carbon.method, impl, impl.implemented], 18, "TracksReady"], [[carbon, carbon.method, impl, impl.implemented], 18, "ResetTracks"], [[carbon, carbon.method, impl, impl.adapted], 18, "ApplyTracks"], [[carbon, carbon.method, impl, impl.adapted], 18, "UpdateValueImpl"]], 0, void 0, _Tr2GrannyTrack));
  }
  value = (_initProto(this), _init_value(this, 0));
  #valueCurve = (_init_extra_value(this), null);
  #valueScratch = [0];

  /**
   * Checks whether vector track handles are ready.
   */
  TracksReady() {
    return this.#valueCurve !== null;
  }

  /**
   * Clears vector track handles.
   */
  ResetTracks() {
    this.#valueCurve = null;
  }

  /**
   * Applies vector track handles.
   */
  ApplyTracks(group, duration, _timeStep) {
    const track = CjsGrannyCurves.findVectorTrack(group, this.name);
    if (!track) {
      return;
    }
    const valueCurve = CjsGrannyCurves.decodeGrannyCurve(track.valueCurve, 1);
    if (!valueCurve) {
      return;
    }
    this.duration = duration;
    this.#valueCurve = valueCurve;
    this.UpdateValue(0);
  }

  /**
   * Updates sampled vector value.
   */
  UpdateValueImpl(time) {
    if (!this.#valueCurve) {
      return;
    }
    CjsGrannyCurves.sampleGrannyCurve(this.#valueScratch, this.#valueCurve, time, this.cycle, this.duration);
    this.value = this.#valueScratch[0];
  }
  static {
    _initClass();
  }
}

export { _Tr2GrannyVectorTrack as Tr2GrannyVectorTrack };
//# sourceMappingURL=Tr2GrannyVectorTrack.js.map
