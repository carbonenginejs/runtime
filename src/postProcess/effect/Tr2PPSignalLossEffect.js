// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/PostProcess/Effects/Tr2PPSignalLossEffect.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema postProcess/Tr2PPSignalLossEffect.json.).
import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";

/** Tr2PPSignalLossEffect (postProcess) - generated from schema shapeHash 87c0f0bf.... */
@type.define({ className: "Tr2PPSignalLossEffect", family: "postProcess" })
export class Tr2PPSignalLossEffect extends Tr2PPEffect
{

  /** m_strength (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  strength = 0;

  /** Carbon Tr2PPSignalLossEffect::IsActive override. */
  IsActive()
  {
    return this.display && this.strength > 0;
  }

}
