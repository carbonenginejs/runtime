// Source: trinity/trinity/Curves/Tr2CurveRandomAxisRotation.h
// Source: trinity/trinity/Curves/Tr2CurveRandomAxisRotation.cpp
// Source: trinity/trinity/Curves/Tr2CurveRandomAxisRotation_Blue.cpp
import { random } from "#math/random";
import { fromYawPitchRoll, quat } from "#math/quat";
import { ITriQuaternionFunction, ITriFunction, IInitialize } from "#blue";
import { meta, types } from "#schema";


/**
 * Quaternion curve that spins at a fixed rate of one revolution per `period`
 * seconds about an axis fixed by two seed-derived random rotations applied
 * before and after the spin.
 */
@meta.define({
  className: "Tr2CurveRandomAxisRotation",
  family: "curves"
})
@meta.carbon.inherit(IInitialize)
export class Tr2CurveRandomAxisRotation extends ITriQuaternionFunction
{
  /** Authored narrow-string name. */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  name = "";

  /** Full rotation period in seconds; zero disables the middle spin. */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  period = 1;

  /** Native PERSISTONLY seed storage; readers bypass the live setter. */
  @meta.member("seed")
  @meta.edit.persistOnly
  @types.uint32
  _seed = 0;

  /** Live Blue seed property, separate from persisted backing storage. */
  @meta.property()
  @meta.edit.readwrite
  @types.uint32
  @meta.impl.implemented
  get seed()
  {
    return this.GetSeed();
  }

  /** @param {number} value New seed; every assignment rebuilds rotations. */
  @meta.impl.implemented
  set seed(value)
  {
    this.SetSeed(value);
  }

  /** Cached quaternion; exposed read-only without persistence. */
  @meta.edit.read
  @types.quat
  currentValue = quat.create();

  /**
   * Source runtime state; not exposed by Carbon's Blue schema.
   */
  preRotation = quat.create();

  /**
   * Source runtime state; not exposed by Carbon's Blue schema.
   */
  postRotation = quat.create();

  /** Private scratch output for the middle pitch rotation. */
  _rotation = quat.create();

  /**
   * Seeds rotations and computes the initial cached value, as the native constructor does.
   * Adapted: existing JS random generation remains in SeedChanged.
   */
  constructor()
  {
    super();
    this.SeedChanged();
    this.GetValue(0, this.currentValue);
  }

  /**
   * Advances the cached quaternion using the existing seconds-based curve contract.
   *
   * @param {number} time Source time in seconds.
   * @returns {void}
   */
  @meta.carbon.method
  @meta.impl.implemented
  UpdateValue(time)
  {
    this.GetValueAt(time, this.currentValue);
  }

  /**
   * Updates the cached value and copies it into caller-owned storage.
   * Adapted: JavaScript retains time-first seconds and an output buffer instead
   * of Carbon's output-first Be::Time/double overloads.
   *
   * @param {number} time Source time in seconds.
   * @param {Float32Array|number[]} out Caller-owned quaternion.
   * @returns {Float32Array|number[]} The same output buffer.
   */
  @meta.carbon.method
  @meta.impl.adapted
  Update(time, out)
  {
    this.UpdateValue(time);
    return quat.copy(out, this.currentValue);
  }

  /**
   * Samples into caller-owned storage without changing the cached value.
   * Adapted: JavaScript retains time-first seconds and an output buffer instead
   * of Carbon's output-first Be::Time/double overloads.
   *
   * @param {number} time Source time in seconds.
   * @param {Float32Array|number[]} out Caller-owned quaternion.
   * @returns {Float32Array|number[]} The same output buffer.
   */
  @meta.carbon.method
  @meta.impl.adapted
  GetValueAt(time, out)
  {
    return this.Evaluate(out, time);
  }

  /**
   * Leaves the caller's derivative output unchanged, as Carbon does.
   *
   * @param {number} _time Unused source time in seconds.
   * @param {Float32Array|number[]} out Caller-owned quaternion.
   * @returns {Float32Array|number[]} The unchanged output buffer.
   */
  @meta.carbon.method
  @meta.impl.noop
  GetValueDotAt(_time, out)
  {
    return out;
  }

  /**
   * Leaves the caller's second-derivative output unchanged, as Carbon does.
   *
   * @param {number} _time Unused source time in seconds.
   * @param {Float32Array|number[]} out Caller-owned quaternion.
   * @returns {Float32Array|number[]} The unchanged output buffer.
   */
  @meta.carbon.method
  @meta.impl.noop
  GetValueDoubleDotAt(_time, out)
  {
    return out;
  }

  /**
   * Samples the quaternion at the supplied time.
   * Adapted: writes caller-owned storage instead of returning a native value copy.
   *
   * @param {number} time Source time in seconds.
   * @param {Float32Array|number[]} out Caller-owned quaternion.
   * @returns {Float32Array|number[]} The same output buffer.
   */
  @meta.carbon.method
  @meta.impl.adapted
  GetValue(time, out)
  {
    return this.GetValueAt(time, out);
  }

