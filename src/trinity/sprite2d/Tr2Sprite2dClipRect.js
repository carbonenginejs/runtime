// Source: trinity/trinity/Sprite2d/ITr2Sprite2dRenderer.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema sprite2d/Tr2Sprite2dClipRect.json.).
import { type, blue } from "#schema";

/**
 * Carries the bounds of a Sprite2D clipping rectangle as a plain native struct.
 * No native query interface or persistence flags are declared. Carbon's
 * no-argument constructor (ITr2Sprite2dRenderer.h:64-66) has an empty body, so
 * all four bounds start at their neutral value.
 */
@blue.define("Tr2Sprite2dClipRect")
export class Tr2Sprite2dClipRect
{

  /** left (float). Carbon leaves it unset. */
  @type.float32
  left = 0;

  /** top (float). Carbon leaves it unset. */
  @type.float32
  top = 0;

  /** right (float). Carbon leaves it unset. */
  @type.float32
  right = 0;

  /** bottom (float). Carbon leaves it unset. */
  @type.float32
  bottom = 0;

}
