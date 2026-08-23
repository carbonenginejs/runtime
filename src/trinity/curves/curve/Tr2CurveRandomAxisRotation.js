// Source: trinity/trinity/Curves/Tr2CurveRandomAxisRotation.h
// Source: trinity/trinity/Curves/Tr2CurveRandomAxisRotation.cpp
import { fromYawPitchRoll, quat } from "#math/quat";
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";


/**
 * Quaternion curve that spins at a fixed rate of one revolution per `period`
 * seconds about an axis fixed by two seed-derived random rotations applied
 * before and after the spin.
 */
@type.define({
  className: "Tr2CurveRandomAxisRotation",
  family: "curves"
})
export class Tr2CurveRandomAxisRotation extends CjsModel
{
  @io.persist
  @type.string
  name = "";

  @io.read
  @type.quat
  currentValue = quat.create();

  @io.persist
  @type.float32
  period = 1;

  @io.persistOnly
  @type.uint32
  seed = 0;

  /**
   * Source runtime state; not exposed by Carbon's Blue schema.
   */
  preRotation = quat.create();

  /**
   * Source runtime state; not exposed by Carbon's Blue schema.
   */
  postRotation = quat.create();

  #rotation = quat.create();

  /**
   * Updates the cached quaternion value for the supplied time.
   */
  @carbon.method
  @impl.implemented
  UpdateValue(time)
  {
    this.GetValueAt(time, this.currentValue);
  }

  /**
   * Updates the cached value and copies it into `out`.
   */
  @carbon.method
  @impl.adapted
  Update(time, out)
  {
    this.UpdateValue(time);
    return quat.copy(out, this.currentValue);
  }

  /**
   * Gets the quaternion value at `time` into `out`.
   */
  @carbon.method
  @impl.adapted
  GetValueAt(time, out)
  {
    return this.Evaluate(out, time);
  }

  /**
   * Derivative stub retained for Carbon interface compatibility.
   */
  @carbon.method
  @impl.noop
  GetValueDotAt(_time, out)
  {
    return out;
  }

  /**
   * Second-derivative stub retained for Carbon interface compatibility.
   */
  @carbon.method
  @impl.noop
  GetValueDoubleDotAt(_time, out)
  {
    return out;
  }

  /**
   * Gets the quaternion value at `time` into `out`.
   */
  @carbon.method
  @impl.adapted
  GetValue(time, out)
  {
    return this.GetValueAt(time, out);
  }

  /**
   * Evaluates Carbon's row-vector chain post * pitch * pre (post applied
   * first, pre last) - gl composes it as pre . pitch . post.
   */
  Evaluate(out, time)
  {
    quat.copy(out, this.postRotation);
    if (this.period !== 0)
    {
      const angle = time / Math.abs(this.period) * Math.PI * 2;
      fromYawPitchRoll(this.#rotation, 0, angle, 0);
      quat.multiply(out, this.#rotation, out);
    }
    return quat.multiply(out, this.preRotation, out);
  }

  /**
   * Rebuilds random rotations when a persisted seed is available.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    if (this.seed !== 0)
    {
      this.SeedChanged();
      this.UpdateValues({ property: "seed", source: this, skipEvents: true });
    }
    return true;
  }

  /**
   * Gets the deterministic seed value.
   */
  @carbon.method
  @impl.implemented
  GetSeed()
  {
    return this.seed;
  }

  /**
   * Sets the deterministic seed value and rebuilds random rotations.
   */
  @carbon.method
  @impl.adapted
  SetSeed(seed, options = {})
  {
    const changed = this.SetValues({ seed: seed >>> 0 }, { ...options, skipUpdate: true, returnBoolean: true });
    if (!changed) return false;
    this.SeedChanged();
    if (options.skipUpdate !== true)
    {
      this.UpdateValues({ ...options, source: options.source ?? this });
    }
    return true;
  }

  /**
   * Rebuilds pre/post random rotations.
   */
  @carbon.method
  @impl.adapted
  SeedChanged()
  {
    const random = this.seed !== 0 ? Tr2CurveRandomAxisRotation.#makeMsvcDefaultRandomEngine(this.seed) : Math.random;
    Tr2CurveRandomAxisRotation.#buildCarbonRandomRotation(this.preRotation, random);
    Tr2CurveRandomAxisRotation.#buildCarbonRandomRotation(this.postRotation, random);
  }

  /**
   * Draws roll, pitch and yaw from the supplied generator in that order -
   * matching Carbon's draw order, which fixes the resulting rotation for a given
   * seed - and writes the quaternion into `out`.
   */
  static #buildCarbonRandomRotation(out, random)
  {
    const roll = Tr2CurveRandomAxisRotation.#randomAngle(random);
    const pitch = Tr2CurveRandomAxisRotation.#randomAngle(random);
    const yaw = Tr2CurveRandomAxisRotation.#randomAngle(random);
    return fromYawPitchRoll(out, yaw, pitch, roll);
  }

  /** Draws one angle uniformly in [0, 2pi) radians from the supplied generator. */
  static #randomAngle(random)
  {
    return random() * Math.PI * 2;
  }

  /**
   * Builds a [0, 1] generator over a Mersenne Twister seeded like MSVC's
   * default_random_engine, so a persisted seed reproduces Carbon's rotations.
   */
  static #makeMsvcDefaultRandomEngine(seed)
  {
    const engine = new CjsMt19937(seed >>> 0);
    return () => engine.Next() / 0xffffffff;
  }
}

/**
 * Deterministic MT19937 Mersenne Twister used to reproduce the C++ standard
 * library's default random sequence from a persisted seed.
 */
class CjsMt19937
{
  #state = new Uint32Array(624);

  #index = 624;

  /** Seeds the 624-word state with MT19937's standard initialisation recurrence. */
  constructor(seed)
  {
    this.#state[0] = seed >>> 0;
    for (let i = 1; i < this.#state.length; i++)
    {
      const previous = this.#state[i - 1];
      this.#state[i] = Math.imul(1812433253, previous ^ previous >>> 30) + i >>> 0;
    }
  }

  /**
   * Returns the next 32-bit unsigned value, regenerating the state block when
   * the previous 624 outputs are exhausted.
   */
  Next()
  {
    if (this.#index >= this.#state.length)
    {
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
  #twist()
  {
    for (let i = 0; i < this.#state.length; i++)
    {
      const next = (i + 1) % this.#state.length;
      const mix = this.#state[i] & 0x80000000 | this.#state[next] & 0x7fffffff;
      let value = this.#state[(i + 397) % this.#state.length] ^ mix >>> 1;
      if (mix & 1)
      {
        value ^= 0x9908b0df;
      }
      this.#state[i] = value >>> 0;
    }
    this.#index = 0;
  }
}
