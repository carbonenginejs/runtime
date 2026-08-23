// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   audio/src/Components/StretchAudio.h + StretchAudio.cpp
// Hand-owned since 2026-07-18 (behavior port); the generator skips this file.
// Verify against audio/StretchAudio.json.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { AudEmitter } from "./AudEmitter.js";
import { AudGameObjResource } from "./AudGameObjResource.js";

/** StretchAudio (audio) - three-emitter beam audio (source/dest/stretch), listener projected onto the segment. */
@type.define({ className: "StretchAudio", family: "audio" })
export class StretchAudio extends CjsModel
{

  /** m_stretchEmitter (AudEmitterPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("AudEmitter")
  stretchEmitter = null;

  /** m_destEmitter (AudEmitterPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("AudEmitter")
  destinationEmitter = null;

  /** m_sourceEmitter (AudEmitterPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("AudEmitter")
  sourceEmitter = null;

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

  /** m_shotMissedEvent (std::wstring) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  shotMissedEvent = "";

  #shotMissed = false;

  #listener = null;

  #front = vec3.fromValues(0, 1, 0);

  #top = vec3.fromValues(0, 0, 1);

  /** Carbon method Initialize: create the three named emitters when absent. */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    if (!this.sourceEmitter)
    {
      this.sourceEmitter = new AudEmitter();
      this.sourceEmitter.Initialize("stretch_source_sfx", "", [0, 0, 0]);
    }
    if (!this.destinationEmitter)
    {
      this.destinationEmitter = new AudEmitter();
      this.destinationEmitter.Initialize("stretch_dest_sfx", "", [0, 0, 0]);
    }
    if (!this.stretchEmitter)
    {
      this.stretchEmitter = new AudEmitter();
      this.stretchEmitter.Initialize("stretch_mid_sfx", "", [0, 0, 0]);
    }
    return true;
  }

  /** Carbon method Start: outburst on source, impact on dest, (shot-missed then) stretch on mid. */
  @carbon.method
  @impl.implemented
  Start()
  {
    this.sourceEmitter?.SendEvent(this.outburstEvent);
    this.destinationEmitter?.SendEvent(this.impactEvent);
    if (this.stretchEmitter)
    {
      if (this.#shotMissed)
      {
        this.stretchEmitter.SendEvent(this.shotMissedEvent);
      }
      this.stretchEmitter.SendEvent(this.stretchEvent);
    }
  }

  /** Carbon method Stop: StopAll on each emitter. */
  @carbon.method
  @impl.implemented
  Stop()
  {
    this.sourceEmitter?.StopAll();
    this.destinationEmitter?.StopAll();
    this.stretchEmitter?.StopAll();
  }

  /** Carbon method Update: position source/dest, project the listener onto the segment for the mid emitter. Events fire only in Start/Stop. */
  @carbon.method
  @impl.implemented
  Update(sourcePosition, destPosition)
  {
    if (!AudGameObjResource.manager?.enabled)
    {
      return;
    }
    StretchAudio.GetStretchOrientation(sourcePosition, destPosition, this.#front, this.#top);
    this.sourceEmitter?.SetPosition(this.#front, this.#top, sourcePosition);
    this.destinationEmitter?.SetPosition(this.#front, this.#top, destPosition);
    if (this.stretchEmitter)
    {
      this.stretchEmitter.SetPosition(
        this.#front,
        this.#top,
        this.ProjectListenerOntoSegment(sourcePosition, destPosition));
    }
  }

  /**
   * Derives a stable beam orientation from source to destination. The top axis
   * prefers +Z, falling back to +Y when the segment is parallel to it.
   */
  static GetStretchOrientation(sourcePosition, destPosition, front, top)
  {
    const segmentX = destPosition[0] - sourcePosition[0];
    const segmentY = destPosition[1] - sourcePosition[1];
    const segmentZ = destPosition[2] - sourcePosition[2];
    const lengthSquared = segmentX * segmentX + segmentY * segmentY + segmentZ * segmentZ;
    if (lengthSquared < 1e-6)
    {
      vec3.set(front, 0, 1, 0);
      vec3.set(top, 0, 0, 1);
      return;
    }

    const inverseLength = 1 / Math.sqrt(lengthSquared);
    vec3.set(
      front,
      segmentX * inverseLength,
      segmentY * inverseLength,
      segmentZ * inverseLength);

    let preferredDot = front[2];
    vec3.set(
      top,
      -front[0] * preferredDot,
      -front[1] * preferredDot,
      1 - front[2] * preferredDot);
    let topLengthSquared = vec3.squaredLength(top);
    if (topLengthSquared < 1e-6)
    {
      preferredDot = front[1];
      vec3.set(
        top,
        -front[0] * preferredDot,
        1 - front[1] * preferredDot,
        -front[2] * preferredDot);
      topLengthSquared = vec3.squaredLength(top);
    }

    vec3.scale(top, top, 1 / Math.sqrt(topLengthSquared));
  }

  // t = dot(L-S, D-S) / |D-S|^2 clamped to [0,1]; degenerate segment
  // (|D-S|^2 < 1e-6) returns the source; no listener returns (0,0,0).
  /** Carbon method ProjectListenerOntoSegment. */
  @carbon.method
  @impl.implemented
  ProjectListenerOntoSegment(sourcePosition, destPosition)
  {
    if (!this.#listener)
    {
      this.#listener = AudGameObjResource.manager?.GetListener?.() ?? null;
      if (!this.#listener)
      {
        return [0, 0, 0];
      }
    }
    const listenerPosition = this.#listener.GetPosition();
    const segX = destPosition[0] - sourcePosition[0];
    const segY = destPosition[1] - sourcePosition[1];
    const segZ = destPosition[2] - sourcePosition[2];
    const segmentLengthSquared = segX * segX + segY * segY + segZ * segZ;
    if (segmentLengthSquared < 1e-6)
    {
      return [sourcePosition[0], sourcePosition[1], sourcePosition[2]];
    }
    const toListenerX = listenerPosition[0] - sourcePosition[0];
    const toListenerY = listenerPosition[1] - sourcePosition[1];
    const toListenerZ = listenerPosition[2] - sourcePosition[2];
    let t = (toListenerX * segX + toListenerY * segY + toListenerZ * segZ) / segmentLengthSquared;
    t = Math.max(0, Math.min(t, 1));
    return [sourcePosition[0] + t * segX, sourcePosition[1] + t * segY, sourcePosition[2] + t * segZ];
  }

  /** Carbon method SetShotMissed. */
  @carbon.method
  @impl.implemented
  SetShotMissed(missed)
  {
    this.#shotMissed = !!missed;
  }

  /** Carbon method FindEmitterByName: source, then dest, then stretch; first name match or null. */
  @carbon.method
  @impl.implemented
  FindEmitterByName(name)
  {
    for (const emitter of [this.sourceEmitter, this.destinationEmitter, this.stretchEmitter])
    {
      if (emitter && emitter.GetName() === name)
      {
        return emitter;
      }
    }
    return null;
  }

}
