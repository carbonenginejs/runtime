// Source: audio/src/AudEmitter.h + AudEmitter.cpp
// Hand-owned since 2026-07-18 (behavior port); the generator skips this file.
// Verify against audio/AudEmitter.json.
import { meta } from "#schema";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { AudGameObjResource } from "./AudGameObjResource.js";
import { ITr2AudEmitter } from "../trinityAudioApi/ITr2AudEmitter.js";

/** Represents the concrete content-facing audio emitter (ITr2AudEmitter) with authored placement and attenuation controls. */
@meta.define({ className: "AudEmitter", family: "audio" })
@meta.blue.inherit(ITr2AudEmitter)
@meta.blue.mapInterface(ITr2AudEmitter)
export class AudEmitter extends AudGameObjResource
{

  /** m_authoredRotation (Quaternion) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.quat
  rotation = quat.create();

  /** Effective front vector sent to Wwise; Carbon's read-only `front` property (GetFront). */
  @meta.property()
  @meta.blue.read
  @meta.type.vec3
  get front()
  {
    return this.GetFront();
  }

  /** Effective top vector sent to Wwise; Carbon's read-only `top` property (GetTop). */
  @meta.property()
  @meta.blue.read
  @meta.type.vec3
  get top()
  {
    return this.GetTop();
  }

  /** m_normalizeAttenuationScaling (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  normalizeAttenuationScaling = false;

  /** m_visualizationRadius (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  visualizationRadius = 0;

  /** m_maxNormalizedValue (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  maxNormalizedValue = 9000;

  /** m_maxNormalizedScalingFactor (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  maxNormalizedScalingFactor = 3.5;

  /** m_minNormalizedValue (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  minNormalizedValue = 30;

  /** m_minNormalizedScalingFactor (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  minNormalizedScalingFactor = 0.4;

  /**
   * Carbon `Py__init__` (AudEmitter_Blue.cpp), the Python constructor: sets
   * the name, then runs the no-argument `Initialize()`.
   *
   * @param {string} [name] Emitter name; Carbon defaults it to empty.
   */
  @meta.blue.renamed("__init__")
  @meta.implemented
  __init__(name = "")
  {
    this.name = name;
    this.Initialize();
  }

  /** Carbon method SendEvent -> PostEvent (ITr2AudEmitter). */
  @meta.blue.renamed("SendEvent")
  @meta.implemented
  SendEvent(name, bypassPrefix = false)
  {
    return this.PostEvent(name, bypassPrefix);
  }

  /** Carbon method HandleEvent (IBlueEventListener): event tracks post directly on this emitter. */
  @meta.blue.method
  @meta.implemented
  HandleEvent(eventName)
  {
    this.PostEvent(eventName);
  }

  /**
   * Carbon method SetPosition (AudEmitter.cpp:75-79): the one place Carbon marks
   * a game object as placed (which lets Wake register it), then applies the
   * parent placement.
   */
  @meta.blue.method
  @meta.implemented
  SetPosition(front, top, position)
  {
    this._hasReceivedPosition = true;
    return this.SetPlacementFromParent(front, top, position);
  }

  /** Carbon Blue method SetPlacement -> SetPosition. */
  @meta.blue.renamed("SetPlacement")
  @meta.implemented
  SetPlacement(front, top, position)
  {
    return this.SetPosition(front, top, position);
  }

  /** Carbon method UpdatePlacement: placement observers forward here. */
  @meta.blue.method
  @meta.implemented
  UpdatePlacement(front, top, position)
  {
    this.SetPosition(front, top, position);
  }

  // Linear remap of the input from [minNormalizedValue, maxNormalizedValue]
  // to [minNormalizedScalingFactor, maxNormalizedScalingFactor]. Carbon does
  // NOT clamp - out-of-domain inputs extrapolate. Preserved.
  /** Carbon method SetAttenuationScalingFactor: optional normalization, then base store/push. */
  @meta.blue.method
  @meta.implemented
  SetAttenuationScalingFactor(scalingFactor)
  {
    let finalScalingFactor = scalingFactor;
    if (this.normalizeAttenuationScaling)
    {
      finalScalingFactor = (scalingFactor - this.minNormalizedValue)
        * (this.maxNormalizedScalingFactor - this.minNormalizedScalingFactor)
        / (this.maxNormalizedValue - this.minNormalizedValue)
        + this.minNormalizedScalingFactor;
    }
    return super.SetAttenuationScalingFactor(finalScalingFactor);
  }

  /** Carbon method SetName (ITr2AudEmitter). */
  @meta.blue.method
  @meta.implemented
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /** Carbon method GetName (ITr2AudEmitter). */
  @meta.blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /** Carbon method SetPrefix (ITr2AudEmitter). */
  @meta.blue.method
  @meta.implemented
  SetPrefix(prefix)
  {
    this.eventPrefix = String(prefix ?? "");
  }

  /** Carbon method SetVisibility (ITr2AudEmitter). */
  @meta.blue.method
  @meta.implemented
  SetVisibility(isVisible)
  {
    this.isVisible = !!isVisible;
  }

}
