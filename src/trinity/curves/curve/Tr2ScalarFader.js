// Source: trinity/trinity/Curves/Fader/Tr2ScalarFader.h
// Source: trinity/trinity/Curves/Fader/Tr2ScalarFader.cpp
import { num } from "#math/num";
import { carbon, impl, edit, type } from "#schema";


const TRI_PI = Math.PI;

/**
 * Scalar fade envelope that ramps linearly between 0 and 1 over an authored fade
 * length, and also exposes a separate non-linear kick-in pulse that runs once
 * per fade-in.
 */
@type.define({
  className: "Tr2ScalarFader",
  family: "curves"
})
export class Tr2ScalarFader
{
  @edit.readwrite
  @type.float32
  value = 0;

  @edit.readwrite
  @type.float32
  fading = 0;

  @edit.read
  @type.float32
  fadeTime = -1;

  kickInLength = 3;

  /**
   * Advances the native fade branches using the required EveUpdateContext clock.
   * @param {EveUpdateContext} updateContext Update context supplying GetDeltaT().
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  Update(updateContext)
  {
    if (this.fading !== 0)
    {
      this.value += this.fading * updateContext.GetDeltaT();
      if (this.value < 0)
      {
        this.value = 0;
        this.fading = 0;
      }
      else if (this.value > 1)
      {
        this.value = 1;
        this.fading = 0;
      }
    }
    if (this.fadeTime >= 0)
    {
      this.fadeTime += updateContext.GetDeltaT();
      if (this.fadeTime > this.kickInLength)
      {
        this.fadeTime = -1;
      }
    }
  }

  /**
   * Starts a fade-in or fade-out over the supplied duration.
   * @param {boolean} isFadeIn Whether to fade toward one.
   * @param {number} fadeLength Fade duration in seconds.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  StartFade(isFadeIn, fadeLength)
  {
    this.kickInLength = fadeLength;
    this.fading = isFadeIn ? 1 / this.kickInLength : -1 / this.kickInLength;
    if (isFadeIn)
    {
      this.fadeTime = 0;
    }
  }

  /**
   * Checks whether the fader is inactive and contributes no value.
   * @returns {boolean}
   */
  @carbon.method
  @impl.implemented
  IsZero()
  {
    return this.value === 0 && this.fading === 0;
  }

  /**
   * Gets the current linear fade value.
   * @returns {number}
   */
  @carbon.method
  @impl.implemented
  GetFaderValue()
  {
    return this.value;
  }

  /**
   * Checks whether the kick-in envelope is inactive or at its start.
   * @returns {boolean}
   */
  @carbon.method
  @impl.implemented
  IsKickInZero()
  {
    return this.fadeTime <= 0;
  }

  /**
   * Gets Carbon's non-linear kick-in envelope value.
   * @returns {number}
   */
  @carbon.method
  @impl.implemented
  GetKickInValue()
  {
    if (this.fadeTime < 0)
    {
      return 0;
    }
    const x = num.clamp(this.fadeTime / this.kickInLength, 0, 1);
    return Math.pow(Math.sin(TRI_PI * Math.pow(x, 0.66)), 3);
  }

}

// Exact native exposure table; no inherited or implicit entries.
carbon.interfaceTable({
  interfaces: [Tr2ScalarFader],
  chainTo: null
})(Tr2ScalarFader);
