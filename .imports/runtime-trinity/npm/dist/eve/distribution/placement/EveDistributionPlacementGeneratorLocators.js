import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { InitialPlacement as _InitialPlacement } from '../attributeModifiers/InitialPlacement.js';
import { PlacementDataWithIdentifier as _PlacementDataWithIde } from '../../PlacementDataWithIdentifier.js';

let _initProto, _initClass, _init_locators, _init_extra_locators;

/** EveDistributionPlacementGeneratorLocators (eve/distribution/placement) - generated from schema shapeHash f7dad053.... */
let _EveDistributionPlace;
class EveDistributionPlacementGeneratorLocators extends CjsModel {
  static {
    ({
      e: [_init_locators, _init_extra_locators, _initProto],
      c: [_EveDistributionPlace, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveDistributionPlacementGeneratorLocators",
      family: "eve/distribution/placement"
    })], [[[io, io.persist, void 0, type.list("Locator")], 16, "locators"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnStructureListModified"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetInitialPlacements"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsRequestingRegeneration"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateSyncronous"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_locators(this);
  }
  #requestRegeneration = (_initProto(this), false);

  /** m_locators (PLocatorStructureList) [READ, PERSIST] */
  locators = _init_locators(this, []);

  /** Flags the pool as stale when the authored locator list changes. */
  OnStructureListModified(_event, _item, _index, _list) {
    this.#requestRegeneration = true;
  }

  /**
   * Appends one placement per authored locator, copying its position, direction, scale and bone index, and clears the regeneration request.
   *
   * @param placements Caller-owned pool array that is appended to.
   * @param trackingID Mutable counter shared across all generators; each placement consumes one unique id from it.
   */
  GetInitialPlacements(placements, trackingID) {
    for (const locator of this.locators) {
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
    this.#requestRegeneration = false;
  }

  /** Reports whether the locator list changed since the pool was last generated. */
  IsRequestingRegeneration() {
    return this.#requestRegeneration;
  }

  /** No per-frame work; this generator only reacts to locator list changes. */
  UpdateSyncronous(_updateContext, _params, _owner) {}
  static {
    _initClass();
  }
}

export { _EveDistributionPlace as EveDistributionPlacementGeneratorLocators };
//# sourceMappingURL=EveDistributionPlacementGeneratorLocators.js.map
