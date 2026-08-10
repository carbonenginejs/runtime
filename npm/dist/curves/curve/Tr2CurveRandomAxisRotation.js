import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { quat, fromYawPitchRoll } from '@carbonenginejs/runtime-utils/quat';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_name, _init_extra_name, _init_currentValue, _init_extra_currentValue, _init_period, _init_extra_period, _init_seed, _init_extra_seed;

/**
 * Quaternion curve that spins at a fixed rate of one revolution per `period`
 * seconds about an axis fixed by two seed-derived random rotations applied
 * before and after the spin.
 */
let _Tr2CurveRandomAxisRo;
new class extends _identity {
  static [class Tr2CurveRandomAxisRotation extends CjsModel {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_currentValue, _init_extra_currentValue, _init_period, _init_extra_period, _init_seed, _init_extra_seed, _initProto],
        c: [_Tr2CurveRandomAxisRo, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2CurveRandomAxisRotation",
        family: "curves"
      })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.read, type, type.quat], 16, "currentValue"], [[io, io.persist, type, type.float32], 16, "period"], [[io, io.persistOnly, type, type.uint32], 16, "seed"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValueAt"], [[carbon, carbon.method, impl, impl.noop], 18, "GetValueDotAt"], [[carbon, carbon.method, impl, impl.noop], 18, "GetValueDoubleDotAt"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetSeed"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetSeed"], [[carbon, carbon.method, impl, impl.adapted], 18, "SeedChanged"]], 0, void 0, CjsModel));
    }
    name = (_initProto(this), _init_name(this, ""));
    currentValue = (_init_extra_name(this), _init_currentValue(this, quat.create()));
    period = (_init_extra_currentValue(this), _init_period(this, 1));
    seed = (_init_extra_period(this), _init_seed(this, 0));

    /**
     * Source runtime state; not exposed by Carbon's Blue schema.
     */
    preRotation = (_init_extra_seed(this), quat.create());

    /**
     * Source runtime state; not exposed by Carbon's Blue schema.
     */
    postRotation = quat.create();
    #rotation = quat.create();

    /**
     * Updates the cached quaternion value for the supplied time.
     */
    UpdateValue(time) {
      this.GetValueAt(time, this.currentValue);
    }

    /**
     * Updates the cached value and copies it into `out`.
     */
    Update(time, out) {
      this.UpdateValue(time);
      return quat.copy(out, this.currentValue);
    }

    /**
     * Gets the quaternion value at `time` into `out`.
     */
    GetValueAt(time, out) {
      return this.Evaluate(out, time);
    }

    /**
     * Derivative stub retained for Carbon interface compatibility.
     */
    GetValueDotAt(_time, out) {
      return out;
    }

    /**
     * Second-derivative stub retained for Carbon interface compatibility.
     */
    GetValueDoubleDotAt(_time, out) {
      return out;
    }

    /**
     * Gets the quaternion value at `time` into `out`.
     */
    GetValue(time, out) {
      return this.GetValueAt(time, out);
    }

    /**
     * Evaluates Carbon's row-vector chain post * pitch * pre (post applied
     * first, pre last) - gl composes it as pre . pitch . post.
     */
    Evaluate(out, time) {
      quat.copy(out, this.postRotation);
      if (this.period !== 0) {
        const angle = time / Math.abs(this.period) * Math.PI * 2;
        fromYawPitchRoll(this.#rotation, 0, angle, 0);
        quat.multiply(out, this.#rotation, out);
      }
      return quat.multiply(out, this.preRotation, out);
    }

    /**
     * Rebuilds random rotations when a persisted seed is available.
     */
    Initialize() {
      if (this.seed !== 0) {
        this.SeedChanged();
        this.UpdateValues({
          property: "seed",
          source: this,
          skipEvents: true
        });
      }
      return true;
    }

    /**
     * Gets the deterministic seed value.
     */
    GetSeed() {
      return this.seed;
    }

    /**
     * Sets the deterministic seed value and rebuilds random rotations.
     */
    SetSeed(seed, options = {}) {
      const changed = this.SetValues({
        seed: seed >>> 0
      }, {
        ...options,
        skipUpdate: true,
        returnBoolean: true
      });
      if (!changed) return false;
      this.SeedChanged();
      if (options.skipUpdate !== true) {
        this.UpdateValues({
          ...options,
          source: options.source ?? this
        });
      }
      return true;
    }

    /**
     * Rebuilds pre/post random rotations.
     */
    SeedChanged() {
      const random = this.seed !== 0 ? _Tr2CurveRandomAxisRo.#makeMsvcDefaultRandomEngine(this.seed) : Math.random;
      _Tr2CurveRandomAxisRo.#buildCarbonRandomRotation(this.preRotation, random);
      _Tr2CurveRandomAxisRo.#buildCarbonRandomRotation(this.postRotation, random);
    }

    /**
     * Draws roll, pitch and yaw from the supplied generator in that order -
     * matching Carbon's draw order, which fixes the resulting rotation for a given
     * seed - and writes the quaternion into `out`.
     */

    /** Draws one angle uniformly in [0, 2pi) radians from the supplied generator. */

    /**
     * Builds a [0, 1] generator over a Mersenne Twister seeded like MSVC's
     * default_random_engine, so a persisted seed reproduces Carbon's rotations.
     */
  }];
  #buildCarbonRandomRotation(out, random) {
    const roll = _Tr2CurveRandomAxisRo.#randomAngle(random);
    const pitch = _Tr2CurveRandomAxisRo.#randomAngle(random);
    const yaw = _Tr2CurveRandomAxisRo.#randomAngle(random);
    return fromYawPitchRoll(out, yaw, pitch, roll);
  }
  #randomAngle(random) {
    return random() * Math.PI * 2;
  }
  #makeMsvcDefaultRandomEngine(seed) {
    const engine = new CjsMt19937(seed >>> 0);
    return () => engine.Next() / 0xffffffff;
  }
  constructor() {
    super(_Tr2CurveRandomAxisRo), _initClass();
  }
}();
class CjsMt19937 {
  #state = new Uint32Array(624);
  #index = 624;

  /** Seeds the 624-word state with MT19937's standard initialisation recurrence. */
  constructor(seed) {
    this.#state[0] = seed >>> 0;
    for (let i = 1; i < this.#state.length; i++) {
      const previous = this.#state[i - 1];
      this.#state[i] = Math.imul(1812433253, previous ^ previous >>> 30) + i >>> 0;
    }
  }

  /**
   * Returns the next 32-bit unsigned value, regenerating the state block when
   * the previous 624 outputs are exhausted.
   */
  Next() {
    if (this.#index >= this.#state.length) {
      this.#twist();
    }
    let value = this.#state[this.#index++];
    value ^= value >>> 11;
    value ^= value << 7 & 0x9d2c5680;
    value ^= value << 15 & 0xefc60000;
    value ^= value >>> 18;
    return value >>> 0;
  }

  /** Regenerates the whole 624-word state block and rewinds the output cursor. */
  #twist() {
    for (let i = 0; i < this.#state.length; i++) {
      const next = (i + 1) % this.#state.length;
      const mix = this.#state[i] & 0x80000000 | this.#state[next] & 0x7fffffff;
      let value = this.#state[(i + 397) % this.#state.length] ^ mix >>> 1;
      if (mix & 1) {
        value ^= 0x9908b0df;
      }
      this.#state[i] = value >>> 0;
    }
    this.#index = 0;
  }
}

export { _Tr2CurveRandomAxisRo as Tr2CurveRandomAxisRotation };
//# sourceMappingURL=Tr2CurveRandomAxisRotation.js.map
