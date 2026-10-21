import { CjsSchema } from "#schema";
import { exposure as be } from "#be";
import { random as carbonRandom } from "#math/random";
// Source: trinity/trinity/TriSequencer.h
// Source: trinity/trinity/TriSequencer.cpp
// Source: trinity/trinity/TriMath.cpp
import { meta, type, blue } from "#schema";
import { ITriScalarFunction } from "#blue/ITriScalarFunction";
import { ITriFunction } from "#blue/ITriFunction";
import { CcpTime } from "#blue/CcpTime";
import { carbonPerlin1D } from "#math/noise";


/**
 * Scalar curve driven by fractal Perlin noise, mapping the noise band to
 * [offset, offset + scale] and advancing at `speed` from a per-instance random
 * phase.
 */
@be.define("TriPerlinCurve")
export class TriPerlinCurve extends ITriScalarFunction
{
  /**
   * Carbon g_expressionCurveFakeRandom (Tr2CurveScalarExpression.cpp:11, the
   * "expressionCurveFakeRandom" setting, default false): a deterministic
   * random for expression previews. It is held here, on its only reader.
   */
  @meta.setting("expressionCurveFakeRandom")
  static expressionCurveFakeRandom = false;

  /** Reads the shared Carbon TriRand state through the compatibility API. */
  static get _triRandState()
  {
    return carbonRandom.triRandGetSeed();
  }

  /** Seeds the shared Carbon TriRand stream through the compatibility API. */
  static set _triRandState(seed)
  {
    carbonRandom.triSrand(seed);
  }

  /** Native mName (std::wstring). */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.wstring
  name = "";

  /** Native mValue: the externally writable cached result. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  value = 0;

  /** Native mOffset. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  offset = 0;

  /** Native mScale. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  scale = 1;

  /** Native mAlpha. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  alpha = 1.1;

  /** Native mSpeed. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  speed = 1;

  /** Native mBeta. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  beta = 2;

  /** Native mN exposed as N; n retains the existing JavaScript storage spelling. */
  @be.mapAttribute(be.READWRITE | be.PERSIST, "N")


  @type.int32
  n = 3;

  /** Native mLastUpdated cache sentinel; Update(-1) initially retains mValue. */
  _lastUpdated = -1;

  /** mStart - seconds of the first Be::Time sample; zero is unset (TriSequencer.cpp:472-473). */
  _start = 0;
  _startOffset = TriPerlinCurve._nextStartOffset();

  /** Updates the cached value for the supplied time. */

  @meta.implemented
  UpdateValue(time)
  {
    this.Update(time);
  }

  /**
   * Updates and returns the cached value, skipping the noise evaluation when the
   * time is unchanged since the last call. This is the native double-seconds overload; Update__Ticks is the Be::Time one.
   */

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
   * Adapted: JavaScript Number seconds follows the native double overload; GetValueAt__Ticks is the Be::Time overload
   * with its first-call origin. Existing
   * noise arithmetic retains JS precision rather than native float rounding.
   */
  @blue.method
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

  /**
   * Carbon's Update(Be::Time) (TriSequencer.cpp:440-452): caches on the tick time in seconds and samples the Be::Time
   * overload. JavaScript cannot overload on argument type, so the Be::Time overload has its own name.
   * @param {number} time Scene time in Blue 100ns ticks.
   * @returns {number} The cached value.
   */
  @meta.adapted
  Update__Ticks(time)
  {
    const seconds = CcpTime.timeAsDouble(time);
    if (this._lastUpdated !== seconds)
    {
      this._lastUpdated = seconds;
      this.value = this.GetValueAt__Ticks(time);
    }
    return this.value;
  }

  /**
   * Carbon's GetValueAt(Be::Time) (cpp:468-486): latches the first sample as the origin, then samples the noise at the
   * elapsed seconds, which the double overload takes as given. JavaScript cannot overload on argument type, so the Be::Time overload has its own name.
   * @param {number} time Scene time in Blue 100ns ticks.
   * @returns {number} The sampled value.
   */
  @meta.adapted
  GetValueAt__Ticks(time)
  {
    if (this._start === 0) this._start = CcpTime.timeAsDouble(time);
    return this.GetValueAt(CcpTime.timeAsDouble(time) - this._start);
  }

  /** Carbon's implementation changes output amplitude despite the historical name.
   * Carbon declaration: TriPerlinCurve::ScaleTime (trinity/trinity/TriSequencer.h:212).
   */
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
  static PerlinNoise1D(position, inverseAmplitude, frequency, octaves)
  {
    return carbonPerlin1D(position, inverseAmplitude, frequency, octaves);
  }

  /**
   * Draws the next per-instance noise phase from Carbon's shared
   * linear-congruential TriRand state, reproducing its 32-bit integer truncation
   * so offsets match that sequence. The state is shared with other TriRand callers, as in Carbon.
   */
  @meta.cjs
    @meta.adapted
  static _nextStartOffset()
  {
    return carbonRandom.triRandInt(10000000000 | 0);
  }
}

// Source: TriSequencer_Blue.cpp:110-112,178. No ancestor exposure chain.
CjsSchema.exposure.mapInterface(ITriFunction)(TriPerlinCurve);
CjsSchema.exposure.mapInterface(ITriScalarFunction)(TriPerlinCurve);
