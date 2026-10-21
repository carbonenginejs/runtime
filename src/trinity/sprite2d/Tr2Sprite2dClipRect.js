import { meta } from "#schema";
// Source: trinity/trinity/Sprite2d/ITr2Sprite2dRenderer.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema sprite2d/Tr2Sprite2dClipRect.json.).
import { type, blue } from "#schema";

/**
 * Carries the bounds of a Sprite2D clipping rectangle as a plain native struct.
 * No native query interface or persistence flags are declared. Carbon's
 * no-argument constructor (ITr2Sprite2dRenderer.h:64-66) has an empty body, so
 * all four bounds start at their neutral value.
 */
@meta.carbon("Tr2Sprite2dClipRect")
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

  /**
   * Carbon's four-argument constructor (ITr2Sprite2dRenderer.h:67-70): each
   * parameter initialises its own member. The JavaScript constructor is
   * Carbon's no-argument one (h:64-66).
   *
   * @param {number} l Left bound.
   * @param {number} t Top bound.
   * @param {number} r Right bound.
   * @param {number} b Bottom bound.
   * @returns {Tr2Sprite2dClipRect} The clip rectangle.
   */
  static create__AllFields(l, t, r, b)
  {
    const clipRect = new Tr2Sprite2dClipRect();

    clipRect.left = l;
    clipRect.top = t;
    clipRect.right = r;
    clipRect.bottom = b;

    return clipRect;
  }

}
