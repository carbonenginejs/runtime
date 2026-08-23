// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Audio/Tr2AudioStretchAuto.h
// Moved from runtime-trinity generated output 2026-07-18; hand-owned by
// runtime-audio. Verify against trinityAudio/Tr2AudioStretchAuto.json.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2AudioStretchBase } from "./Tr2AudioStretchBase.js";

/** Tr2AudioStretchAuto (trinityAudio) - generated from schema shapeHash 66b9fbdd.... */
@type.define({ className: "Tr2AudioStretchAuto", family: "trinityAudio" })
export class Tr2AudioStretchAuto extends Tr2AudioStretchBase
{

  /** m_impactEvent (std::wstring) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  impactEvent = "";

  /** m_outburstEvent (std::wstring) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  outburstEvent = "";

  /** m_stretchEvent (std::wstring) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  stretchEvent = "";

  /** Carbon method TriggerOutburstEvent. */
  @carbon.method
  @impl.implemented
  TriggerOutburstEvent()
  {
    return this.sourceEmitter?.SendEvent?.(this.outburstEvent) ?? 0;
  }

  /** Carbon method TriggerImpactEvent. */
  @carbon.method
  @impl.implemented
  TriggerImpactEvent()
  {
    return this.destinationEmitter?.SendEvent?.(this.impactEvent) ?? 0;
  }

  /** Carbon method TriggerStretchEvent. */
  @carbon.method
  @impl.implemented
  TriggerStretchEvent()
  {
    return this.stretchEmitter?.SendEvent?.(this.stretchEvent) ?? 0;
  }

}
