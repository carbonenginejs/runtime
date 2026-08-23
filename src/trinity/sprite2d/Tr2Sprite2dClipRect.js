// Source: trinity/trinity/Sprite2d/ITr2Sprite2dRenderer.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema sprite2d/Tr2Sprite2dClipRect.json.).
import { type } from "#schema";
import { CjsModel } from "#model";

/** Carries the left, top, right, and bottom bounds of one Sprite2D clipping rectangle. */
@type.define({ className: "Tr2Sprite2dClipRect", family: "sprite2d" })
export class Tr2Sprite2dClipRect extends CjsModel
{

  /** left (float) */
  @type.float32
  left = 0;

  /** top (float) */
  @type.float32
  top = 0;

  /** right (float) */
  @type.float32
  right = 0;

  /** bottom (float) */
  @type.float32
  bottom = 0;

}
