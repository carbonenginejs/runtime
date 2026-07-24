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
  OnStructureListModified(_event, _item, _index, _list) {
    this.#requestRegeneration = true;
  }
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
  IsRequestingRegeneration() {
    return this.#requestRegeneration;
  }
  UpdateSyncronous(_updateContext, _params, _owner) {}
  static {
    _initClass();
  }
}

export { _EveDistributionPlace as EveDistributionPlacementGeneratorLocators };
//# sourceMappingURL=EveDistributionPlacementGeneratorLocators.js.map
