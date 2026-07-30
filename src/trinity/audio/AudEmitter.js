// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   audio/src/AudEmitter.h + AudEmitter.cpp
// Hand-owned since 2026-07-18 (behavior port); the generator skips this file.
// Verify against audio/AudEmitter.json.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { AudGameObjResource } from "./AudGameObjResource.js";

/** AudEmitter (audio) - the concrete content-facing emitter (ITr2AudEmitter). */
@type.define({ className: "AudEmitter", family: "audio" })
export class AudEmitter extends AudGameObjResource
{

  /** m_authoredRotation (Quaternion) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.quat
  rotation = quat.create();

  /** Effective front vector sent to the audio backend [READ]. */
  @io.read
  @type.vec3
  front = vec3.fromValues(0, 0, 1);

  /** Effective top vector sent to the audio backend [READ]. */
  @io.read
  @type.vec3
  top = vec3.fromValues(0, 1, 0);

  /** m_normalizeAttenuationScaling (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  normalizeAttenuationScaling = false;

  /** m_visualizationRadius (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  visualizationRadius = 0;

  /** m_maxNormalizedValue (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  maxNormalizedValue = 9000;

  /** m_maxNormalizedScalingFactor (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  maxNormalizedScalingFactor = 3.5;

  /** m_minNormalizedValue (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  minNormalizedValue = 30;

  /** m_minNormalizedScalingFactor (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  minNormalizedScalingFactor = 0.4;

  /** Carbon method __init__ -> Py__init__: forwards to Initialize. */
  @carbon.renamed("__init__")
  @impl.implemented
  __init__(name, prefix, position)
  {
    return this.Initialize(name, prefix, position);
  }

  /** Carbon method SendEvent -> PostEvent (ITr2AudEmitter). */
  @carbon.renamed("SendEvent")
  @impl.implemented
  SendEvent(name, bypassPrefix = false)
  {
    return this.PostEvent(name, bypassPrefix);
  }

  /** Carbon method HandleEvent (IBlueEventListener): event tracks post directly on this emitter. */
  @carbon.method
  @impl.implemented
  HandleEvent(eventName)
  {
    this.PostEvent(eventName);
  }

  /** Carbon method SetPosition: marks the emitter positioned (unblocks Wake), then stores/pushes. */
  @carbon.method
  @impl.implemented
  SetPosition(front, top, position)
  {
    this.MarkPositionReceived();
    return this.SetPlacementFromParent(front, top, position);
  }

  /** Carbon Blue method SetPlacement -> SetPosition. */
  @carbon.renamed("SetPlacement")
  @impl.implemented
  SetPlacement(front, top, position)
  {
    return this.SetPosition(front, top, position);
  }

  /** Carbon method UpdatePlacement: placement observers forward here. */
  @carbon.method
  @impl.implemented
  UpdatePlacement(front, top, position)
  {
    this.SetPosition(front, top, position);
  }

  // Linear remap of the input from [minNormalizedValue, maxNormalizedValue]
  // to [minNormalizedScalingFactor, maxNormalizedScalingFactor]. Carbon does
  // NOT clamp - out-of-domain inputs extrapolate. Preserved.
  /** Carbon method SetAttenuationScalingFactor: optional normalization, then base store/push. */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /** Carbon method GetName (ITr2AudEmitter). */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  /** Carbon method SetPrefix (ITr2AudEmitter). */
  @carbon.method
  @impl.implemented
  SetPrefix(prefix)
  {
    this.eventPrefix = String(prefix ?? "");
  }

  /** Carbon method SetVisibility (ITr2AudEmitter). */
  @carbon.method
  @impl.implemented
  SetVisibility(isVisible)
  {
    this.isVisible = !!isVisible;
  }

}