  /**
   * Evaluates the existing rotation composition.
   * Custom: extracted output-buffer helper for native GetValue. Carbon's
   * row-vector post * pitch * pre composes as gl pre * pitch * post. The
   * existing JS angle arithmetic is retained; this pass does not claim native
   * float-intermediate parity.
   *
   * @param {Float32Array|number[]} out Caller-owned quaternion.
   * @param {number} time Source time in seconds.
   * @returns {Float32Array|number[]} The same output buffer.
   */
  @meta.impl.custom
  Evaluate(out, time)
  {
    quat.copy(out, this.postRotation);
    if (this.period !== 0)
    {
      const angle = time / Math.abs(this.period) * Math.PI * 2;
      fromYawPitchRoll(this._rotation, 0, angle, 0);
      quat.multiply(out, this._rotation, out);
    }
    return quat.multiply(out, this.preRotation, out);
  }

  /**
   * Rebuilds rotations only for a nonzero persisted seed.
   * The native Blue table omits IInitialize despite the C++ base; readers and
   * Copier therefore do not discover this method through that query.
   *
   * @returns {boolean} True.
   */
  @meta.carbon.method
  @meta.impl.implemented
  Initialize()
  {
    if (this.seed !== 0)
    {
      this.SeedChanged();
    }
    return true;
  }

  /**
   * Gets the stored seed.
   *
   * @returns {number} Unsigned 32-bit seed.
   */
  @meta.carbon.method
  @meta.impl.implemented
  GetSeed()
  {
    return this._seed;
  }

  /**
   * Stores the seed and rebuilds rotations on every call, including equal seeds.
   * Adapted: >>> 0 supplies the native uint32_t argument conversion. No model
   * event, values settle loop or changed-value return is part of this setter.
   *
   * @param {number} seed Unsigned 32-bit seed.
   * @returns {void}
   */
  @meta.carbon.method
  @meta.impl.adapted
  SetSeed(seed)
  {
    this._seed = seed >>> 0;
    this.SeedChanged();
  }

  /**
   * Rebuilds the pre/post rotations using the existing generator.
   * Adapted: nonzero seeds use the current MSVC-compatible engine helper;
   * seed zero retains Math.random instead of Carbon's clock-seeded engine.
   * RNG and float-intermediate parity are outside this class-removal change.
   *
   * @returns {void}
   */
  @meta.carbon.method
  @meta.impl.adapted
  SeedChanged()
  {
    const engine = this.seed !== 0 ? Tr2CurveRandomAxisRotation._makeMsvcDefaultRandomEngine(this.seed) : Math.random;
    Tr2CurveRandomAxisRotation._buildCarbonRandomRotation(this.preRotation, engine);
    Tr2CurveRandomAxisRotation._buildCarbonRandomRotation(this.postRotation, engine);
  }

  /**
   * Writes one random rotation using the existing roll/pitch/yaw draw order.
   * Custom: extracted JS output-buffer helper for native SeedChanged.
   *
   * @param {Float32Array|number[]} out Caller-owned quaternion.
   * @param {Function} engine Existing unit-interval generator.
   * @returns {Float32Array|number[]} The same output buffer.
   */
  @meta.impl.custom
  static _buildCarbonRandomRotation(out, engine)
  {
    const roll = Tr2CurveRandomAxisRotation._randomAngle(engine);
    const pitch = Tr2CurveRandomAxisRotation._randomAngle(engine);
    const yaw = Tr2CurveRandomAxisRotation._randomAngle(engine);
    return fromYawPitchRoll(out, yaw, pitch, roll);
  }

  /**
   * Draws an angle with the existing JS arithmetic.
   * Adapted: represents the native anonymous RandAngle helper without changing
   * the existing double arithmetic to native float intermediates.
   *
   * @param {Function} engine Existing unit-interval generator.
   * @returns {number} Angle in radians.
   */
  @meta.impl.adapted
  static _randomAngle(engine)
  {
    return engine() * Math.PI * 2;
  }

  /**
   * Builds the existing Mersenne Twister seed adapter.
   * Custom: replaces the selected C++ standard-library engine representation.
   *
   * @param {number} seed Unsigned 32-bit seed.
   * @returns {Function} Existing unit-interval generator.
   */
  @meta.impl.custom
  static _makeMsvcDefaultRandomEngine(seed)
  {
    const engine = random.mt19937(seed >>> 0);
    return () => engine() / 0xffffffff;
  }
}

// Native exposure ends at this concrete table; no inherited query-chain fallback.
meta.carbon.interfaceTable({
  interfaces: [ Tr2CurveRandomAxisRotation, ITriFunction, ITriQuaternionFunction ],
  chainTo: null
})(Tr2CurveRandomAxisRotation);
