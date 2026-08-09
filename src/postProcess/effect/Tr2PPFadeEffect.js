// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/PostProcess/Effects/Tr2PPFadeEffect.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema postProcess/Tr2PPFadeEffect.json.).
import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";

/** Tr2PPFadeEffect (postProcess) - generated from schema shapeHash 4a4789e6.... */
@type.define({ className: "Tr2PPFadeEffect", family: "postProcess" })
export class Tr2PPFadeEffect extends Tr2PPEffect
{

  /** m_color (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  color = vec4.create();

  /** m_intensity (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  intensity = 0;

  /** Carbon Tr2PPFadeEffect::IsActive override. */
  IsActive()
  {
    return this.display && this.intensity > 0;
  }

}
