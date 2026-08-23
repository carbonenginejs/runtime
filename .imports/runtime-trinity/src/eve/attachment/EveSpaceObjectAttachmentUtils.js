// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EveSpaceObjectAttachmentUtils.cpp
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\Sets\EveSpaceObjectAttachmentUtils.h
//
// The packed-set blink/fade intensity helpers. Carbon reads the global
// Tr2Renderer::GetAnimationTime() inside each helper; the JS port takes the
// animation time as the FIRST argument instead (the light manager duck is the
// engine-owned clock source at the GetLights call sites) - the only
// adaptation; every formula is verbatim.

/** Carbon FadeType (EveSpaceObjectAttachmentUtils.h:7-14). */
export const FadeType = Object.freeze({
  FT_NONE: 0,
  FT_BLINK: 1,
  FT_FADEIN: 2,
  FT_FADEOUT: 3,
  FT_FADEINOUT: 4
});

/** Carbon EveSpaceObjectAttachmentUtils::Blink (cpp:9-40): zero rate returns
 * minScale; f = frac(time * rate + phase); peak = 0.05 * rate - QUIRK: a peak
 * under 0.0001 becomes 1 (tiny rates degenerate to one full-cycle ramp); ramp
 * 0->1 over [0, peak), 1->0 over [peak, 4*peak), 0 after; lerped into
 * [minScale, maxScale]. Phase is added AFTER the rate multiply (contrast
 * FadeIn). */
export function Blink(animationTime, blinkRate, blinkPhase, minScale, maxScale)
{
  if (blinkRate === 0)
  {
    return minScale;
  }
  const FLASH_PEAK_TIME = 0.05;
  const value = animationTime * blinkRate + blinkPhase;
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
export function FadeIn(animationTime, blinkRate, blinkPhase)
{
  const value = (animationTime + blinkPhase) * blinkRate;
  return value - Math.floor(value);
}

/** Carbon FadeOut (cpp:48-51). */
export function FadeOut(animationTime, blinkRate, blinkPhase)
{
  return 1 - FadeIn(animationTime, blinkRate, blinkPhase);
}

/** Carbon FadeInOut (cpp:53-57): (sin(fmod(time*rate*2pi, 2pi) + phase*2pi) + 1) / 2. */
export function FadeInOut(animationTime, blinkRate, blinkPhase)
{
  const twoPi = 2 * Math.PI;
  const timeModPi = (animationTime * blinkRate * twoPi) % twoPi;
  return (Math.sin(timeModPi + blinkPhase * twoPi) + 1) / 2;
}

/** Carbon Fade (cpp:59-75): FT_NONE (and anything unknown) is full intensity. */
export function Fade(animationTime, type, blinkRate, blinkPhase)
{
  switch (type)
  {
    case FadeType.FT_BLINK:
      return Blink(animationTime, blinkRate, blinkPhase, 0, 1);
    case FadeType.FT_FADEIN:
      return FadeIn(animationTime, blinkRate, blinkPhase);
    case FadeType.FT_FADEOUT:
      return FadeOut(animationTime, blinkRate, blinkPhase);
    case FadeType.FT_FADEINOUT:
      return FadeInOut(animationTime, blinkRate, blinkPhase);
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
export function Saturate(out, color, saturation)
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
