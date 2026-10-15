// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionPlacementGenerators/EveDistributionPlacementGeneratorLocators.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta, type, blue } from "#schema";
import { IEveDistributionPlacementGenerators } from "./IEveDistributionPlacementGenerators.js";
import { InitialPlacement } from "../attributeModifiers/InitialPlacement.js";
import { PlacementDataWithIdentifier } from "../../PlacementDataWithIdentifier.js";

/** Builds distribution placements from an authored locator list and requests regeneration when that list changes. */
@blue.define("EveDistributionPlacementGeneratorLocators")
export class EveDistributionPlacementGeneratorLocators extends IEveDistributionPlacementGenerators
{

  _requestRegeneration = false;

  /** m_locators (PLocatorStructureList) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.structList("Locator")
  locators = [];

  /** Flags the pool as stale when the authored locator list changes. */
  @blue.method
  @meta.adapted
  OnStructureListModified(_event, _item, _index, _list)
  {
    this._requestRegeneration = true;
  }

  /**
   * Appends one placement per authored locator, copying its position, direction, scale and bone index, and clears the regeneration request.
   *
   * @param placements Caller-owned pool array that is appended to.
   * @param trackingID Mutable counter shared across all generators; each placement consumes one unique id from it.
   */
  @blue.method
  @meta.adapted
  GetInitialPlacements(placements, trackingID)
  {
    for (const locator of this.locators)
    {
      const data = new PlacementDataWithIdentifier();
      data.initialTranslation.set(locator.position);
      data.initialRotation.set(locator.direction);
      data.initialScale.set(locator.scale);
      data.boneIndex = locator.boneIndex;
      data.uniqueID = trackingID.value++;

      const placement = new InitialPlacement();
      placement.placement = data;
      placement.timeOutDuration = 0;
      placements.push(placement);
    }
    this._requestRegeneration = false;
  }

  /** Reports whether the locator list changed since the pool was last generated. */
  @blue.method
  @meta.implemented
  IsRequestingRegeneration()
  {
    return this._requestRegeneration;
  }

  /** No per-frame work; this generator only reacts to locator list changes. */
  @blue.method
  @meta.implemented
  UpdateSyncronous(_updateContext, _params, _owner)
  {
  }

}
