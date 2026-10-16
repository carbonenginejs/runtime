// Source: audio/src/SpatialAudioSettings.h + SpatialAudioSettings.cpp
// Hand-owned behavior port. Verify against audio/SpatialAudioSettings.json.
import { meta, blue } from "#schema";

/**
 * Retains Carbon spatial-audio initialization defaults and getter/setter
 * semantics for manager and injected-backend use.
 */
@blue.define("SpatialAudioSettings")
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
  @blue.method
  @meta.implemented
  GetSpatialAudioGeometryEnabled()
  {
    return this._spatialAudioGeometryEnabled;
  }

  /** Enables or disables geometry-based spatial audio. */
  @blue.method
  @meta.implemented
  SetSpatialAudioGeometryEnabled(value)
  {
    this._spatialAudioGeometryEnabled = Boolean(value);
  }

  /** Returns the movement threshold used for spatial path validation. */
  @blue.method
  @meta.implemented
  GetMovementThreshold()
  {
    return this._movementThreshold;
  }

  /** Sets the movement threshold used for spatial path validation. */
  @blue.method
  @meta.implemented
  SetMovementThreshold(value)
  {
    this._movementThreshold = Math.fround(value);
  }

  /** Returns the maximum number of primary spatial-audio rays. */
  @blue.method
  @meta.implemented
  GetNumberOfPrimaryRays()
  {
    return this._numberOfPrimaryRays;
  }

  /** Sets the maximum number of primary spatial-audio rays. */
  @blue.method
  @meta.implemented
  SetNumberOfPrimaryRays(value)
  {
    this._numberOfPrimaryRays = Number(value) | 0;
  }

  /** Returns the maximum reflection order. */
  @blue.method
  @meta.implemented
  GetMaxReflectionOrder()
  {
    return this._maxReflectionOrder;
  }

  /** Sets the maximum reflection order. */
  @blue.method
  @meta.implemented
  SetMaxReflectionOrder(value)
  {
    this._maxReflectionOrder = Number(value) | 0;
  }

  /** Returns the maximum diffraction order. */
  @blue.method
  @meta.implemented
  GetMaxDiffractionOrder()
  {
    return this._maxDiffractionOrder;
  }

  /** Sets the maximum diffraction order. */
  @blue.method
  @meta.implemented
  SetMaxDiffractionOrder(value)
  {
    this._maxDiffractionOrder = Number(value) | 0;
  }

  /** Returns the maximum number of emitter room auxiliary sends. */
  @blue.method
  @meta.implemented
  GetMaxEmitterRoomAuxSends()
  {
    return this._maxEmitterRoomAuxSends;
  }

  /** Sets the maximum number of emitter room auxiliary sends. */
  @blue.method
  @meta.implemented
  SetMaxEmitterRoomAuxSends(value)
  {
    this._maxEmitterRoomAuxSends = Number(value) | 0;
  }

  /** Returns the diffraction order applied at reflection endpoints. */
  @blue.method
  @meta.implemented
  GetDiffractionOnReflectionsOrder()
  {
    return this._diffractionOnReflectionsOrder;
  }

  /** Sets the diffraction order applied at reflection endpoints. */
  @blue.method
  @meta.implemented
  SetDiffractionOnReflectionsOrder(value)
  {
    this._diffractionOnReflectionsOrder = Number(value) | 0;
  }

  /** Returns the maximum spatial-audio path length. */
  @blue.method
  @meta.implemented
  GetMaxPathLength()
  {
    return this._maxPathLength;
  }

  /** Sets the maximum spatial-audio path length. */
  @blue.method
  @meta.implemented
  SetMaxPathLength(value)
  {
    this._maxPathLength = Math.fround(value);
  }

  /** Returns the targeted spatial-audio CPU percentage. */
  @blue.method
  @meta.implemented
  GetCPULimitPercentage()
  {
    return this._cpuLimitPercentage;
  }

  /** Sets the targeted spatial-audio CPU percentage. */
  @blue.method
  @meta.implemented
  SetCPULimitPercentage(value)
  {
    this._cpuLimitPercentage = Math.fround(value);
  }

  /** Returns the number of frames used for load balancing. */
  @blue.method
  @meta.implemented
  GetLoadBalancingSpread()
  {
    return this._loadBalancingSpread;
  }

  /** Sets the number of frames used for load balancing. */
  @blue.method
  @meta.implemented
  SetLoadBalancingSpread(value)
  {
    this._loadBalancingSpread = Number(value) | 0;
  }

  /** Returns whether geometric diffraction and transmission are enabled. */
  @blue.method
  @meta.implemented
  GetEnableDiffractionAndTransmission()
  {
    return this._enableDiffractionAndTransmission;
  }

  /** Enables or disables geometric diffraction and transmission. */
  @blue.method
  @meta.implemented
  SetEnableDiffractionAndTransmission(value)
  {
    this._enableDiffractionAndTransmission = Boolean(value);
  }

  /** Returns whether Wwise calculates emitter virtual positions. */
  @blue.method
  @meta.implemented
  GetCalcEmitterVirtualPosition()
  {
    return this._calcEmitterVirtualPosition;
  }

  /** Enables or disables Wwise emitter virtual-position calculation. */
  @blue.method
  @meta.implemented
  SetCalcEmitterVirtualPosition(value)
  {
    this._calcEmitterVirtualPosition = Boolean(value);
  }

  /** Returns the geometry surface transmission loss. */
  @blue.method
  @meta.implemented
  GetTransmissionLoss()
  {
    return this._transmissionLoss;
  }

  /** Sets geometry surface transmission loss, clamped to the Carbon range. */
  @blue.method
  @meta.implemented
  SetTransmissionLoss(value)
  {
    this._transmissionLoss = Math.max(0, Math.min(1, Math.fround(value)));
  }

  /** Returns whether geometry diffraction is enabled. */
  @blue.method
  @meta.implemented
  GetEnableDiffraction()
  {
    return this._enableDiffraction;
  }

  /** Enables or disables geometry diffraction. */
  @blue.method
  @meta.implemented
  SetEnableDiffraction(value)
  {
    this._enableDiffraction = Boolean(value);
  }

  /** Returns whether geometry boundary-edge diffraction is enabled. */
  @blue.method
  @meta.implemented
  GetEnableDiffractionOnBoundaryEdges()
  {
    return this._enableDiffractionOnBoundaryEdges;
  }

  /** Enables or disables geometry boundary-edge diffraction. */
  @blue.method
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
  @blue.method
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
