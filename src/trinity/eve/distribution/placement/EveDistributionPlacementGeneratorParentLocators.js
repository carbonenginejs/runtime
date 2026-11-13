// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionPlacementGenerators/EveDistributionPlacementGeneratorParentLocators.h
import { exposure as be } from "#be";
import { IsMatch } from "#blue";
import { INotify } from "../../../../blue/exposure/INotify.js";
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type } from "#schema";
import { IEveDistributionPlacementGenerators } from "./IEveDistributionPlacementGenerators.js";
import { InitialPlacement } from "../attributeModifiers/InitialPlacement.js";
import { PlacementDataWithIdentifier } from "../../PlacementDataWithIdentifier.js";

/**
 * Builds distribution placements from a named locator set on the parent space object.
 * Carbon destructor: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionPlacementGenerators/EveDistributionPlacementGeneratorParentLocators.cpp:14-21.
 * @adapted No _Destructor is needed: this port never replaces the locator-list notifier, so there is no saved notifier to restore.
 */
@be.define({
  name: "EveDistributionPlacementGeneratorParentLocators",
  inherit: [ INotify ],
  // EveDistributionPlacementGeneratorParentLocators_Blue.cpp:9-14, in Carbon's order.
  interfaces: [ IEveDistributionPlacementGenerators, INotify ],
  members: [
    [ be.ATTR, "locatorSetName", be.READWRITE | be.PERSIST | be.NOTIFY ]
  ]
})
export class EveDistributionPlacementGeneratorParentLocators extends IEveDistributionPlacementGenerators
{

  // Carbon's structure-list notification drives this regeneration state.
  _regenerated = false;

  _requestRegeneration = false;

  _locators = null;

  _parent = null;

  _locatorSetName = null;

  /** m_locatorSetName (BlueSharedString) [READWRITE, PERSIST, NOTIFY] */


  @type.string
  locatorSetName = "damage";

  /**
   * Appends one placement per locator of the parent space object's named locator set, copying position, direction, scale and bone index; appends nothing until an update has resolved that set.
   *
   * @adapted
   * @param placements Caller-owned pool array that is appended to.
   * @param trackingID Mutable counter shared across all generators; each placement consumes one unique id from it.
   */

  GetInitialPlacements(placements, trackingID)
  {
    this._requestRegeneration = false;
    if (!this._locators)
    {
      return;
    }

    for (const locator of this._locators)
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
  }

  /**
   * Reports whether a locator set has just been resolved from the parent and the
   * pool therefore needs rebuilding.
   *
   * @implemented
   */

  IsRequestingRegeneration()
  {
    return this._requestRegeneration;
  }

  /**
   * Resolves the named locator set from the space-object parent carried by the
   * update params, re-resolving whenever the parent or the set name changes, and
   * requests regeneration once locators are found.
   *
   * @adapted
   */

  UpdateSyncronous(_updateContext, params, _owner)
  {
    const parent = params.spaceObjectParent;
    const locatorSetName = String(this.locatorSetName ?? "");
    if (parent !== this._parent || locatorSetName !== this._locatorSetName)
    {
      this._parent = parent;
      this._locatorSetName = locatorSetName;
      this._locators = null;
      this._regenerated = false;
    }

    if (!this._regenerated && parent)
    {
      const locators = parent.GetLocatorsForSet(locatorSetName);
      this._locators = locators;
      if (locators)
      {
        this._regenerated = true;
        this._requestRegeneration = true;
      }
    }
  }

  /**
   * Invalidates the resolved locator set after an authored change so the next
   * update re-reads it.
   *
   * @implemented
   */

  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "locatorSetName")) this._regenerated = false;
    return true;
  }

  /**
   * Invalidates the resolved locator set so the next update re-reads it from the
   * parent.
   *
   * @adapted JavaScript retains explicit invalidation state in place of native
   *   structure-list notifier ownership.
   */

  OnStructureListModified(_event, _item, _index, _list)
  {
    this._regenerated = false;
  }

}

// Exact native Blue exposure: only these identities participate in loading.
