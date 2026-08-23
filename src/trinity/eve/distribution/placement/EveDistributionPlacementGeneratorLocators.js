// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionPlacementGenerators/EveDistributionPlacementGeneratorLocators.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { InitialPlacement } from "../attributeModifiers/InitialPlacement.js";
import { PlacementDataWithIdentifier } from "../../PlacementDataWithIdentifier.js";

/** EveDistributionPlacementGeneratorLocators (eve/distribution/placement) - generated from schema shapeHash f7dad053.... */
@type.define({ className: "EveDistributionPlacementGeneratorLocators", family: "eve/distribution/placement" })
export class EveDistributionPlacementGeneratorLocators extends CjsModel
{

  #requestRegeneration = false;

  /** m_locators (PLocatorStructureList) [READ, PERSIST] */
  @io.persist
  @type.list("Locator")
  locators = [];

  /** Flags the pool as stale when the authored locator list changes. */
  @carbon.method
  @impl.adapted
  OnStructureListModified(_event, _item, _index, _list)
  {
    this.#requestRegeneration = true;
  }

  /**
   * Appends one placement per authored locator, copying its position, direction, scale and bone index, and clears the regeneration request.
   *
   * @param placements Caller-owned pool array that is appended to.
   * @param trackingID Mutable counter shared across all generators; each placement consumes one unique id from it.
   */
  @carbon.method
  @impl.adapted
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
    this.#requestRegeneration = false;
  }

  /** Reports whether the locator list changed since the pool was last generated. */
  @carbon.method
  @impl.implemented
  IsRequestingRegeneration()
  {
    return this.#requestRegeneration;
  }

  /** No per-frame work; this generator only reacts to locator list changes. */
  @carbon.method
  @impl.implemented
  UpdateSyncronous(_updateContext, _params, _owner)
  {
  }

}
