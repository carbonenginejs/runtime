// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/PostProcess/Effects/Tr2PPDesaturateEffect.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema postProcess/Tr2PPDesaturateEffect.json.).
import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";

/** Tr2PPDesaturateEffect (postProcess) - generated from schema shapeHash 9546fd03.... */
@type.define({ className: "Tr2PPDesaturateEffect", family: "postProcess" })
export class Tr2PPDesaturateEffect extends Tr2PPEffect
{

  /** m_intensity (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  intensity = 1;

}
