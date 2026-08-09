// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/PostProcess/Effects/Tr2PPFilmGrainEffect.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema postProcess/Tr2PPFilmGrainEffect.json.).
import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";

/** Tr2PPFilmGrainEffect (postProcess) - generated from schema shapeHash e2a61b5a.... */
@type.define({ className: "Tr2PPFilmGrainEffect", family: "postProcess" })
export class Tr2PPFilmGrainEffect extends Tr2PPEffect
{

  /** m_colorAmount (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  colorAmount = 0.6;

  /** m_grainContrast (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  grainContrast = 4;

  /** m_grainDensity (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  grainDensity = 0.35;

  /** m_intensity (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  intensity = 0.0008;

  /** m_grainSize (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  grainSize = 1.25;

  /** m_brightnessModifier (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  brightnessModifier = -3;

  /** m_colored (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  colored = true;

  /** Carbon Tr2PPFilmGrainEffect::IsActive override. */
  IsActive()
  {
    return this.display && this.intensity > 0;
  }

}
