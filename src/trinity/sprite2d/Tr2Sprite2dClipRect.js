// Source: trinity/trinity/Sprite2d/ITr2Sprite2dRenderer.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema sprite2d/Tr2Sprite2dClipRect.json.).
import { meta } from "#schema";

/**
 * Carries the bounds of a Sprite2D clipping rectangle as a plain native struct.
 * No native query interface or persistence flags are declared. The existing
 * JavaScript zero defaults are deterministic adapters: Carbon leaves the
 * default-constructed scalar fields uninitialized until the caller fills them.
 */
@meta.define({ className: "Tr2Sprite2dClipRect", family: "sprite2d" })
export class Tr2Sprite2dClipRect
{

  /** left (float) */
  @meta.type.float32
  left = 0;

  /** top (float) */
  @meta.type.float32
  top = 0;

  /** right (float) */
  @meta.type.float32
  right = 0;

  /** bottom (float) */
  @meta.type.float32
  bottom = 0;

}
