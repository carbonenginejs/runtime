// Source: E:\carbonengine\trinity\trinity\Curves\Fader\Tr2ScalarFader.h
// Source: E:\carbonengine\trinity\trinity\Curves\Fader\Tr2ScalarFader.cpp
import { num } from "@carbonenginejs/runtime-utils/num";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";


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
export class Tr2ScalarFader extends CjsModel
{
  @io.readwrite
  @type.float32
  value = 0;

  @io.readwrite
  @type.float32
  fading = 0;

  @io.read
  @type.float32
  fadeTime = -1;

  kickInLength = 3;

  /**
   * Advances fade state by the update context delta time.
   */
  @carbon.method
  @impl.adapted
  Update(updateContext)
  {
    const deltaT = Tr2ScalarFader.#getDeltaT(updateContext);
    if (this.fading !== 0)
    {
      this.value += this.fading * deltaT;
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
      this.fadeTime += deltaT;
      if (this.fadeTime > this.kickInLength)
      {
        this.fadeTime = -1;
      }
    }
  }

  /**
   * Starts a fade-in or fade-out over the supplied duration.
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
   * Checks whether the fader is fully inactive and contributes no value.
   */
  @carbon.method
  @impl.implemented
  IsZero()
  {
    return this.value === 0 && this.fading === 0;
  }

  /**
   * Gets the current linear fade value.
   */
  @carbon.method
  @impl.implemented
  GetFaderValue()
  {
    return this.value;
  }

  /**
   * Checks whether the non-linear kick-in envelope has not started.
   */
  @carbon.method
  @impl.implemented
  IsKickInZero()
  {
    return this.fadeTime <= 0;
  }

  /**
   * Gets Carbon's non-linear kick-in envelope value.
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

  /**
   * Reads the frame delta in seconds from an update context, accepting either a
   * GetDeltaT method or a plain deltaT property and defaulting to 0.
   */
  static #getDeltaT(updateContext)
  {
    if (typeof updateContext.GetDeltaT === "function")
    {
      return updateContext.GetDeltaT();
    }
    return updateContext.deltaT ?? 0;
  }
}
