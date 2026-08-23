// Source: audio/src/SpatialAudioSettings.h + SpatialAudioSettings.cpp
// Hand-owned behavior port. Verify against audio/SpatialAudioSettings.json.
import { carbon, impl, type } from "#schema";
import { CjsModel } from "#model";

/**
 * Retains Carbon spatial-audio initialization defaults and getter/setter
 * semantics for manager and injected-backend use.
 */
@type.define({ className: "SpatialAudioSettings", family: "audio" })
export class SpatialAudioSettings extends CjsModel
{

  #spatialAudioGeometryEnabled = false;

  #movementThreshold = 100;

  #numberOfPrimaryRays = 35;

  #maxReflectionOrder = 0;

  #maxDiffractionOrder = 4;

  #maxEmitterRoomAuxSends = 0;

  #diffractionOnReflectionsOrder = 0;

  #maxPathLength = 1000;

  #cpuLimitPercentage = 20;

  #loadBalancingSpread = 1;

  #enableDiffractionAndTransmission = true;

  #calcEmitterVirtualPosition = true;

  #transmissionLoss = 0.7;

  #enableDiffraction = true;

  #enableDiffractionOnBoundaryEdges = true;

  /** Returns whether geometry-based spatial audio is enabled. */
  @carbon.method
  @impl.implemented
  GetSpatialAudioGeometryEnabled()
  {
    return this.#spatialAudioGeometryEnabled;
  }

  /** Enables or disables geometry-based spatial audio. */
  @carbon.method
  @impl.implemented
  SetSpatialAudioGeometryEnabled(value)
  {
    this.#spatialAudioGeometryEnabled = Boolean(value);
  }

  /** Returns the movement threshold used for spatial path validation. */
  @carbon.method
  @impl.implemented
  GetMovementThreshold()
  {
    return this.#movementThreshold;
  }

  /** Sets the movement threshold used for spatial path validation. */
  @carbon.method
  @impl.implemented
  SetMovementThreshold(value)
  {
    this.#movementThreshold = Number(value);
  }

  /** Returns the maximum number of primary spatial-audio rays. */
  @carbon.method
  @impl.implemented
  GetNumberOfPrimaryRays()
  {
    return this.#numberOfPrimaryRays;
  }

  /** Sets the maximum number of primary spatial-audio rays. */
  @carbon.method
  @impl.implemented
  SetNumberOfPrimaryRays(value)
  {
    this.#numberOfPrimaryRays = Number(value);
  }

  /** Returns the maximum reflection order. */
  @carbon.method
  @impl.implemented
  GetMaxReflectionOrder()
  {
    return this.#maxReflectionOrder;
  }

  /** Sets the maximum reflection order. */
  @carbon.method
  @impl.implemented
  SetMaxReflectionOrder(value)
  {
    this.#maxReflectionOrder = Number(value);
  }

  /** Returns the maximum diffraction order. */
  @carbon.method
  @impl.implemented
  GetMaxDiffractionOrder()
  {
    return this.#maxDiffractionOrder;
  }

  /** Sets the maximum diffraction order. */
  @carbon.method
  @impl.implemented
  SetMaxDiffractionOrder(value)
  {
    this.#maxDiffractionOrder = Number(value);
  }

  /** Returns the maximum number of emitter room auxiliary sends. */
  @carbon.method
  @impl.implemented
  GetMaxEmitterRoomAuxSends()
  {
    return this.#maxEmitterRoomAuxSends;
  }

  /** Sets the maximum number of emitter room auxiliary sends. */
  @carbon.method
  @impl.implemented
  SetMaxEmitterRoomAuxSends(value)
  {
    this.#maxEmitterRoomAuxSends = Number(value);
  }

  /** Returns the diffraction order applied at reflection endpoints. */
  @carbon.method
  @impl.implemented
  GetDiffractionOnReflectionsOrder()
  {
    return this.#diffractionOnReflectionsOrder;
  }

  /** Sets the diffraction order applied at reflection endpoints. */
  @carbon.method
  @impl.implemented
  SetDiffractionOnReflectionsOrder(value)
  {
    this.#diffractionOnReflectionsOrder = Number(value);
  }

  /** Returns the maximum spatial-audio path length. */
  @carbon.method
  @impl.implemented
  GetMaxPathLength()
  {
    return this.#maxPathLength;
  }

