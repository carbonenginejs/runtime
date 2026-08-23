import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_registerIndex, _init_extra_registerIndex, _init_sampler, _init_extra_sampler;

/** Tr2SamplerOverrideData (shader) - generated from schema shapeHash 0adbde3e.... */
let _Tr2SamplerOverrideDa;
class Tr2SamplerOverrideData extends CjsModel {
  static {
    ({
      e: [_init_registerIndex, _init_extra_registerIndex, _init_sampler, _init_extra_sampler],
      c: [_Tr2SamplerOverrideDa, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2SamplerOverrideData",
      family: "shader"
    })], [[[type, type.uint32], 16, "registerIndex"], [type.rawStruct("Tr2SamplerStateAL"), 0, "sampler"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_sampler(this);
  }
  /** registerIndex (uint32_t) */
  registerIndex = _init_registerIndex(this, 0);

  /** sampler (Tr2SamplerStateAL) */
  sampler = (_init_extra_registerIndex(this), _init_sampler(this, null));
  static {
    _initClass();
  }
}

export { _Tr2SamplerOverrideDa as Tr2SamplerOverrideData };
//# sourceMappingURL=Tr2SamplerOverrideData.js.map
