import { be } from "#blue";
// Source: trinity/trinity/Curves/Tr2CurveRandomAxisRotation.h
// Source: trinity/trinity/Curves/Tr2CurveRandomAxisRotation.cpp
// Source: trinity/trinity/Curves/Tr2CurveRandomAxisRotation_Blue.cpp
import { random } from "#math/random";
import { fromYawPitchRoll, quat } from "#math/quat";
import { ITriQuaternionFunction, ITriFunction, IInitialize } from "#blue";
import { meta, type, blue } from "#schema";
import { CcpTime } from "#blue";


/**
 * Quaternion curve that spins at a fixed rate of one revolution per `period`
 * seconds about an axis fixed by two seed-derived random rotations applied
 * before and after the spin.
 */
@blue.define("Tr2CurveRandomAxisRotation")
@blue.inherit(IInitialize)
@blue.interface(ITriFunction, ITriQuaternionFunction)
export class Tr2CurveRandomAxisRotation extends ITriQuaternionFunction
{
  /** Authored narrow-string name. */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** Full rotation period in seconds; zero disables the middle spin. */
  @blue.readwrite
  @blue.persist
  @type.float32
  period = 1;

  /** Native PERSISTONLY seed storage; readers bypass the live setter. */
  @blue.attribute("seed")
  @blue.persistOnly
  @type.uint32
  _seed = 0;

  /** Live Blue seed property, separate from persisted backing storage. */
  @blue.readwrite
  @type.uint32
  @meta.implemented
  get seed()
  {
    return this.GetSeed();
  }

  /** @param {number} value New seed; every assignment rebuilds rotations. */
  @meta.implemented
  set seed(value)
  {
    this.SetSeed(value);
  }

  /** Cached quaternion; exposed read-only without persistence. */
  @blue.read
  @type.quat
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
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.adapted
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
  @blue.method
  @meta.adapted
  GetValueAt(time, out)
  {
    return this.Evaluate(out, time);
  }

  /**
   * Carbon's Update(Be::Time): the tick time wraps by the period in integer ticks before converting
   * (Tr2CurveRandomAxisRotation.cpp:31-37). JavaScript cannot overload on argument type, so the Be::Time overload has its own name.
   * @param {number} time Scene time in Blue 100ns ticks.
   * @param {Float32Array|number[]} out Caller-owned quaternion.
   * @returns {Float32Array|number[]} The same output buffer.
   */
  @meta.adapted
  Update__Ticks(time, out)
  {
    this.Evaluate(this.currentValue, this.GetWrappedTime(time));
    return quat.copy(out, this.currentValue);
  }

  /**
   * Carbon's GetValueAt(Be::Time): samples at the tick time wrapped by the period (cpp:47-52). JavaScript cannot overload on argument type, so the Be::Time overload has its own name.
   * @param {number} time Scene time in Blue 100ns ticks.
   * @param {Float32Array|number[]} out Caller-owned quaternion.
   * @returns {Float32Array|number[]} The same output buffer.
   */
  @meta.adapted
  GetValueAt__Ticks(time, out)
  {
    return this.Evaluate(out, this.GetWrappedTime(time));
  }

  /**
   * `TimeAsDouble(time % TimeFromDouble(abs(m_period)))`, the expression both Be::Time overloads share.
   * A zero period divides by zero in Carbon; here it yields NaN.
   * @param {number} time Scene time in Blue 100ns ticks.
   * @returns {number} Wrapped seconds.
   */
  GetWrappedTime(time)
  {
    return CcpTime.timeAsDouble(time % Math.trunc(Math.abs(this.period) * 10_000_000));
  }

  /**
   * Leaves the caller's derivative output unchanged, as Carbon does.
   *
   * @param {number} _time Unused source time in seconds.
   * @param {Float32Array|number[]} out Caller-owned quaternion.
   * @returns {Float32Array|number[]} The unchanged output buffer.
   */
  @blue.method
  @meta.noop
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
  @blue.method
  @meta.noop
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
  @blue.method
  @meta.adapted
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
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.adapted
  SetSeed(seed)
  {
    this._seed = seed >>> 0;
    this.SeedChanged();
  }

  /**
   * Rebuilds the pre/post rotations using the existing generator.
   * Adapted: nonzero seeds use the current MSVC-compatible engine helper;
   * seed zero uses the Blue actual-time clock, as Carbon does.
   * Angle samples retain native float intermediates.
   *
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  SeedChanged()
  {
    const engine = Tr2CurveRandomAxisRotation._makeMsvcDefaultRandomEngine(this.seed !== 0 ? this.seed : be.os.GetActualTime());
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
  static _buildCarbonRandomRotation(out, engine)
  {
    const roll = Tr2CurveRandomAxisRotation._randomAngle(engine);
    const pitch = Tr2CurveRandomAxisRotation._randomAngle(engine);
    const yaw = Tr2CurveRandomAxisRotation._randomAngle(engine);
    return fromYawPitchRoll(out, yaw, pitch, roll);
  }

  /**
   * Draws an angle with native float intermediates.
   * Adapted: represents the native anonymous RandAngle helper in JavaScript.
   *
   * @param {Function} engine Existing unit-interval generator.
   * @returns {number} Angle in radians.
   */
  @meta.adapted
  static _randomAngle(engine)
  {
    return Math.fround(Math.fround(engine() * Math.fround(Math.PI)) * 2);
  }

  /**
   * Builds the existing Mersenne Twister seed adapter.
   * Custom: replaces the selected C++ standard-library engine representation.
   *
   * @param {number} seed Unsigned 32-bit seed.
   * @returns {Function} Existing unit-interval generator.
   */
  static _makeMsvcDefaultRandomEngine(seed)
  {
    const engine = random.mt19937(seed >>> 0);
    return () => Math.fround(Math.fround(engine()) / Math.fround(0xffffffff));
  }
}

// Native exposure ends at this concrete table; no inherited query-chain fallback.
