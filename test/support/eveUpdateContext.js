// Real update contexts and frustums for tests, in place of plain-object stand-ins.
// The space-object code calls EveUpdateContext and TriFrustum methods directly (as
// Carbon does), so a test builds the real classes and pins only what it needs:
// the frustum answers fixed visibility and pixel sizes, the context carries the
// thresholds and time a test sets.
import { EveUpdateContext, TriFrustum } from "../../npm/dist/trinity/index.js";

/**
 * A real TriFrustum that answers fixed visibility and pixel sizes.
 * @param {{ visible?: boolean, pixelSize?: number, pixelSizeEst?: number }} [options]
 * @returns {TriFrustum}
 */
export function FixedFrustum({ visible = true, pixelSize = 80, pixelSizeEst = 75 } = {})
{
  return new (class extends TriFrustum
  {
    IsSphereVisible() { return visible; }
    IsBoxVisible() { return visible; }
    GetPixelSizeAccross() { return pixelSize; }
    GetPixelSizeAccrossEst() { return pixelSizeEst; }
  })();
}

/**
 * A real EveUpdateContext with the given time, frustum and thresholds.
 * @param {object} [options]
 * @returns {EveUpdateContext}
 */
export function UpdateContext({ time, frustum, visibilityThreshold, lowDetailThreshold, mediumDetailThreshold,
  highDetailThreshold, lodFactor } = {})
{
  const context = new EveUpdateContext();
  if (time !== undefined) context.SetTime(time);
  if (frustum !== undefined) context.SetFrustum(frustum);
  if (visibilityThreshold !== undefined) context.SetVisibilityThreshold(visibilityThreshold);
  if (lowDetailThreshold !== undefined) context.SetLowDetailThreshold(lowDetailThreshold);
  if (mediumDetailThreshold !== undefined) context.SetMediumDetailThreshold(mediumDetailThreshold);
  if (highDetailThreshold !== undefined) context.SetHighDetailThreshold(highDetailThreshold);
  if (lodFactor !== undefined) context.SetLodFactor(lodFactor);
  return context;
}
