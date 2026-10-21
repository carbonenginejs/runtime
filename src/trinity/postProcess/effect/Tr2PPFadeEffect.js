import { exposure as be } from "#be";
// Source: trinity/trinity/PostProcess/Effects/Tr2PPFadeEffect.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema postProcess/Tr2PPFadeEffect.json.).
import { type, blue } from "#schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";
import { vec4 } from "#math/vec4";

/** Carries the color and intensity of a display-gated post-process fade. */
@be.define("Tr2PPFadeEffect")
@be.exposureChainTo(Tr2PPEffect)
@be.mapInterface(Tr2PPEffect)
export class Tr2PPFadeEffect extends Tr2PPEffect
{

  /** m_color (Color) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.color
  color = vec4.create();

  /** m_intensity (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  intensity = 0;

  /** Carbon Tr2PPFadeEffect::IsActive override. */
  @blue.method
  IsActive()
  {
    return this.display && this.intensity > 0;
  }

}
