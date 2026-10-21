// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpaceObjectAttachmentUtils.cpp
// Source: trinity/trinity/Eve/SpaceObject/Attachments/Sets/EveSpaceObjectAttachmentUtils.h
//
// The packed-set blink/fade intensity helpers. Each reads the renderer's
// animation clock itself, Tr2Renderer::GetAnimationTime(), as Carbon does.
import { meta } from "#schema";
import { blue } from "#blue";
import { Tr2Renderer } from "../../core/Tr2Renderer.js";

/** Static attachment helpers matching Carbon's namespace. */
@meta.define({ className: "EveSpaceObjectAttachmentUtils", donors: ["EveSpaceObjectAttachmentUtils"] })
export class EveSpaceObjectAttachmentUtils
{
  /** Carbon FadeType (EveSpaceObjectAttachmentUtils.h:7-14). */
  static FadeType = {
    FT_NONE: 0,
    FT_BLINK: 1,
    FT_FADEIN: 2,
    FT_FADEOUT: 3,
    FT_FADEINOUT: 4
  };

  /** Carbon EveSpaceObjectAttachmentUtils::Blink (cpp:9-40): zero rate returns
   * minScale; f = frac(time * rate + phase); peak = 0.05 * rate - QUIRK: a peak
   * under 0.0001 becomes 1 (tiny rates degenerate to one full-cycle ramp); ramp
   * 0->1 over [0, peak), 1->0 over [peak, 4*peak), 0 after; lerped into
   * [minScale, maxScale]. Phase is added AFTER the rate multiply (contrast
   * FadeIn). */
  static blink(blinkRate, blinkPhase, minScale, maxScale)
  {
    if (blinkRate === 0)
    {
      return minScale;
    }
    const FLASH_PEAK_TIME = 0.05;
    const value = Tr2Renderer.GetAnimationTime() * blinkRate + blinkPhase;
    const f = value - Math.floor(value);

    let peak = FLASH_PEAK_TIME * blinkRate;
    let result = 0;
    const end = peak * 4;

    if (peak < 0.0001)
    {
      peak = 1;
    }
    if (f < peak)
    {
      result = f / peak;
    }
    else if (f < end)
    {
      result = 1 - (f - peak) / (end - peak);
    }
    return (maxScale - minScale) * result + minScale;
  }

  /** Carbon FadeIn (cpp:42-46): frac((time + phase) * rate) - the phase is
   * added BEFORE the rate multiply, unlike Blink. */
  static fadeIn(blinkRate, blinkPhase)
  {
    const value = (Tr2Renderer.GetAnimationTime() + blinkPhase) * blinkRate;
    return value - Math.floor(value);
  }

  /** Carbon FadeOut (cpp:48-51). */
  static fadeOut(blinkRate, blinkPhase)
  {
    return 1 - EveSpaceObjectAttachmentUtils.fadeIn(blinkRate, blinkPhase);
  }

  /** Carbon FadeInOut (cpp:53-57): (sin(fmod(time*rate*2pi, 2pi) + phase*2pi) + 1) / 2. */
  static fadeInOut(blinkRate, blinkPhase)
  {
    const twoPi = 2 * Math.PI;
    const timeModPi = (Tr2Renderer.GetAnimationTime() * blinkRate * twoPi) % twoPi;
    return (Math.sin(timeModPi + blinkPhase * twoPi) + 1) / 2;
  }

  /** Carbon Fade (cpp:59-75): FT_NONE (and anything unknown) is full intensity. */
  static fade(type, blinkRate, blinkPhase)
  {
    switch (type)
    {
      case EveSpaceObjectAttachmentUtils.FadeType.FT_BLINK:
        return EveSpaceObjectAttachmentUtils.blink(blinkRate, blinkPhase, 0, 1);
      case EveSpaceObjectAttachmentUtils.FadeType.FT_FADEIN:
        return EveSpaceObjectAttachmentUtils.fadeIn(blinkRate, blinkPhase);
      case EveSpaceObjectAttachmentUtils.FadeType.FT_FADEOUT:
        return EveSpaceObjectAttachmentUtils.fadeOut(blinkRate, blinkPhase);
      case EveSpaceObjectAttachmentUtils.FadeType.FT_FADEINOUT:
        return EveSpaceObjectAttachmentUtils.fadeInOut(blinkRate, blinkPhase);
      default:
        return 1;
    }
  }

  /** Carbon Saturate (math Color_inline.h:161-172): saturation 1 passes
   * through; intensity = perceptual luma (0.299/0.587/0.114); lerp from the
   * gray (i,i,i,alpha) toward the color by max(0, saturation) - values above 1
   * EXTRAPOLATE (only the low side clamps); alpha rides the lerp with the
   * original alpha on both endpoints (i.e. unchanged). Writes into out
   * (length-4) and returns it. */
  static saturate(out, color, saturation)
  {
    if (saturation === 1)
    {
      out[0] = color[0];
      out[1] = color[1];
      out[2] = color[2];
      out[3] = color[3];
      return out;
    }
    const intensity = color[0] * 0.299 + color[1] * 0.587 + color[2] * 0.114;
    const s = Math.max(0, saturation);
    out[0] = intensity + (color[0] - intensity) * s;
    out[1] = intensity + (color[1] - intensity) * s;
    out[2] = intensity + (color[2] - intensity) * s;
    out[3] = color[3];
    return out;
  }
}

/** Compatibility export of the namespace-owned enum. */
export const FadeType = EveSpaceObjectAttachmentUtils.FadeType;

// Carbon neither registers this nor gives it a chooser.
blue.enums.Create("trinity.FadeType", FadeType);
