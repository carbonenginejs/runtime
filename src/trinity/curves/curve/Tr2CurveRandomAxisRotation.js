// Source: trinity/trinity/Curves/Tr2CurveRandomAxisRotation.h
// Source: trinity/trinity/Curves/Tr2CurveRandomAxisRotation.cpp
import { random } from "#math/random";
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
    const engine = this.seed !== 0 ? Tr2CurveRandomAxisRotation.#makeMsvcDefaultRandomEngine(this.seed) : Math.random;
    Tr2CurveRandomAxisRotation.#buildCarbonRandomRotation(this.preRotation, engine);
    Tr2CurveRandomAxisRotation.#buildCarbonRandomRotation(this.postRotation, engine);
  }

  /**
   * Draws roll, pitch and yaw from the supplied generator in that order -
   * matching Carbon's draw order, which fixes the resulting rotation for a given
   * seed - and writes the quaternion into `out`.
   */
  static #buildCarbonRandomRotation(out, engine)
  {
    const roll = Tr2CurveRandomAxisRotation.#randomAngle(engine);
    const pitch = Tr2CurveRandomAxisRotation.#randomAngle(engine);
    const yaw = Tr2CurveRandomAxisRotation.#randomAngle(engine);
    return fromYawPitchRoll(out, yaw, pitch, roll);
  }

  /** Draws one angle uniformly in [0, 2pi) radians from the supplied generator. */
  static #randomAngle(engine)
  {
    return engine() * Math.PI * 2;
  }

  /**
   * Builds a [0, 1] generator over a Mersenne Twister seeded like MSVC's
   * default_random_engine, so a persisted seed reproduces Carbon's rotations.
   */
  static #makeMsvcDefaultRandomEngine(seed)
  {
    const engine = random.mt19937(seed >>> 0);
    return () => engine() / 0xffffffff;
  }
}
