// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/PostProcess/Effects/Tr2PPLutEffect.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema postProcess/Tr2PPLutEffect.json.).
import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";

/** Tr2PPLutEffect (postProcess) - generated from schema shapeHash 7000dd13.... */
@type.define({ className: "Tr2PPLutEffect", family: "postProcess" })
export class Tr2PPLutEffect extends Tr2PPEffect
{

  /** m_influence (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  influence = 0;

  /** m_path (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  path = "res:/dx9/scene/postprocess/LUTdefault.dds";

  /** Carbon Tr2PPLutEffect::IsActive override. */
  IsActive()
  {
    return this.display && this.influence > 0;
  }

}
