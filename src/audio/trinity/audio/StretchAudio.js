import { IInitialize } from "../../../global/blue/IInitialize.js";
// Source: audio/src/Components/StretchAudio.h + StretchAudio.cpp
// Hand-owned since 2026-07-18 (behavior port); the generator skips this file.
// Verify against audio/StretchAudio.json.
import { meta } from "#schema";
import { vec3 } from "#math/vec3";
import { IStretchAudio } from "../trinityAudioApi/IStretchAudio.js";
import { AudEmitter } from "./AudEmitter.js";
import { AudGameObjResource } from "./AudGameObjResource.js";

/** Positions source, destination, and stretch emitters along one beam segment, with the listener projected onto that segment. */
@meta.define({ className: "StretchAudio", family: "audio" })
@meta.blue.inherit(IInitialize)
@meta.blue.mapInterface(IInitialize)
export class StretchAudio extends IStretchAudio
{

  /** m_stretchEmitter (AudEmitterPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("AudEmitter")
  stretchEmitter = null;

  /** m_destEmitter (AudEmitterPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("AudEmitter")
  destinationEmitter = null;

  /** m_sourceEmitter (AudEmitterPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("AudEmitter")
  sourceEmitter = null;

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

  /** m_shotMissedEvent (std::wstring) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  shotMissedEvent = "";

  _shotMissed = false;

  _listener = null;

  _front = vec3.fromValues(0, 1, 0);

  _top = vec3.fromValues(0, 0, 1);

  /** Carbon method Initialize: create the three named emitters when absent. */
  @meta.blue.method
  @meta.implemented
  Initialize()
  {
    if (!this.sourceEmitter)
    {
      this.sourceEmitter = new AudEmitter();
      this.sourceEmitter.InitializeWithParameters("stretch_source_sfx", "", [0, 0, 0]);
    }
    if (!this.destinationEmitter)
    {
      this.destinationEmitter = new AudEmitter();
      this.destinationEmitter.InitializeWithParameters("stretch_dest_sfx", "", [0, 0, 0]);
    }
    if (!this.stretchEmitter)
    {
      this.stretchEmitter = new AudEmitter();
      this.stretchEmitter.InitializeWithParameters("stretch_mid_sfx", "", [0, 0, 0]);
    }
    return true;
  }

  /** Carbon method Start: outburst on source, impact on dest, (shot-missed then) stretch on mid. */
  @meta.blue.method
  @meta.implemented
  Start()
  {
    this.sourceEmitter?.SendEvent(this.outburstEvent);
    this.destinationEmitter?.SendEvent(this.impactEvent);
    if (this.stretchEmitter)
    {
      if (this._shotMissed)
      {
        this.stretchEmitter.SendEvent(this.shotMissedEvent);
      }
      this.stretchEmitter.SendEvent(this.stretchEvent);
    }
  }

  /** Carbon method Stop: StopAll on each emitter. */
  @meta.blue.method
  @meta.implemented
  Stop()
  {
    this.sourceEmitter?.StopAll();
    this.destinationEmitter?.StopAll();
    this.stretchEmitter?.StopAll();
  }

  /** Carbon method Update: position source/dest, project the listener onto the segment for the mid emitter. Events fire only in Start/Stop. */
  @meta.blue.method
  @meta.implemented
  Update(sourcePosition, destPosition)
  {
    if (!AudGameObjResource.manager?.enabled)
    {
      return;
    }
    StretchAudio.GetStretchOrientation(sourcePosition, destPosition, this._front, this._top);
    this.sourceEmitter?.SetPosition(this._front, this._top, sourcePosition);
    this.destinationEmitter?.SetPosition(this._front, this._top, destPosition);
    if (this.stretchEmitter)
    {
      this.stretchEmitter.SetPosition(
        this._front,
        this._top,
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
  @meta.blue.method
  @meta.implemented
  ProjectListenerOntoSegment(sourcePosition, destPosition)
  {
    if (!this._listener)
    {
      this._listener = AudGameObjResource.manager?.GetListener() ?? null;
      if (!this._listener)
      {
        return [0, 0, 0];
      }
    }
    const listenerPosition = this._listener.GetPosition();
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
  @meta.blue.method
  @meta.implemented
  SetShotMissed(missed)
  {
    this._shotMissed = !!missed;
  }

  /** Carbon method FindEmitterByName: source, then dest, then stretch; first name match or null. */
  @meta.blue.method
  @meta.implemented
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
