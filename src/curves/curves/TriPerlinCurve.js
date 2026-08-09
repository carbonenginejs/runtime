// Source: E:\carbonengine\trinity\trinity\TriSequencer.h
// Source: E:\carbonengine\trinity\trinity\TriSequencer.cpp
// Source: E:\carbonengine\trinity\trinity\TriMath.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { carbonPerlin1D } from "@carbonenginejs/runtime-utils/noise";


/**
 * Scalar curve driven by fractal Perlin noise, mapping the noise band to
 * [offset, offset + scale] and advancing at `speed` from a per-instance random
 * phase.
 */
@type.define({
  className: "TriPerlinCurve",
  family: "trinityCore"
})
export class TriPerlinCurve extends CjsModel
{
  /** Mirrors Carbon's process setting used for deterministic expression previews. */
  static expressionCurveFakeRandom = false;

  static #triRandState = 1234;

  @io.persist
  @type.float32
  alpha = 1.1;

  @io.persist
  @type.float32
  beta = 2;

  @io.persist
  @type.int32
  N = 3;

  @io.persist
  @type.float32
  value = 0;

  @io.persist
  @type.float32
  scale = 1;

  @io.persist
  @type.float32
  offset = 0;

  @io.persist
  @type.float32
  speed = 1;

  @io.persist
  @type.string
  name = "";

  #lastUpdated = -1;
  #startOffset = TriPerlinCurve.#nextStartOffset();

  /** Updates the cached value for the supplied time. */
  @carbon.method
  @impl.implemented
  UpdateValue(time)
  {
    this.Update(time);
  }

  /**
   * Updates and returns the cached value, skipping the noise evaluation when the
   * time is unchanged since the last call.
   */
  @carbon.method
  @impl.implemented
  Update(time)
  {
    if (this.#lastUpdated !== time)
    {
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
  @carbon.method
  @impl.implemented
  GetValueAt(time)
  {
    let position = Number(time);
    if (TriPerlinCurve.expressionCurveFakeRandom)
    {
      position = position * this.speed + 0.21;
    }
    else
    {
      position = (position + this.#startOffset) * this.speed;
    }

    const noise = TriPerlinCurve.PerlinNoise1D(position, this.alpha, this.beta, this.N);
    return ((noise + 1) / 2) * this.scale + this.offset;
  }

  /** Carbon's implementation changes output amplitude despite the historical name. */
  @carbon.method
  @impl.implemented
  ScaleTime(scale)
  {
    this.scale = scale;
  }

  /**
   * Evaluates Carbon's 1D fractal Perlin noise, returning a value in roughly
   * [-1, 1].
   */
  static PerlinNoise1D(position, inverseAmplitude, frequency, octaves)
  {
    return carbonPerlin1D(position, inverseAmplitude, frequency, octaves);
  }

  /**
   * Draws the next per-instance noise phase from Carbon's shared
   * linear-congruential TriRand state, reproducing its 32-bit integer truncation
   * so offsets match the C++ sequence.
   */
  static #nextStartOffset()
  {
    let state = TriPerlinCurve.#triRandState;
    state = ((state << 12) + 150889) >>> 0;
    state %= 714025;
    TriPerlinCurve.#triRandState = state;

    // Carbon casts 10,000,000,000 to its 32-bit `int` parameter on Windows.
    const carbonIntLimit = 10000000000 >>> 0;
    return Math.floor((Math.imul(carbonIntLimit, state) >>> 0) / 714025);
  }
}
