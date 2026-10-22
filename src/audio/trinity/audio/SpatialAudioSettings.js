// Source: audio/src/SpatialAudioSettings.h + SpatialAudioSettings.cpp
// Hand-owned behavior port. Verify against audio/SpatialAudioSettings.json.
import { meta } from "#schema";

/**
 * Retains Carbon spatial-audio initialization defaults and getter/setter
 * semantics for manager and injected-backend use.
 */
@meta.carbon("SpatialAudioSettings")
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

  _transmissionLoss = Math.fround(0.7);

  _enableDiffraction = true;

  _enableDiffractionOnBoundaryEdges = true;

  /** Returns whether geometry-based spatial audio is enabled. */
  @meta.implemented
  GetSpatialAudioGeometryEnabled()
  {
    return this._spatialAudioGeometryEnabled;
  }

  /** Enables or disables geometry-based spatial audio. */
  @meta.implemented
  SetSpatialAudioGeometryEnabled(value)
  {
    this._spatialAudioGeometryEnabled = Boolean(value);
  }

  /** Returns the movement threshold used for spatial path validation. */
  @meta.implemented
  GetMovementThreshold()
  {
    return this._movementThreshold;
  }

  /** Sets the movement threshold used for spatial path validation. */
  @meta.implemented
  SetMovementThreshold(value)
  {
    this._movementThreshold = Math.fround(value);
  }

  /** Returns the maximum number of primary spatial-audio rays. */
  @meta.implemented
  GetNumberOfPrimaryRays()
  {
    return this._numberOfPrimaryRays;
  }

  /** Sets the maximum number of primary spatial-audio rays. */
  @meta.implemented
  SetNumberOfPrimaryRays(value)
  {
    this._numberOfPrimaryRays = Number(value) | 0;
  }

  /** Returns the maximum reflection order. */
  @meta.implemented
  GetMaxReflectionOrder()
  {
    return this._maxReflectionOrder;
  }

  /** Sets the maximum reflection order. */
  @meta.implemented
  SetMaxReflectionOrder(value)
  {
    this._maxReflectionOrder = Number(value) | 0;
  }

  /** Returns the maximum diffraction order. */
  @meta.implemented
  GetMaxDiffractionOrder()
  {
    return this._maxDiffractionOrder;
  }

  /** Sets the maximum diffraction order. */
  @meta.implemented
  SetMaxDiffractionOrder(value)
  {
    this._maxDiffractionOrder = Number(value) | 0;
  }

  /** Returns the maximum number of emitter room auxiliary sends. */
  @meta.implemented
  GetMaxEmitterRoomAuxSends()
  {
    return this._maxEmitterRoomAuxSends;
  }

  /** Sets the maximum number of emitter room auxiliary sends. */
  @meta.implemented
  SetMaxEmitterRoomAuxSends(value)
  {
    this._maxEmitterRoomAuxSends = Number(value) | 0;
  }

  /** Returns the diffraction order applied at reflection endpoints. */
  @meta.implemented
  GetDiffractionOnReflectionsOrder()
  {
    return this._diffractionOnReflectionsOrder;
  }

  /** Sets the diffraction order applied at reflection endpoints. */
  @meta.implemented
  SetDiffractionOnReflectionsOrder(value)
  {
    this._diffractionOnReflectionsOrder = Number(value) | 0;
  }

  /** Returns the maximum spatial-audio path length. */
  @meta.implemented
  GetMaxPathLength()
  {
    return this._maxPathLength;
  }

  /** Sets the maximum spatial-audio path length. */
  @meta.implemented
  SetMaxPathLength(value)
  {
    this._maxPathLength = Math.fround(value);
  }

  /** Returns the targeted spatial-audio CPU percentage. */
  @meta.implemented
  GetCPULimitPercentage()
  {
    return this._cpuLimitPercentage;
  }

  /** Sets the targeted spatial-audio CPU percentage. */
  @meta.implemented
  SetCPULimitPercentage(value)
  {
    this._cpuLimitPercentage = Math.fround(value);
  }

  /** Returns the number of frames used for load balancing. */
  @meta.implemented
  GetLoadBalancingSpread()
  {
    return this._loadBalancingSpread;
  }

  /** Sets the number of frames used for load balancing. */
  @meta.implemented
  SetLoadBalancingSpread(value)
  {
    this._loadBalancingSpread = Number(value) | 0;
  }

  /** Returns whether geometric diffraction and transmission are enabled. */
  @meta.implemented
  GetEnableDiffractionAndTransmission()
  {
    return this._enableDiffractionAndTransmission;
  }

  /** Enables or disables geometric diffraction and transmission. */
  @meta.implemented
  SetEnableDiffractionAndTransmission(value)
  {
    this._enableDiffractionAndTransmission = Boolean(value);
  }

  /** Returns whether Wwise calculates emitter virtual positions. */
  @meta.implemented
  GetCalcEmitterVirtualPosition()
  {
    return this._calcEmitterVirtualPosition;
  }

  /** Enables or disables Wwise emitter virtual-position calculation. */
  @meta.implemented
  SetCalcEmitterVirtualPosition(value)
  {
    this._calcEmitterVirtualPosition = Boolean(value);
  }

  /** Returns the geometry surface transmission loss. */
  @meta.implemented
  GetTransmissionLoss()
  {
    return this._transmissionLoss;
  }

  /** Sets geometry surface transmission loss, clamped to the Carbon range. */
  @meta.implemented
  SetTransmissionLoss(value)
  {
    this._transmissionLoss = Math.max(0, Math.min(1, Math.fround(value)));
  }

  /** Returns whether geometry diffraction is enabled. */
  @meta.implemented
  GetEnableDiffraction()
  {
    return this._enableDiffraction;
  }

  /** Enables or disables geometry diffraction. */
  @meta.implemented
  SetEnableDiffraction(value)
  {
    this._enableDiffraction = Boolean(value);
  }

  /** Returns whether geometry boundary-edge diffraction is enabled. */
  @meta.implemented
  GetEnableDiffractionOnBoundaryEdges()
  {
    return this._enableDiffractionOnBoundaryEdges;
  }

  /** Enables or disables geometry boundary-edge diffraction. */
  @meta.implemented
  SetEnableDiffractionOnBoundaryEdges(value)
  {
    this._enableDiffractionOnBoundaryEdges = Boolean(value);
  }

  /**
   * Carbon method PopulateInitSettings, mapped to a plain Wwise-shaped object.
   *
   * Adapted: AkSpatialAudioInitSettings is represented by a caller-owned plain JavaScript
   * object.
   */
  @meta.adapted
  PopulateInitSettings(out = {})
  {
    out.fMovementThreshold = this._movementThreshold;
    out.uNumberOfPrimaryRays = this._numberOfPrimaryRays >>> 0;
    out.uMaxReflectionOrder = this._maxReflectionOrder >>> 0;
    out.uMaxDiffractionOrder = this._maxDiffractionOrder >>> 0;
    out.uMaxEmitterRoomAuxSends = this._maxEmitterRoomAuxSends >>> 0;
    out.uDiffractionOnReflectionsOrder = this._diffractionOnReflectionsOrder >>> 0;
    out.fMaxPathLength = this._maxPathLength;
    out.fCPULimitPercentage = this._cpuLimitPercentage;
    out.uLoadBalancingSpread = this._loadBalancingSpread >>> 0;
    out.bEnableGeometricDiffractionAndTransmission = this._enableDiffractionAndTransmission;
    out.bCalcEmitterVirtualPosition = this._calcEmitterVirtualPosition;
    return out;
  }

}
