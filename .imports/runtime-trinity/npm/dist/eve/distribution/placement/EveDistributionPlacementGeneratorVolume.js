import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { InitialPlacement as _InitialPlacement } from '../attributeModifiers/InitialPlacement.js';
import { PlacementDataWithIdentifier as _PlacementDataWithIde } from '../../PlacementDataWithIdentifier.js';

let _initProto, _initClass, _init_numGenerated, _init_extra_numGenerated, _init_hollowVolume, _init_extra_hollowVolume, _init_falloffFactor, _init_extra_falloffFactor, _init_volume, _init_extra_volume;

/** EveDistributionPlacementGeneratorVolume (eve/distribution/placement) - generated from schema shapeHash d6e2cbac.... */
let _EveDistributionPlace;
class EveDistributionPlacementGeneratorVolume extends CjsModel {
  static {
    ({
      e: [_init_numGenerated, _init_extra_numGenerated, _init_hollowVolume, _init_extra_hollowVolume, _init_falloffFactor, _init_extra_falloffFactor, _init_volume, _init_extra_volume, _initProto],
      c: [_EveDistributionPlace, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveDistributionPlacementGeneratorVolume",
      family: "eve/distribution/placement"
    })], [[[io, io.notify, io, io.persist, type, type.uint32], 16, "numGenerated"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "hollowVolume"], [[io, io.notify, io, io.persist, type, type.float32], 16, "falloffFactor"], [[io, io.persistOnly, void 0, type.model("IEveVolume")], 16, "volume"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetInitialPlacements"], [[carbon, carbon.method, impl, impl.implemented], 18, "RequestRegeneration"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsRequestingRegeneration"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted], 18, "UpdateSyncronous"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_volume(this);
  }
  #isRequestingRegeneration = (_initProto(this), true);
  #volumeCallbackID = 0;
  #subscribedVolume = null;

  /** m_numGenerated (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  numGenerated = _init_numGenerated(this, 10);

  /** m_hollowVolume (bool) [READWRITE, PERSIST, NOTIFY] */
  hollowVolume = (_init_extra_numGenerated(this), _init_hollowVolume(this, false));

  /** m_falloffFactor (float) [READWRITE, PERSIST, NOTIFY] */
  falloffFactor = (_init_extra_hollowVolume(this), _init_falloffFactor(this, 1.5));

  /** m_volume (IEveVolumePtr) [PERSISTONLY] */
  volume = (_init_extra_falloffFactor(this), _init_volume(this, null));

  /**
   * Appends one placement per point sampled from the assigned volume, translated by the volume's bounding-sphere centre and oriented so +Y points along the sampled radial direction; appends nothing when no volume is assigned.
   *
   * @param placements Caller-owned pool array that is appended to.
   * @param trackingID Mutable counter shared across all generators; each placement consumes one unique id from it.
   */
  GetInitialPlacements(placements, trackingID) {
    this.#syncVolumeCallbacks();
    if (!this.volume) {
      return;
    }
    const points = [];
    this.volume.GeneratePointsInVolume(points, this.numGenerated, this.hollowVolume, this.falloffFactor);
    const offset = this.volume.GetBoundingSphere().center;
    const direction = vec3.create();
    const up = vec3.fromValues(0, 1, 0);
    for (const point of points) {
      const data = new _PlacementDataWithIde();
      vec3.add(data.initialTranslation, offset, point);
      vec3.normalize(direction, point);
      quat.rotationTo(data.initialRotation, up, direction);
      data.uniqueID = trackingID.value++;
      const placement = new _InitialPlacement();
      placement.placement = data;
      placement.timeOutDuration = 0;
      placements.push(placement);
    }
    this.#isRequestingRegeneration = false;
  }

  /** Marks the placement pool as stale so the owning distribution rebuilds it. */
  RequestRegeneration() {
    this.#isRequestingRegeneration = true;
  }

  /**
   * Reports whether the pool is stale; the owning distribution restarts while
   * this is true, and it clears once new placements are generated.
   */
  IsRequestingRegeneration() {
    return this.#isRequestingRegeneration;
  }

  /** Subscribes to change notifications on the assigned volume. */
  Initialize() {
    this.#syncVolumeCallbacks();
    return true;
  }

  /**
   * Requests regeneration and re-points the volume subscription after any
   * authored change.
   */
  OnModified(_options = {}) {
    this.RequestRegeneration();
    this.#syncVolumeCallbacks();
    return true;
  }

  /**
   * Re-checks the volume subscription each frame, so a volume swapped in at
   * runtime is picked up and triggers regeneration.
   */
  UpdateSyncronous(_updateContext, _params, _owner) {
    this.#syncVolumeCallbacks();
  }

  /**
   * Moves the change subscription onto the currently assigned volume when it
   * differs from the subscribed one, then requests regeneration.
   */
  #syncVolumeCallbacks() {
    if (this.volume === this.#subscribedVolume) {
      return;
    }
    if (this.#subscribedVolume && this.#volumeCallbackID !== 0) {
      this.#subscribedVolume.UnregisterForChanges(this.#volumeCallbackID);
    }
    this.#subscribedVolume = this.volume;
    this.#volumeCallbackID = 0;
    if (this.#subscribedVolume) {
      this.#volumeCallbackID = this.#subscribedVolume.RegisterForChanges(() => this.RequestRegeneration());
    }
    this.RequestRegeneration();
  }
  static {
    _initClass();
  }
}

export { _EveDistributionPlace as EveDistributionPlacementGeneratorVolume };
//# sourceMappingURL=EveDistributionPlacementGeneratorVolume.js.map