  /** Sets the maximum spatial-audio path length. */
  @carbon.method
  @impl.implemented
  SetMaxPathLength(value)
  {
    this.#maxPathLength = Number(value);
  }

  /** Returns the targeted spatial-audio CPU percentage. */
  @carbon.method
  @impl.implemented
  GetCPULimitPercentage()
  {
    return this.#cpuLimitPercentage;
  }

  /** Sets the targeted spatial-audio CPU percentage. */
  @carbon.method
  @impl.implemented
  SetCPULimitPercentage(value)
  {
    this.#cpuLimitPercentage = Number(value);
  }

  /** Returns the number of frames used for load balancing. */
  @carbon.method
  @impl.implemented
  GetLoadBalancingSpread()
  {
    return this.#loadBalancingSpread;
  }

  /** Sets the number of frames used for load balancing. */
  @carbon.method
  @impl.implemented
  SetLoadBalancingSpread(value)
  {
    this.#loadBalancingSpread = Number(value);
  }

  /** Returns whether geometric diffraction and transmission are enabled. */
  @carbon.method
  @impl.implemented
  GetEnableDiffractionAndTransmission()
  {
    return this.#enableDiffractionAndTransmission;
  }

  /** Enables or disables geometric diffraction and transmission. */
  @carbon.method
  @impl.implemented
  SetEnableDiffractionAndTransmission(value)
  {
    this.#enableDiffractionAndTransmission = Boolean(value);
  }

  /** Returns whether Wwise calculates emitter virtual positions. */
  @carbon.method
  @impl.implemented
  GetCalcEmitterVirtualPosition()
  {
    return this.#calcEmitterVirtualPosition;
  }

  /** Enables or disables Wwise emitter virtual-position calculation. */
  @carbon.method
  @impl.implemented
  SetCalcEmitterVirtualPosition(value)
  {
    this.#calcEmitterVirtualPosition = Boolean(value);
  }

  /** Returns the geometry surface transmission loss. */
  @carbon.method
  @impl.implemented
  GetTransmissionLoss()
  {
    return this.#transmissionLoss;
  }

  /** Sets geometry surface transmission loss, clamped to the Carbon range. */
  @carbon.method
  @impl.implemented
  SetTransmissionLoss(value)
  {
    this.#transmissionLoss = Math.max(0, Math.min(1, Number(value)));
  }

  /** Returns whether geometry diffraction is enabled. */
  @carbon.method
  @impl.implemented
  GetEnableDiffraction()
  {
    return this.#enableDiffraction;
  }

  /** Enables or disables geometry diffraction. */
  @carbon.method
  @impl.implemented
  SetEnableDiffraction(value)
  {
    this.#enableDiffraction = Boolean(value);
  }

  /** Returns whether geometry boundary-edge diffraction is enabled. */
  @carbon.method
  @impl.implemented
  GetEnableDiffractionOnBoundaryEdges()
  {
    return this.#enableDiffractionOnBoundaryEdges;
  }

  /** Enables or disables geometry boundary-edge diffraction. */
  @carbon.method
  @impl.implemented
  SetEnableDiffractionOnBoundaryEdges(value)
  {
    this.#enableDiffractionOnBoundaryEdges = Boolean(value);
  }

  /** Carbon method PopulateInitSettings, mapped to a plain Wwise-shaped object. */
  @carbon.method
  @impl.adapted
  @impl.reason("AkSpatialAudioInitSettings is represented by a caller-owned plain JavaScript object.")
  PopulateInitSettings(out = {})
  {
    out.fMovementThreshold = this.#movementThreshold;
    out.uNumberOfPrimaryRays = this.#numberOfPrimaryRays;
    out.uMaxReflectionOrder = this.#maxReflectionOrder;
    out.uMaxDiffractionOrder = this.#maxDiffractionOrder;
    out.uMaxEmitterRoomAuxSends = this.#maxEmitterRoomAuxSends;
    out.uDiffractionOnReflectionsOrder = this.#diffractionOnReflectionsOrder;
    out.fMaxPathLength = this.#maxPathLength;
    out.fCPULimitPercentage = this.#cpuLimitPercentage;
    out.uLoadBalancingSpread = this.#loadBalancingSpread;
    out.bEnableGeometricDiffractionAndTransmission = this.#enableDiffractionAndTransmission;
    out.bCalcEmitterVirtualPosition = this.#calcEmitterVirtualPosition;
    return out;
  }

}
