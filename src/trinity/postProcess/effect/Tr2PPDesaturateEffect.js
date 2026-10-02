// Source: trinity/trinity/PostProcess/Effects/Tr2PPDesaturateEffect.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema postProcess/Tr2PPDesaturateEffect.json.).
import { meta } from "#schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";

/** Carries the intensity of a post-process desaturation effect. */
@meta.define({ className: "Tr2PPDesaturateEffect", family: "postProcess" })
export class Tr2PPDesaturateEffect extends Tr2PPEffect
{

  /** m_intensity (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  intensity = 1;

}
