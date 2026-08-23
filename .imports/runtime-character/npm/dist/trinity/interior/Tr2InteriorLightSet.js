import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { Tr2InteriorPerObjectLightData as _Tr2InteriorPerObject } from './Tr2InteriorPerObjectLightData.js';

let _initProto, _initClass;

/** Transient collection of active interior light sources and packed records. */
let _Tr2InteriorLightSet;
class Tr2InteriorLightSet extends CjsModel {
  static {
    ({
      e: [_initProto],
      c: [_Tr2InteriorLightSet, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2InteriorLightSet",
      family: "interior"
    })], [[[carbon, carbon.method, impl, impl.implemented], 18, "AddLight"], [[carbon, carbon.method, impl, impl.implemented], 18, "Clear"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetNumOfActiveLights"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "PopulateLightData"]], 0, void 0, CjsModel));
  }
  #lightInstances = (_initProto(this), []);

  /** Adds one native light identity to the transient active-light set. */
  AddLight(lightSource, _viewPosition) {
    this.#lightInstances.push({
      lightSource,
      lightDataValid: false,
      lightData: new _Tr2InteriorPerObject()
    });
  }

  /** Clears every transient light instance. */
  Clear() {
    this.#lightInstances.length = 0;
  }

  /** Returns the source-backed active-light count. */
  GetNumOfActiveLights() {
    return this.#lightInstances.length;
  }

  /** Requires the maintained light-data population contract before it can run. */
  PopulateLightData(_perObjectPSData) {
    throw new Error("Tr2InteriorLightSet.PopulateLightData is not implemented in CarbonEngineJS.");
  }
  static {
    _initClass();
  }
}

export { _Tr2InteriorLightSet as Tr2InteriorLightSet };
//# sourceMappingURL=Tr2InteriorLightSet.js.map
