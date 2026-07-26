import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { carbonPerlin1D } from '@carbonenginejs/runtime-utils/noise';

let _initProto, _initClass, _init_alpha, _init_extra_alpha, _init_beta, _init_extra_beta, _init_N, _init_extra_N, _init_value, _init_extra_value, _init_scale, _init_extra_scale, _init_offset, _init_extra_offset, _init_speed, _init_extra_speed, _init_name, _init_extra_name;

/**
 * Scalar curve driven by fractal Perlin noise, mapping the noise band to
 * [offset, offset + scale] and advancing at `speed` from a per-instance random
 * phase.
 */
let _TriPerlinCurve;
new class extends _identity {
  static [class TriPerlinCurve extends CjsModel {
    static {
      ({
        e: [_init_alpha, _init_extra_alpha, _init_beta, _init_extra_beta, _init_N, _init_extra_N, _init_value, _init_extra_value, _init_scale, _init_extra_scale, _init_offset, _init_extra_offset, _init_speed, _init_extra_speed, _init_name, _init_extra_name, _initProto],
        c: [_TriPerlinCurve, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "TriPerlinCurve",
        family: "trinityCore"
      })], [[[io, io.persist, type, type.float32], 16, "alpha"], [[io, io.persist, type, type.float32], 16, "beta"], [[io, io.persist, type, type.int32], 16, "N"], [[io, io.persist, type, type.float32], 16, "value"], [[io, io.persist, type, type.float32], 16, "scale"], [[io, io.persist, type, type.float32], 16, "offset"], [[io, io.persist, type, type.float32], 16, "speed"], [[io, io.persist, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "Update"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetValueAt"], [[carbon, carbon.method, impl, impl.implemented], 18, "ScaleTime"]], 0, void 0, CjsModel));
    }
    /** Mirrors Carbon's process setting used for deterministic expression previews. */

    alpha = (_initProto(this), _init_alpha(this, 1.1));
    beta = (_init_extra_alpha(this), _init_beta(this, 2));
    N = (_init_extra_beta(this), _init_N(this, 3));
    value = (_init_extra_N(this), _init_value(this, 0));
    scale = (_init_extra_value(this), _init_scale(this, 1));
    offset = (_init_extra_scale(this), _init_offset(this, 0));
    speed = (_init_extra_offset(this), _init_speed(this, 1));
    name = (_init_extra_speed(this), _init_name(this, ""));
    #lastUpdated = (_init_extra_name(this), -1);
    #startOffset = _TriPerlinCurve.#nextStartOffset();

    /** Updates the cached value for the supplied time. */
    UpdateValue(time) {
      this.Update(time);
    }

    /**
     * Updates and returns the cached value, skipping the noise evaluation when the
     * time is unchanged since the last call.
     */
    Update(time) {
      if (this.#lastUpdated !== time) {
        this.#lastUpdated = time;
        this.value = this.GetValueAt(time);
      }
      return this.value;
    }

    /**
     * Samples the noise at a time and maps it to [offset, offset + scale]; the
     * per-instance random phase is replaced by a fixed offset when
     * expressionCurveFakeRandom is set, so editor previews are deterministic.
     */
    GetValueAt(time) {
      let position = Number(time);
      if (_TriPerlinCurve.expressionCurveFakeRandom) {
        position = position * this.speed + 0.21;
      } else {
        position = (position + this.#startOffset) * this.speed;
      }
      const noise = _TriPerlinCurve.PerlinNoise1D(position, this.alpha, this.beta, this.N);
      return (noise + 1) / 2 * this.scale + this.offset;
    }

    /** Carbon's implementation changes output amplitude despite the historical name. */
    ScaleTime(scale) {
      this.scale = scale;
    }

    /**
     * Evaluates Carbon's 1D fractal Perlin noise, returning a value in roughly
     * [-1, 1].
     */
    static PerlinNoise1D(position, inverseAmplitude, frequency, octaves) {
      return carbonPerlin1D(position, inverseAmplitude, frequency, octaves);
    }

    /**
     * Draws the next per-instance noise phase from Carbon's shared
     * linear-congruential TriRand state, reproducing its 32-bit integer truncation
     * so offsets match the C++ sequence.
     */
  }];
  expressionCurveFakeRandom = false;
  #triRandState = 1234;
  #nextStartOffset() {
    let state = _TriPerlinCurve.#triRandState;
    state = (state << 12) + 150889 >>> 0;
    state %= 714025;
    _TriPerlinCurve.#triRandState = state;

    // Carbon casts 10,000,000,000 to its 32-bit `int` parameter on Windows.
    const carbonIntLimit = 10000000000 >>> 0;
    return Math.floor((Math.imul(carbonIntLimit, state) >>> 0) / 714025);
  }
  constructor() {
    super(_TriPerlinCurve), _initClass();
  }
}();

export { _TriPerlinCurve as TriPerlinCurve };
//# sourceMappingURL=TriPerlinCurve.js.map
