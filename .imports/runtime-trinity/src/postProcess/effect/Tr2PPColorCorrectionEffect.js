// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/PostProcess/Effects/Tr2PPColorCorrectionEffect.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema postProcess/Tr2PPColorCorrectionEffect.json.).
import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";

/** Tr2PPColorCorrectionEffect (postProcess) - generated from schema shapeHash c6c9f3ca.... */
@type.define({ className: "Tr2PPColorCorrectionEffect", family: "postProcess" })
export class Tr2PPColorCorrectionEffect extends Tr2PPEffect
{

  /** m_whiteTint (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  whiteTint = 0;

  /** m_colorSaturation (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  colorSaturation = 1;

  /** m_colorContrast (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  colorContrast = 1;

  /** m_colorGamma (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  colorGamma = 1;

  /** m_colorGain (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  colorGain = vec3.fromValues(1, 1, 1);

  /** m_colorOffset (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  colorOffset = vec3.create();

  /** m_whiteTemperature (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  whiteTemperature = 6500;

}
