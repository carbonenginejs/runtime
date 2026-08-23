// Source: trinity/trinity/PostProcess/Effects/Tr2PPEffect.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema postProcess/Tr2PPEffect.json.).
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** Provides the shared display gate for a post-process effect. */
@type.define({ className: "Tr2PPEffect", family: "postProcess" })
export class Tr2PPEffect extends CjsModel
{

  /** m_display (bool) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.boolean
  display = true;

  /** Carbon Tr2PPEffect::IsActive - the base activity gate. */
  IsActive()
  {
    return this.display;
  }

}
