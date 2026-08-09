// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/PostProcess/Effects/Tr2PPGodRaysEffect.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema postProcess/Tr2PPGodRaysEffect.json.).
import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";

/** Tr2PPGodRaysEffect (postProcess) - generated from schema shapeHash 14c380e1.... */
@type.define({ className: "Tr2PPGodRaysEffect", family: "postProcess" })
export class Tr2PPGodRaysEffect extends Tr2PPEffect
{

  /** m_godRayColor (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  godRayColor = vec4.fromValues(1, 1, 1, 1);

  /** m_intensity (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  intensity = 0;

  /** m_noiseTexturePath (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  noiseTexturePath = "res:/Texture/Global/noise.dds";

  /** Carbon Tr2PPGodRaysEffect::IsActive override. */
  IsActive()
  {
    return this.display && this.intensity > 0;
  }

}
