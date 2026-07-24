import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { InitialPlacement as _InitialPlacement } from '../attributeModifiers/InitialPlacement.js';
import { PlacementDataWithIdentifier as _PlacementDataWithIde } from '../../PlacementDataWithIdentifier.js';

let _initProto, _initClass, _init_locatorSetName, _init_extra_locatorSetName;

/** EveDistributionPlacementGeneratorParentLocators (eve/distribution/placement) - generated from schema shapeHash ebb2456a.... */
let _EveDistributionPlace;
class EveDistributionPlacementGeneratorParentLocators extends CjsModel {
  static {
    ({
      e: [_init_locatorSetName, _init_extra_locatorSetName, _initProto],
      c: [_EveDistributionPlace, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveDistributionPlacementGeneratorParentLocators",
      family: "eve/distribution/placement"
    })], [[[io, io.notify, io, io.persist, type, type.string], 16, "locatorSetName"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetInitialPlacements"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsRequestingRegeneration"], [[carbon, carbon.method, impl, impl.adapted], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("JavaScript retains explicit invalidation state in place of native structure-list notifier ownership.")], 18, "OnStructureListModified"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_locatorSetName(this);
  }
  // Carbon's structure-list notification drives this regeneration state.
  #regenerated = (_initProto(this), false);
  #requestRegeneration = false;
  #locators = null;
  #parent = null;
  #locatorSetName = null;

  /** m_locatorSetName (BlueSharedString) [READWRITE, PERSIST, NOTIFY] */
  locatorSetName = _init_locatorSetName(this, "damage");
  GetInitialPlacements(placements, trackingID) {
    this.#requestRegeneration = false;
    if (!this.#locators) {
      return;
    }
    for (const locator of this.#locators) {
      const data = new _PlacementDataWithIde();
      data.initialTranslation.set(locator.position);
      data.initialRotation.set(locator.direction);
      data.initialScale.set(locator.scale);
      data.boneIndex = locator.boneIndex;
      data.uniqueID = trackingID.value++;
      const placement = new _InitialPlacement();
      placement.placement = data;
      placement.timeOutDuration = 0;
      placements.push(placement);
    }
  }
  IsRequestingRegeneration() {
    return this.#requestRegeneration;
  }
  UpdateSyncronous(_updateContext, params, _owner) {
    const parent = params.spaceObjectParent;
    const locatorSetName = String(this.locatorSetName ?? "");
    if (parent !== this.#parent || locatorSetName !== this.#locatorSetName) {
      this.#parent = parent;
      this.#locatorSetName = locatorSetName;
      this.#locators = null;
      this.#regenerated = false;
    }
    if (!this.#regenerated && parent) {
      const locators = parent.GetLocatorsForSet(locatorSetName);
      this.#locators = locators;
      if (locators) {
        this.#regenerated = true;
        this.#requestRegeneration = true;
      }
    }
  }
  OnModified(_options = {}) {
    this.#regenerated = false;
    return true;
  }
  OnStructureListModified(_event, _item, _index, _list) {
    this.#regenerated = false;
  }
  static {
    _initClass();
  }
}

export { _EveDistributionPlace as EveDistributionPlacementGeneratorParentLocators };
//# sourceMappingURL=EveDistributionPlacementGeneratorParentLocators.js.map
