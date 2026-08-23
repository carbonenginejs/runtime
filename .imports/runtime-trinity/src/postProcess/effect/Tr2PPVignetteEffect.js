// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/PostProcess/Effects/Tr2PPVignetteEffect.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema postProcess/Tr2PPVignetteEffect.json.).
import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";
import { vec2 } from "@carbonenginejs/runtime-utils/vec2";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";

/** Tr2PPVignetteEffect (postProcess) - generated from schema shapeHash 8d16cbb2.... */
@type.define({ className: "Tr2PPVignetteEffect", family: "postProcess" })
export class Tr2PPVignetteEffect extends Tr2PPEffect
{

  /** m_intensity (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  intensity = 0;

  /** m_color (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  color = vec4.fromValues(1, 1, 1, 1);

  /** m_detail1Scroll (Vector2) [READWRITE, PERSIST] */
  @io.persist
  @type.vec2
  detail1Scroll = vec2.create();

  /** m_detail1Size (Vector2) [READWRITE, PERSIST] */
  @io.persist
  @type.vec2
  detail1Size = vec2.fromValues(16, 16);

  /** m_detail2Scroll (Vector2) [READWRITE, PERSIST] */
  @io.persist
  @type.vec2
  detail2Scroll = vec2.create();

  /** m_detail2Size (Vector2) [READWRITE, PERSIST] */
  @io.persist
  @type.vec2
  detail2Size = vec2.fromValues(16, 16);

  /** m_detailPath (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  detailPath = "res:/texture/global/white.dds";

  /** m_opacity (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  opacity = 0;

  /** m_shapePath (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  shapePath = "res:/texture/global/black.dds";

  /** m_sineFrequency (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  sineFrequency = 1;

  /** m_sineMaximum (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  sineMaximum = 1;

  /** m_sineMinimum (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  sineMinimum = 0;

  /** Carbon Tr2PPVignetteEffect::IsActive override. */
  IsActive()
  {
    return this.display && this.intensity > 0 && this.opacity > 0;
  }

}
