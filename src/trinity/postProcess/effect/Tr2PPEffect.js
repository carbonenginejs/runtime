import { exposure as be } from "#be";
import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/PostProcess/Effects/Tr2PPEffect.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema postProcess/Tr2PPEffect.json.).
import { type, blue as legacyBlue } from "#schema";
import { blue } from "#blue";
import { Quality } from "../../generated/postProcess/enums.js";

/** Provides the shared display gate for a post-process effect. */
@be.define("Tr2PPEffect")
@legacyBlue.inherit(IRoot)
export class Tr2PPEffect extends IRoot
{

  /** m_display (bool) [READWRITE, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.NOTIFY)

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
