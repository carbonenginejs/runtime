// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Sprite2d/ITr2Sprite2dRenderer.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema sprite2d/Tr2Sprite2dD3DVertex.json.).
import { type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2Sprite2dVertexBase } from "./Tr2Sprite2dVertexBase.js";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";

/** Tr2Sprite2dD3DVertex (sprite2d) - generated from schema shapeHash 6e0618c5.... */
@type.define({ className: "Tr2Sprite2dD3DVertex", family: "sprite2d" })
export class Tr2Sprite2dD3DVertex extends Tr2Sprite2dVertexBase
{

  /** clipRect (Tr2Sprite2dClipRect) */
  @type.rawStruct("Tr2Sprite2dClipRect")
  clipRect = null;

  /** glowBrightness (float) */
  @type.float32
  glowBrightness = 0;

  /** transformIndex (uint8_t) */
  @type.uint8
  transformIndex = 0;

  /** blendMode (uint8_t) */
  @type.uint8
  blendMode = 0;

  /** spriteEffect (uint8_t) */
  @type.uint8
  spriteEffect = 0;

  /** tileMode (uint8_t) */
  @type.uint8
  tileMode = 0;

  /** outlineColor (Color) */
  @type.color
  outlineColor = vec4.create();

  /** outlineThreshold (float) */
  @type.float32
  outlineThreshold = 0;

}
