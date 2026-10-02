// Source: trinity/trinity/Audio/Tr2AudioStretchAuto.h
// Promoted from generated output 2026-07-18; now hand-owned by the audio
// layer. Verify against trinityAudio/Tr2AudioStretchAuto.json.
import { meta } from "#schema";
import { ITr2Audio } from "../trinityAudioApi/ITr2Audio.js";
import { Tr2AudioStretchBase } from "./Tr2AudioStretchBase.js";

/** Adds authored impact, outburst, and stretch event triggers to a three-emitter audio stretch. */
@meta.define({ className: "Tr2AudioStretchAuto", family: "trinityAudio" })
export class Tr2AudioStretchAuto extends Tr2AudioStretchBase
{

  /** m_impactEvent (std::wstring) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  impactEvent = "";

  /** m_outburstEvent (std::wstring) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  outburstEvent = "";

  /** m_stretchEvent (std::wstring) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  stretchEvent = "";

  /** Carbon method TriggerOutburstEvent. */
  @meta.blue.method
  @meta.implemented
  TriggerOutburstEvent()
  {
    return this.sourceEmitter?.SendEvent(this.outburstEvent) ?? 0;
  }

  /** Carbon method TriggerImpactEvent. */
  @meta.blue.method
  @meta.implemented
  TriggerImpactEvent()
  {
    return this.destinationEmitter?.SendEvent(this.impactEvent) ?? 0;
  }

  /** Carbon method TriggerStretchEvent. */
  @meta.blue.method
  @meta.implemented
  TriggerStretchEvent()
  {
    return this.stretchEmitter?.SendEvent(this.stretchEvent) ?? 0;
  }

}

meta.blue.interfaceTable({ interfaces: [Tr2AudioStretchBase, ITr2Audio], chainTo: null })(Tr2AudioStretchAuto, { kind: "class" });
