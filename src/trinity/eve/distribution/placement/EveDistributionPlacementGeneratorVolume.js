import { exposure as be } from "#be";
import { INotify } from "../../../../global/blue/INotify.js";
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionPlacementGenerators/EveDistributionPlacementGeneratorVolume.h
import { IInitialize } from "../../../../global/blue/IInitialize.js";
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { meta, type, blue } from "#schema";
import { IEveDistributionPlacementGenerators } from "./IEveDistributionPlacementGenerators.js";
import { InitialPlacement } from "../attributeModifiers/InitialPlacement.js";
import { PlacementDataWithIdentifier } from "../../PlacementDataWithIdentifier.js";

/** Samples a volume into oriented distribution placements and requests regeneration when the volume or sampling settings change. */
@be.define("EveDistributionPlacementGeneratorVolume")
@blue.inherit(IInitialize, INotify)
@be.mapInterface(IEveDistributionPlacementGenerators)
@be.mapInterface(IInitialize)
@be.mapInterface(INotify)
export class EveDistributionPlacementGeneratorVolume extends IEveDistributionPlacementGenerators
{

  _isRequestingRegeneration = true;

  _volumeCallbackID = 0;

  _subscribedVolume = null;

  /** m_numGenerated (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.uint32
  numGenerated = 10;

  /** m_hollowVolume (bool) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.boolean
  hollowVolume = false;

  /** m_falloffFactor (float) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.float32
  falloffFactor = 1.5;

  /**
   * m_volume (IEveVolumePtr, private, h:39), persisted under its exposed name
   * by MAP_ATTRIBUTE "volume" PERSISTONLY
   * (EveDistributionPlacementGeneratorVolume_Blue.cpp:18). Readers write it
   * directly, bypassing the setter; Initialize then subscribes to it.
   * Carbon: EveDistributionPlacementGeneratorVolume::m_volume (trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionPlacementGenerators/EveDistributionPlacementGeneratorVolume.h:39); MAP_ATTRIBUTE (trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionPlacementGenerators/EveDistributionPlacementGeneratorVolume_Blue.cpp:18).
   */
  @be.mapAttribute(be.PERSISTONLY, "volume")

  @type.rootRef("IEveVolume")
  _volume = null;

  /**
   * Carbon MAP_PROPERTY "volume" over GetVolume/SetVolume
   * (EveDistributionPlacementGeneratorVolume_Blue.cpp:19): the setter moves
   * the change subscription to the replacement volume.
   */
  @be.mapProperty()
  @type.rootRef("IEveVolume")
  @meta.implemented
  get volume()
  {
    return this.GetVolume();
  }

  /** Moves the regeneration subscription to the replacement volume. */
  @meta.implemented
  set volume(value)
  {
    this.SetVolume(value);
  }

  /**
   * Appends one placement per point sampled from the assigned volume, translated by the volume's bounding-sphere centre and oriented so +Y points along the sampled radial direction; appends nothing when no volume is assigned.
   *
   * @param placements Caller-owned pool array that is appended to.
   * @param trackingID Mutable counter shared across all generators; each placement consumes one unique id from it.
   */

  @meta.adapted
  GetInitialPlacements(placements, trackingID)
  {
    if (!this._volume)
    {
      return;
    }

    const points = [];
    this._volume.GeneratePointsInVolume(points, this.numGenerated, this.hollowVolume, this.falloffFactor);
    const offset = this._volume.GetBoundingSphere().center;
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

  @meta.implemented
  GetVolume()
  {
    return this._volume;
  }

  /**
   * Carbon SetVolume (cpp:26): the ORDERED swap - the old volume is
   * unsubscribed before the new one subscribes.
   */

  @meta.implemented
  SetVolume(volume)
  {
    this.RemoveVolumeCallbacks();
    this._volumeCallbackID = 0;
    this._volume = volume ?? null;
    this.AddVolumeCallbacks();
  }

  /**
   * Carbon AddVolumeCallbacks (cpp:76): subscribe RequestRegeneration to the
   * assigned volume and keep the token. Also runs from Initialize (cpp:98).
   */

  @meta.implemented
  AddVolumeCallbacks()
  {
    this._subscribedVolume = this._volume;
    if (this._volume)
    {
      this._volumeCallbackID = this._volume.RegisterForChanges(() => this.RequestRegeneration());
    }
  }

  /**
   * Carbon RemoveVolumeCallbacks (cpp:85): unsubscribe when a token is held.
   * The donor does NOT zero the token afterwards; callers that need a fresh
   * token zero it themselves, exactly as SetVolume above does.
   */

  @meta.implemented
  RemoveVolumeCallbacks()
  {
    if (this._subscribedVolume && this._volumeCallbackID !== 0)
    {
      this._subscribedVolume.UnregisterForChanges(this._volumeCallbackID);
    }
  }

  /** Marks the placement pool as stale so the owning distribution rebuilds it. */

  @meta.implemented
  RequestRegeneration()
  {
    this._isRequestingRegeneration = true;
  }

  /**
   * Reports whether the pool is stale; the owning distribution restarts while
   * this is true, and it clears once new placements are generated.
   */

  @meta.implemented
  IsRequestingRegeneration()
  {
    return this._isRequestingRegeneration;
  }

  /** Carbon Initialize (cpp:98-102): subscribe to the assigned volume's changes. */

  @meta.implemented
  Initialize()
  {
    this.AddVolumeCallbacks();
    return true;
  }

  /** Carbon OnModified (cpp:106-110): any authored change requests regeneration. */

  @meta.implemented
  OnModified(_value = null)
  {
    this.RequestRegeneration();
    return true;
  }

}
