// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionPlacementGenerators/EveDistributionPlacementGeneratorVolume.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { InitialPlacement } from "../attributeModifiers/InitialPlacement.js";
import { PlacementDataWithIdentifier } from "../../PlacementDataWithIdentifier.js";

/** EveDistributionPlacementGeneratorVolume (eve/distribution/placement) - generated from schema shapeHash d6e2cbac.... */
@type.define({ className: "EveDistributionPlacementGeneratorVolume", family: "eve/distribution/placement" })
export class EveDistributionPlacementGeneratorVolume extends CjsModel
{

  #isRequestingRegeneration = true;

  #volumeCallbackID = 0;

  #subscribedVolume = null;

  /** m_numGenerated (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.uint32
  numGenerated = 10;

  /** m_hollowVolume (bool) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.boolean
  hollowVolume = false;

  /** m_falloffFactor (float) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.float32
  falloffFactor = 1.5;

  /** m_volume (IEveVolumePtr) [PERSISTONLY] */
  @io.persistOnly
  @type.model("IEveVolume")
  volume = null;

  /**
   * Appends one placement per point sampled from the assigned volume, translated by the volume's bounding-sphere centre and oriented so +Y points along the sampled radial direction; appends nothing when no volume is assigned.
   *
   * @param placements Caller-owned pool array that is appended to.
   * @param trackingID Mutable counter shared across all generators; each placement consumes one unique id from it.
   */
  @carbon.method
  @impl.adapted
  GetInitialPlacements(placements, trackingID)
  {
    this.#syncVolumeCallbacks();
    if (!this.volume)
    {
      return;
    }

    const points = [];
    this.volume.GeneratePointsInVolume(points, this.numGenerated, this.hollowVolume, this.falloffFactor);
    const offset = this.volume.GetBoundingSphere().center;
    const direction = vec3.create();
    const up = vec3.fromValues(0, 1, 0);

    for (const point of points)
    {
      const data = new PlacementDataWithIdentifier();
      vec3.add(data.initialTranslation, offset, point);
      vec3.normalize(direction, point);
      quat.rotationTo(data.initialRotation, up, direction);
      data.uniqueID = trackingID.value++;

      const placement = new InitialPlacement();
      placement.placement = data;
      placement.timeOutDuration = 0;
      placements.push(placement);
    }

    this.#isRequestingRegeneration = false;
  }

  /** Marks the placement pool as stale so the owning distribution rebuilds it. */
  @carbon.method
  @impl.implemented
  RequestRegeneration()
  {
    this.#isRequestingRegeneration = true;
  }

  /**
   * Reports whether the pool is stale; the owning distribution restarts while
   * this is true, and it clears once new placements are generated.
   */
  @carbon.method
  @impl.implemented
  IsRequestingRegeneration()
  {
    return this.#isRequestingRegeneration;
  }

  /** Subscribes to change notifications on the assigned volume. */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    this.#syncVolumeCallbacks();
    return true;
  }

  /**
   * Requests regeneration and re-points the volume subscription after any
   * authored change.
   */
  @carbon.method
  @impl.adapted
  OnModified(_options = {})
  {
    this.RequestRegeneration();
    this.#syncVolumeCallbacks();
    return true;
  }

  /**
   * Re-checks the volume subscription each frame, so a volume swapped in at
   * runtime is picked up and triggers regeneration.
   */
  @carbon.method
  @impl.adapted
  UpdateSyncronous(_updateContext, _params, _owner)
  {
    this.#syncVolumeCallbacks();
  }

  /**
   * Moves the change subscription onto the currently assigned volume when it
   * differs from the subscribed one, then requests regeneration.
   */
  #syncVolumeCallbacks()
  {
    if (this.volume === this.#subscribedVolume)
    {
      return;
    }

    if (this.#subscribedVolume && this.#volumeCallbackID !== 0)
    {
      this.#subscribedVolume.UnregisterForChanges(this.#volumeCallbackID);
    }

    this.#subscribedVolume = this.volume;
    this.#volumeCallbackID = 0;
    if (this.#subscribedVolume)
    {
      this.#volumeCallbackID = this.#subscribedVolume.RegisterForChanges(() => this.RequestRegeneration());
    }
    this.RequestRegeneration();
  }

}
