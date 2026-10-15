// Source: trinity/trinity/Audio/Tr2AudioStretchAuto.h
// Promoted from generated output 2026-07-18; now hand-owned by the audio
// layer. Verify against trinityAudio/Tr2AudioStretchAuto.json.
import { meta, type, blue } from "#schema";
import { ITr2Audio } from "../trinityAudioApi/ITr2Audio.js";
import { Tr2AudioStretchBase } from "./Tr2AudioStretchBase.js";

/** Adds authored impact, outburst, and stretch event triggers to a three-emitter audio stretch. */
@blue.define("Tr2AudioStretchAuto")
@blue.interface(Tr2AudioStretchBase, ITr2Audio)
export class Tr2AudioStretchAuto extends Tr2AudioStretchBase
{

  /** m_impactEvent (std::wstring) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.wstring
  impactEvent = "";

  /** m_outburstEvent (std::wstring) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.wstring
  outburstEvent = "";

  /** m_stretchEvent (std::wstring) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.wstring
  stretchEvent = "";

  /** Carbon method TriggerOutburstEvent. */
  @blue.method
  @meta.implemented
  TriggerOutburstEvent()
  {
    return this.sourceEmitter?.SendEvent(this.outburstEvent) ?? 0;
  }

  /** Carbon method TriggerImpactEvent. */
  @blue.method
  @meta.implemented
  TriggerImpactEvent()
  {
    return this.destinationEmitter?.SendEvent(this.impactEvent) ?? 0;
  }

  /** Carbon method TriggerStretchEvent. */
  @blue.method
  @meta.implemented
  TriggerStretchEvent()
  {
    return this.stretchEmitter?.SendEvent(this.stretchEvent) ?? 0;
  }

}

