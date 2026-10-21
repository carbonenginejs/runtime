import { exposure as be } from "#be";
// Source: trinity/trinity/PostProcess/Effects/Tr2PPDesaturateEffect.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema postProcess/Tr2PPDesaturateEffect.json.).
import { type, blue } from "#schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";

/** Carries the intensity of a post-process desaturation effect. */
@be.define("Tr2PPDesaturateEffect")
@be.exposureChainTo(Tr2PPEffect)
@be.mapInterface(Tr2PPEffect)
export class Tr2PPDesaturateEffect extends Tr2PPEffect
{

  /** m_intensity (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  intensity = 1;

}
