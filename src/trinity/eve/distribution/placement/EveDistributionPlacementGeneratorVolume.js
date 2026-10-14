// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionPlacementGenerators/EveDistributionPlacementGeneratorVolume.h
import { IInitialize } from "../../../../global/blue/IInitialize.js";
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { meta } from "#schema";
import { IEveDistributionPlacementGenerators } from "./IEveDistributionPlacementGenerators.js";
import { InitialPlacement } from "../attributeModifiers/InitialPlacement.js";
import { PlacementDataWithIdentifier } from "../../PlacementDataWithIdentifier.js";

/** Samples a volume into oriented distribution placements and requests regeneration when the volume or sampling settings change. */
@meta.define({ className: "EveDistributionPlacementGeneratorVolume", family: "eve/distribution/placement" })
@meta.blue.inherit(IInitialize)
@meta.blue.interface(IInitialize)
@meta.blue.chainTo(IEveDistributionPlacementGenerators)
export class EveDistributionPlacementGeneratorVolume extends IEveDistributionPlacementGenerators
{

  _isRequestingRegeneration = true;

  _volumeCallbackID = 0;

  _subscribedVolume = null;

  /** m_numGenerated (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  numGenerated = 10;

  /** m_hollowVolume (bool) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  hollowVolume = false;

  /** m_falloffFactor (float) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  falloffFactor = 1.5;

  /** m_volume (IEveVolumePtr) [PERSISTONLY] */
  @meta.blue.readwrite
  @meta.blue.persistOnly
  @meta.type.rootRef("IEveVolume")
  volume = null;

  /**
   * Appends one placement per point sampled from the assigned volume, translated by the volume's bounding-sphere centre and oriented so +Y points along the sampled radial direction; appends nothing when no volume is assigned.
   *
   * @param placements Caller-owned pool array that is appended to.
   * @param trackingID Mutable counter shared across all generators; each placement consumes one unique id from it.
   */
  @meta.blue.method
  @meta.adapted
  GetInitialPlacements(placements, trackingID)
  {
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

    this._isRequestingRegeneration = false;
  }

  /** Carbon GetVolume (EveDistributionPlacementGeneratorVolume.cpp:21). */
  @meta.blue.method
  @meta.implemented
  GetVolume()
  {
    return this.volume;
  }

  /**
   * Carbon SetVolume (cpp:26): the ORDERED swap - the old volume is
   * unsubscribed before the new one subscribes.
   */
  @meta.blue.method
  @meta.implemented
  SetVolume(volume)
  {
    this.RemoveVolumeCallbacks();
    this._volumeCallbackID = 0;
    this.volume = volume ?? null;
    this.AddVolumeCallbacks();
  }

  /**
   * Carbon AddVolumeCallbacks (cpp:76): subscribe RequestRegeneration to the
   * assigned volume and keep the token. Also runs from Initialize (cpp:98).
   */
  @meta.blue.method
  @meta.implemented
  AddVolumeCallbacks()
  {
    this._subscribedVolume = this.volume;
    if (this.volume)
    {
      this._volumeCallbackID = this.volume.RegisterForChanges(() => this.RequestRegeneration());
    }
  }

  /**
   * Carbon RemoveVolumeCallbacks (cpp:85): unsubscribe when a token is held.
   * The donor does NOT zero the token afterwards; callers that need a fresh
   * token zero it themselves, exactly as SetVolume above does.
   */
  @meta.blue.method
  @meta.implemented
  RemoveVolumeCallbacks()
  {
    if (this._subscribedVolume && this._volumeCallbackID !== 0)
    {
      this._subscribedVolume.UnregisterForChanges(this._volumeCallbackID);
    }
  }

  /** Marks the placement pool as stale so the owning distribution rebuilds it. */
  @meta.blue.method
  @meta.implemented
  RequestRegeneration()
  {
    this._isRequestingRegeneration = true;
  }

  /**
   * Reports whether the pool is stale; the owning distribution restarts while
   * this is true, and it clears once new placements are generated.
   */
  @meta.blue.method
  @meta.implemented
  IsRequestingRegeneration()
  {
    return this._isRequestingRegeneration;
  }

  /** Carbon Initialize (cpp:98-102): subscribe to the assigned volume's changes. */
  @meta.blue.method
  @meta.implemented
  Initialize()
  {
    this.AddVolumeCallbacks();
    return true;
  }

  /** Carbon OnModified (cpp:106-110): any authored change requests regeneration. */
  @meta.blue.method
  @meta.implemented
  OnModified(_value = null)
  {
    this.RequestRegeneration();
    return true;
  }

}
