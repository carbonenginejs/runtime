// Source: trinity/trinity/TriSequencer.h
// Source: trinity/trinity/TriSequencer.cpp
// Source: trinity/trinity/TriMath.cpp
import { meta } from "#schema";
import { ITriScalarFunction } from "#blue/ITriScalarFunction";
import { ITriFunction } from "#blue/ITriFunction";
import { carbonPerlin1D } from "#math/noise";


/**
 * Scalar curve driven by fractal Perlin noise, mapping the noise band to
 * [offset, offset + scale] and advancing at `speed` from a per-instance random
 * phase.
 */
@meta.define({
  className: "TriPerlinCurve",
  family: "trinityCore"
})
export class TriPerlinCurve extends ITriScalarFunction
{
  /**
   * Carbon g_expressionCurveFakeRandom (Tr2CurveScalarExpression.cpp:11, the
   * "expressionCurveFakeRandom" setting, default false): a deterministic
   * random for expression previews. It is held here, on its only reader.
   */
  @meta.setting("expressionCurveFakeRandom")
  static expressionCurveFakeRandom = false;

  static _triRandState = 1234;

  /** Native mName (std::wstring). */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.wstring
  name = "";

  /** Native mValue: the externally writable cached result. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  value = 0;

  /** Native mOffset. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  offset = 0;

  /** Native mScale. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  scale = 1;

  /** Native mAlpha. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  alpha = 1.1;

  /** Native mSpeed. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  speed = 1;

  /** Native mBeta. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  beta = 2;

  /** Native mN exposed as N; n retains the existing JavaScript storage spelling. */
  @meta.member("N")
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  n = 3;

  /** Native mLastUpdated cache sentinel; Update(-1) initially retains mValue. */
  _lastUpdated = -1;
  _startOffset = TriPerlinCurve._nextStartOffset();

  /** Updates the cached value for the supplied time. */
  @meta.blue.method
  @meta.implemented
  UpdateValue(time)
  {
    this.Update(time);
  }

  /**
   * Updates and returns the cached value, skipping the noise evaluation when the
   * time is unchanged since the last call. Uses the native double-seconds overload;
   * callers of the native Be::Time overload must convert their ticks separately.
   */
  @meta.blue.method
  @meta.implemented
  Update(time)
  {
    if (this._lastUpdated !== time)
    {
      this._lastUpdated = time;
      this.value = this.GetValueAt(time);
    }
    return this.value;
  }

  /**
   * Samples the noise at a time and maps it to [offset, offset + scale]; the
   * per-instance random phase is replaced by a fixed offset when
   * expressionCurveFakeRandom is set, so editor previews are deterministic.
   * Adapted: JavaScript Number seconds follows the native double overload; the
   * separate Be::Time overload with a first-call origin is not exposed. Existing
   * noise arithmetic retains JS precision rather than native float rounding.
   */
  @meta.blue.method
  @meta.adapted
  GetValueAt(time)
  {
    let position = Number(time);
    if (TriPerlinCurve.expressionCurveFakeRandom)
    {
      position = position * this.speed + 0.21;
    }
    else
    {
      position = (position + this._startOffset) * this.speed;
    }

    const noise = TriPerlinCurve.PerlinNoise1D(position, this.alpha, this.beta, this.n);
    return ((noise + 1) / 2) * this.scale + this.offset;
  }

  /** Carbon's implementation changes output amplitude despite the historical name. */
  @meta.blue.method
  @meta.implemented
  ScaleTime(scale)
  {
    this.scale = scale;
  }

  /**
   * Evaluates Carbon's 1D fractal Perlin noise, returning a value in roughly
   * [-1, 1]. Custom compatibility wrapper retains the existing static API;
   * native PerlinNoise1D is a free function in TriMath.cpp.
   */
  @meta.ours
  static PerlinNoise1D(position, inverseAmplitude, frequency, octaves)
  {
    return carbonPerlin1D(position, inverseAmplitude, frequency, octaves);
  }

  /**
   * Draws the next per-instance noise phase from Carbon's shared
   * linear-congruential TriRand state, reproducing its 32-bit integer truncation
   * so offsets match that sequence. Adapted: state remains local to this JS
   * class, so interleaving with other native TriRand callers is not reproduced.
   */
  @meta.adapted
  static _nextStartOffset()
  {
    let state = TriPerlinCurve._triRandState;
    state = ((state << 12) + 150889) >>> 0;
    state %= 714025;
    TriPerlinCurve._triRandState = state;

    // Carbon casts 10,000,000,000 to its 32-bit `int` parameter on Windows.
    const carbonIntLimit = 10000000000 >>> 0;
    return Math.floor((Math.imul(carbonIntLimit, state) >>> 0) / 714025);
  }
}

// Source: TriSequencer_Blue.cpp:110-112,178. No ancestor exposure chain.
meta.blue.interfaceTable({
  interfaces: [TriPerlinCurve, ITriFunction, ITriScalarFunction],
  chainTo: null
})(TriPerlinCurve);