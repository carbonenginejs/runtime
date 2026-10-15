// Source: trinity/trinity/PostProcess/Effects/Tr2PPEffect.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema postProcess/Tr2PPEffect.json.).
import { type, blue } from "#schema";
import { be } from "#blue";
import { Quality } from "../../generated/postProcess/enums.js";

/** Provides the shared display gate for a post-process effect. */
@blue.define("Tr2PPEffect")
export class Tr2PPEffect
{

  /** m_display (bool) [READWRITE, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.boolean
  display = true;

  /** Carbon Tr2PPEffect::IsActive - the base activity gate. */
  IsActive()
  {
    return this.display;
  }

}

// PostProcess::Quality (Tr2PPEffect.h:9), registered where Carbon registers it
// (Tr2PPEffect_Blue.cpp:13). The chooser omits COUNT.
