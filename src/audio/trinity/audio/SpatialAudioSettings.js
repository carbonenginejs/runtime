// Source: audio/src/SpatialAudioSettings.h + SpatialAudioSettings.cpp
// Hand-owned behavior port. Verify against audio/SpatialAudioSettings.json.
import { carbon, impl, type } from "#schema";

/**
 * Retains Carbon spatial-audio initialization defaults and getter/setter
 * semantics for manager and injected-backend use.
 */
@type.define({ className: "SpatialAudioSettings", family: "audio" })
export class SpatialAudioSettings
{

  _spatialAudioGeometryEnabled = false;

  _movementThreshold = 100;

  _numberOfPrimaryRays = 35;

  _maxReflectionOrder = 0;

  _maxDiffractionOrder = 4;

  _maxEmitterRoomAuxSends = 0;

  _diffractionOnReflectionsOrder = 0;

  _maxPathLength = 1000;

  _cpuLimitPercentage = 20;

  _loadBalancingSpread = 1;

  _enableDiffractionAndTransmission = true;

  _calcEmitterVirtualPosition = true;

  _transmissionLoss = 0.7;

  _enableDiffraction = true;

  _enableDiffractionOnBoundaryEdges = true;

  /** Returns whether geometry-based spatial audio is enabled. */
  @carbon.method
  @impl.implemented
  GetSpatialAudioGeometryEnabled()
  {
    return this._spatialAudioGeometryEnabled;
  }

  /** Enables or disables geometry-based spatial audio. */
  @carbon.method
  @impl.implemented
  SetSpatialAudioGeometryEnabled(value)
  {
    this._spatialAudioGeometryEnabled = Boolean(value);
  }

  /** Returns the movement threshold used for spatial path validation. */
  @carbon.method
  @impl.implemented
  GetMovementThreshold()
  {
    return this._movementThreshold;
  }

  /** Sets the movement threshold used for spatial path validation. */
  @carbon.method
  @impl.implemented
  SetMovementThreshold(value)
  {
    this._movementThreshold = Number(value);
  }

  /** Returns the maximum number of primary spatial-audio rays. */
  @carbon.method
  @impl.implemented
  GetNumberOfPrimaryRays()
  {
    return this._numberOfPrimaryRays;
  }

  /** Sets the maximum number of primary spatial-audio rays. */
  @carbon.method
  @impl.implemented
  SetNumberOfPrimaryRays(value)
  {
    this._numberOfPrimaryRays = Number(value);
  }

  /** Returns the maximum reflection order. */
  @carbon.method
  @impl.implemented
  GetMaxReflectionOrder()
  {
    return this._maxReflectionOrder;
  }

  /** Sets the maximum reflection order. */
  @carbon.method
  @impl.implemented
  SetMaxReflectionOrder(value)
  {
    this._maxReflectionOrder = Number(value);
  }

  /** Returns the maximum diffraction order. */
  @carbon.method
  @impl.implemented
  GetMaxDiffractionOrder()
  {
    return this._maxDiffractionOrder;
  }

  /** Sets the maximum diffraction order. */
  @carbon.method
  @impl.implemented
  SetMaxDiffractionOrder(value)
  {
    this._maxDiffractionOrder = Number(value);
  }

  /** Returns the maximum number of emitter room auxiliary sends. */
  @carbon.method
  @impl.implemented
  GetMaxEmitterRoomAuxSends()
  {
    return this._maxEmitterRoomAuxSends;
  }

  /** Sets the maximum number of emitter room auxiliary sends. */
  @carbon.method
  @impl.implemented
  SetMaxEmitterRoomAuxSends(value)
  {
    this._maxEmitterRoomAuxSends = Number(value);
  }

  /** Returns the diffraction order applied at reflection endpoints. */
  @carbon.method
  @impl.implemented
  GetDiffractionOnReflectionsOrder()
  {
    return this._diffractionOnReflectionsOrder;
  }

  /** Sets the diffraction order applied at reflection endpoints. */
  @carbon.method
  @impl.implemented
  SetDiffractionOnReflectionsOrder(value)
  {
    this._diffractionOnReflectionsOrder = Number(value);
  }

  /** Returns the maximum spatial-audio path length. */
  @carbon.method
  @impl.implemented
  GetMaxPathLength()
  {
    return this._maxPathLength;
  }

