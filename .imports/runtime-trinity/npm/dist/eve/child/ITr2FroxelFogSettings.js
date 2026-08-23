import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { EveChildTransform as _EveChildTransform } from './EveChildTransform.js';

let _initProto, _initClass;

/**
 * Nominal Carbon froxel-fog component contract.
 *
 * Carbon combines this interface with Eve child classes through multiple
 * inheritance. JavaScript flattens that single live implementation path onto
 * EveChildTransform so registry composition can validate the owned identity
 * once and hot paths can call it directly.
 */
let _ITr2FroxelFogSetting;
class ITr2FroxelFogSettings extends _EveChildTransform {
  static {
    ({
      e: [_initProto],
      c: [_ITr2FroxelFogSetting, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "ITr2FroxelFogSettings",
      family: "trinityCore"
    })], [[[carbon, carbon.method, impl, impl.notImplemented], 18, "GetFroxelFogSettings"]], 0, void 0, _EveChildTransform));
  }
  constructor(...args) {
    super(...args);
    _initProto(this);
  }
  /** Returns the provider's stable FroxelFogSettings value record. */
  GetFroxelFogSettings() {
    throw new Error("ITr2FroxelFogSettings.GetFroxelFogSettings must be implemented by a froxel-fog component.");
  }
  static {
    _initClass();
  }
}

export { _ITr2FroxelFogSetting as ITr2FroxelFogSettings };
//# sourceMappingURL=ITr2FroxelFogSettings.js.map
