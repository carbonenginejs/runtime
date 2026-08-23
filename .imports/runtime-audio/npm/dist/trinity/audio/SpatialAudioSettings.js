import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass;

/**
 * Retains Carbon spatial-audio initialization defaults and getter/setter
 * semantics for manager and injected-backend use.
 */
let _SpatialAudioSettings;
class SpatialAudioSettings extends CjsModel {
  static {
    ({
      e: [_initProto],
      c: [_SpatialAudioSettings, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "SpatialAudioSettings",
      family: "audio"
    })], [[[carbon, carbon.method, impl, impl.implemented], 18, "GetSpatialAudioGeometryEnabled"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetSpatialAudioGeometryEnabled"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMovementThreshold"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetMovementThreshold"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetNumberOfPrimaryRays"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetNumberOfPrimaryRays"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMaxReflectionOrder"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetMaxReflectionOrder"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMaxDiffractionOrder"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetMaxDiffractionOrder"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMaxEmitterRoomAuxSends"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetMaxEmitterRoomAuxSends"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetDiffractionOnReflectionsOrder"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDiffractionOnReflectionsOrder"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMaxPathLength"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetMaxPathLength"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCPULimitPercentage"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetCPULimitPercentage"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLoadBalancingSpread"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetLoadBalancingSpread"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetEnableDiffractionAndTransmission"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetEnableDiffractionAndTransmission"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCalcEmitterVirtualPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetCalcEmitterVirtualPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetTransmissionLoss"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetTransmissionLoss"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetEnableDiffraction"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetEnableDiffraction"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetEnableDiffractionOnBoundaryEdges"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetEnableDiffractionOnBoundaryEdges"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("AkSpatialAudioInitSettings is represented by a caller-owned plain JavaScript object.")], 18, "PopulateInitSettings"]], 0, void 0, CjsModel));
  }
  #spatialAudioGeometryEnabled = (_initProto(this), false);
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
  GetSpatialAudioGeometryEnabled() {
    return this.#spatialAudioGeometryEnabled;
  }

  /** Enables or disables geometry-based spatial audio. */
  SetSpatialAudioGeometryEnabled(value) {
    this.#spatialAudioGeometryEnabled = Boolean(value);
  }

  /** Returns the movement threshold used for spatial path validation. */
  GetMovementThreshold() {
    return this.#movementThreshold;
  }

  /** Sets the movement threshold used for spatial path validation. */
  SetMovementThreshold(value) {
    this.#movementThreshold = Number(value);
  }

  /** Returns the maximum number of primary spatial-audio rays. */
  GetNumberOfPrimaryRays() {
    return this.#numberOfPrimaryRays;
  }

  /** Sets the maximum number of primary spatial-audio rays. */
  SetNumberOfPrimaryRays(value) {
    this.#numberOfPrimaryRays = Number(value);
  }

  /** Returns the maximum reflection order. */
  GetMaxReflectionOrder() {
    return this.#maxReflectionOrder;
  }

  /** Sets the maximum reflection order. */
  SetMaxReflectionOrder(value) {
    this.#maxReflectionOrder = Number(value);
  }

  /** Returns the maximum diffraction order. */
  GetMaxDiffractionOrder() {
    return this.#maxDiffractionOrder;
  }

  /** Sets the maximum diffraction order. */
  SetMaxDiffractionOrder(value) {
    this.#maxDiffractionOrder = Number(value);
  }

  /** Returns the maximum number of emitter room auxiliary sends. */
  GetMaxEmitterRoomAuxSends() {
    return this.#maxEmitterRoomAuxSends;
  }

  /** Sets the maximum number of emitter room auxiliary sends. */
  SetMaxEmitterRoomAuxSends(value) {
    this.#maxEmitterRoomAuxSends = Number(value);
  }

  /** Returns the diffraction order applied at reflection endpoints. */
  GetDiffractionOnReflectionsOrder() {
    return this.#diffractionOnReflectionsOrder;
  }

  /** Sets the diffraction order applied at reflection endpoints. */
  SetDiffractionOnReflectionsOrder(value) {
    this.#diffractionOnReflectionsOrder = Number(value);
  }

  /** Returns the maximum spatial-audio path length. */
  GetMaxPathLength() {
    return this.#maxPathLength;
  }

  /** Sets the maximum spatial-audio path length. */
  SetMaxPathLength(value) {
    this.#maxPathLength = Number(value);
  }

  /** Returns the targeted spatial-audio CPU percentage. */
  GetCPULimitPercentage() {
    return this.#cpuLimitPercentage;
  }

  /** Sets the targeted spatial-audio CPU percentage. */
  SetCPULimitPercentage(value) {
    this.#cpuLimitPercentage = Number(value);
  }

  /** Returns the number of frames used for load balancing. */
  GetLoadBalancingSpread() {
    return this.#loadBalancingSpread;
  }

  /** Sets the number of frames used for load balancing. */
  SetLoadBalancingSpread(value) {
    this.#loadBalancingSpread = Number(value);
  }

  /** Returns whether geometric diffraction and transmission are enabled. */
  GetEnableDiffractionAndTransmission() {
    return this.#enableDiffractionAndTransmission;
  }

  /** Enables or disables geometric diffraction and transmission. */
  SetEnableDiffractionAndTransmission(value) {
    this.#enableDiffractionAndTransmission = Boolean(value);
  }

  /** Returns whether Wwise calculates emitter virtual positions. */
  GetCalcEmitterVirtualPosition() {
    return this.#calcEmitterVirtualPosition;
  }

  /** Enables or disables Wwise emitter virtual-position calculation. */
  SetCalcEmitterVirtualPosition(value) {
    this.#calcEmitterVirtualPosition = Boolean(value);
  }

  /** Returns the geometry surface transmission loss. */
  GetTransmissionLoss() {
    return this.#transmissionLoss;
  }

  /** Sets geometry surface transmission loss, clamped to the Carbon range. */
  SetTransmissionLoss(value) {
    this.#transmissionLoss = Math.max(0, Math.min(1, Number(value)));
  }

  /** Returns whether geometry diffraction is enabled. */
  GetEnableDiffraction() {
    return this.#enableDiffraction;
  }

  /** Enables or disables geometry diffraction. */
  SetEnableDiffraction(value) {
    this.#enableDiffraction = Boolean(value);
  }

  /** Returns whether geometry boundary-edge diffraction is enabled. */
  GetEnableDiffractionOnBoundaryEdges() {
    return this.#enableDiffractionOnBoundaryEdges;
  }

  /** Enables or disables geometry boundary-edge diffraction. */
  SetEnableDiffractionOnBoundaryEdges(value) {
    this.#enableDiffractionOnBoundaryEdges = Boolean(value);
  }

  /** Carbon method PopulateInitSettings, mapped to a plain Wwise-shaped object. */
  PopulateInitSettings(out = {}) {
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
  static {
    _initClass();
  }
}

export { _SpatialAudioSettings as SpatialAudioSettings };
//# sourceMappingURL=SpatialAudioSettings.js.map