  /** Sets the maximum spatial-audio path length. */
  @carbon.method
  @impl.implemented
  SetMaxPathLength(value)
  {
    this._maxPathLength = Number(value);
  }

  /** Returns the targeted spatial-audio CPU percentage. */
  @carbon.method
  @impl.implemented
  GetCPULimitPercentage()
  {
    return this._cpuLimitPercentage;
  }

  /** Sets the targeted spatial-audio CPU percentage. */
  @carbon.method
  @impl.implemented
  SetCPULimitPercentage(value)
  {
    this._cpuLimitPercentage = Number(value);
  }

  /** Returns the number of frames used for load balancing. */
  @carbon.method
  @impl.implemented
  GetLoadBalancingSpread()
  {
    return this._loadBalancingSpread;
  }

  /** Sets the number of frames used for load balancing. */
  @carbon.method
  @impl.implemented
  SetLoadBalancingSpread(value)
  {
    this._loadBalancingSpread = Number(value);
  }

  /** Returns whether geometric diffraction and transmission are enabled. */
  @carbon.method
  @impl.implemented
  GetEnableDiffractionAndTransmission()
  {
    return this._enableDiffractionAndTransmission;
  }

  /** Enables or disables geometric diffraction and transmission. */
  @carbon.method
  @impl.implemented
  SetEnableDiffractionAndTransmission(value)
  {
    this._enableDiffractionAndTransmission = Boolean(value);
  }

  /** Returns whether Wwise calculates emitter virtual positions. */
  @carbon.method
  @impl.implemented
  GetCalcEmitterVirtualPosition()
  {
    return this._calcEmitterVirtualPosition;
  }

  /** Enables or disables Wwise emitter virtual-position calculation. */
  @carbon.method
  @impl.implemented
  SetCalcEmitterVirtualPosition(value)
  {
    this._calcEmitterVirtualPosition = Boolean(value);
  }

  /** Returns the geometry surface transmission loss. */
  @carbon.method
  @impl.implemented
  GetTransmissionLoss()
  {
    return this._transmissionLoss;
  }

  /** Sets geometry surface transmission loss, clamped to the Carbon range. */
  @carbon.method
  @impl.implemented
  SetTransmissionLoss(value)
  {
    this._transmissionLoss = Math.max(0, Math.min(1, Number(value)));
  }

  /** Returns whether geometry diffraction is enabled. */
  @carbon.method
  @impl.implemented
  GetEnableDiffraction()
  {
    return this._enableDiffraction;
  }

  /** Enables or disables geometry diffraction. */
  @carbon.method
  @impl.implemented
  SetEnableDiffraction(value)
  {
    this._enableDiffraction = Boolean(value);
  }

  /** Returns whether geometry boundary-edge diffraction is enabled. */
  @carbon.method
  @impl.implemented
  GetEnableDiffractionOnBoundaryEdges()
  {
    return this._enableDiffractionOnBoundaryEdges;
  }

  /** Enables or disables geometry boundary-edge diffraction. */
  @carbon.method
  @impl.implemented
  SetEnableDiffractionOnBoundaryEdges(value)
  {
    this._enableDiffractionOnBoundaryEdges = Boolean(value);
  }

  /** Carbon method PopulateInitSettings, mapped to a plain Wwise-shaped object. */
  @carbon.method
  @impl.adapted
  @impl.reason("AkSpatialAudioInitSettings is represented by a caller-owned plain JavaScript object.")
  PopulateInitSettings(out = {})
  {
    out.fMovementThreshold = this._movementThreshold;
    out.uNumberOfPrimaryRays = this._numberOfPrimaryRays;
    out.uMaxReflectionOrder = this._maxReflectionOrder;
    out.uMaxDiffractionOrder = this._maxDiffractionOrder;
    out.uMaxEmitterRoomAuxSends = this._maxEmitterRoomAuxSends;
    out.uDiffractionOnReflectionsOrder = this._diffractionOnReflectionsOrder;
    out.fMaxPathLength = this._maxPathLength;
    out.fCPULimitPercentage = this._cpuLimitPercentage;
    out.uLoadBalancingSpread = this._loadBalancingSpread;
    out.bEnableGeometricDiffractionAndTransmission = this._enableDiffractionAndTransmission;
    out.bCalcEmitterVirtualPosition = this._calcEmitterVirtualPosition;
    return out;
  }

}
