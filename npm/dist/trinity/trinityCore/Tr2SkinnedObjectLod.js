import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto;
const LOW_DETAIL_THRESHOLD = 150;
const MEDIUM_DETAIL_THRESHOLD = 500;
const HIGH_MEDIUM_MARGIN = 0;
const MEDIUM_LOW_MARGIN = 0;
const UNLOAD_MAX_FRAME_TIME = 0.1;
const RESOURCE_UNLOAD_TIME = 10;

/**
 * Native helper owned by Tr2SkinnedObject.
 *
 * This is a real Trinity class, but not a Blue-declared/persisted object. The
 * owner exposes its three proxy values and delegates selection to this helper.
 */
class Tr2SkinnedObjectLod {
  static {
    [_initProto] = _applyDecs2311(this, [], [[[carbon, carbon.method, impl, impl.implemented], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "PopulateLods"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetLOD"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Uses an already supplied Blue proxy; proxy construction belongs to the outer runtime adapter.")], 18, "SetHighDetailModel"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Uses an already supplied Blue proxy; proxy construction belongs to the outer runtime adapter.")], 18, "SetMediumDetailModel"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Uses an already supplied Blue proxy; proxy construction belongs to the outer runtime adapter.")], 18, "SetLowDetailModel"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnloadLodIfNeeded"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetCurrentLod"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCurrentLod"], [[carbon, carbon.method, impl, impl.implemented], 18, "HaveLodSetup"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsCastingShadow"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsSimulatingCloth"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("CarbonEngineJS proxies receive the model object when no native raw-root handle exists.")], 18, "OnModelChanged"]]).e;
  }
  highDetailProxy = (_initProto(this), null);
  lowDetailProxy = null;
  mediumDetailProxy = null;
  #allowLodSelection = false;
  #currentLod = -1;
  OnModified(value) {
    if (value === this.highDetailProxy || value === this.mediumDetailProxy || value === this.lowDetailProxy) {
      this.PopulateLods();
    }
    return true;
  }
  PopulateLods() {
    this.#allowLodSelection = !!(this.highDetailProxy || this.mediumDetailProxy || this.lowDetailProxy);
  }
  SetLOD(_frustum, estimatedPixelDiameter) {
    if (!this.#allowLodSelection) {
      return null;
    }
    const proxies = [this.highDetailProxy, this.mediumDetailProxy, this.lowDetailProxy];
    let stickyLod = -1;
    for (const proxy of proxies) {
      if (proxy?.IsTemporary()) {
        stickyLod = this.#currentLod;
      }
    }
    let choices = [0, 1, 2];
    if (stickyLod === 2 || this.#currentLod >= 2 && estimatedPixelDiameter <= LOW_DETAIL_THRESHOLD + MEDIUM_LOW_MARGIN || this.#currentLod < 2 && estimatedPixelDiameter <= LOW_DETAIL_THRESHOLD - MEDIUM_LOW_MARGIN) {
      choices = [2, 1, 0];
    } else if (stickyLod === 1 || this.#currentLod >= 1 && estimatedPixelDiameter <= MEDIUM_DETAIL_THRESHOLD + HIGH_MEDIUM_MARGIN || this.#currentLod < 1 && estimatedPixelDiameter <= MEDIUM_DETAIL_THRESHOLD - HIGH_MEDIUM_MARGIN) {
      choices = [1, 2, 0];
    }
    let selectedLod = -1;
    let model = null;
    let modelIsTemporary = true;
    for (const lod of choices) {
      const proxy = proxies[lod];
      if (proxy && (!model || modelIsTemporary && proxy.IsResident())) {
        model = proxy.GetObject();
        selectedLod = lod;
        modelIsTemporary = proxy.IsTemporary();
      }
    }
    if (model && this.#currentLod !== selectedLod && selectedLod !== -1) {
      this.#currentLod = selectedLod;
      proxies[this.#currentLod].OnSelected();
    }
    return model;
  }
  SetHighDetailModel(model) {
    SetProxyObject(this.highDetailProxy, model);
  }
  SetMediumDetailModel(model) {
    SetProxyObject(this.mediumDetailProxy, model);
  }
  SetLowDetailModel(model) {
    SetProxyObject(this.lowDetailProxy, model);
  }
  UnloadLodIfNeeded(time, deltaTime) {
    if (!this.#allowLodSelection || Number(deltaTime) > UNLOAD_MAX_FRAME_TIME) {
      return false;
    }
    this.highDetailProxy?.Update(time, this.#currentLod === 0 ? 0 : RESOURCE_UNLOAD_TIME);
    this.mediumDetailProxy?.Update(time, this.#currentLod === 1 ? 0 : RESOURCE_UNLOAD_TIME);
    this.lowDetailProxy?.Update(time, this.#currentLod === 2 ? 0 : RESOURCE_UNLOAD_TIME);

    // The maintained native implementation always returns false, despite the
    // older header comment describing a possible true result.
    return false;
  }
  SetCurrentLod(lod) {
    this.#currentLod = lod;
  }
  GetCurrentLod() {
    return this.#currentLod;
  }
  HaveLodSetup() {
    return this.#allowLodSelection;
  }
  IsCastingShadow() {
    return !this.#allowLodSelection || this.#currentLod === 0;
  }
  IsSimulatingCloth(maxClothLod) {
    return !this.#allowLodSelection || this.#currentLod <= maxClothLod;
  }
  OnModelChanged(model) {
    if (!model) {
      return;
    }
    const rawModel = typeof model.GetRawRoot === "function" ? model.GetRawRoot() : model;
    switch (this.#currentLod) {
      case 0:
        if (this.highDetailProxy) {
          this.highDetailProxy.SetObjectFromBuilder(rawModel);
          return;
        }
      // Intentional native fallthrough when a selected proxy is absent.
      case 1:
        if (this.mediumDetailProxy) {
          this.mediumDetailProxy.SetObjectFromBuilder(rawModel);
          return;
        }
      // Intentional native fallthrough when a selected proxy is absent.
      case 2:
        if (this.lowDetailProxy) {
          this.lowDetailProxy.SetObjectFromBuilder(rawModel);
          return;
        }
    }
  }
}
function SetProxyObject(proxy, model) {
  if (!proxy || model === null || model === undefined) {
    return;
  }
  proxy.SetObject(typeof model.GetRawRoot === "function" ? model.GetRawRoot() : model);
}

export { Tr2SkinnedObjectLod };
//# sourceMappingURL=Tr2SkinnedObjectLod.js.map
