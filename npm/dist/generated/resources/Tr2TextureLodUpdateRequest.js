import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/core-types/schema';
import { CjsModel } from '@carbonenginejs/core-types/model';

let _initClass, _init_frameNumber, _init_extra_frameNumber, _init_mipChange, _init_extra_mipChange, _init_cachedInRam, _init_extra_cachedInRam;

/** Tr2TextureLodUpdateRequest (resources) - generated from schema shapeHash 7cfa47a1.... */
let _Tr2TextureLodUpdateR;
class Tr2TextureLodUpdateRequest extends CjsModel {
  static {
    ({
      e: [_init_frameNumber, _init_extra_frameNumber, _init_mipChange, _init_extra_mipChange, _init_cachedInRam, _init_extra_cachedInRam],
      c: [_Tr2TextureLodUpdateR, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2TextureLodUpdateRequest",
      family: "resources"
    })], [[[type, type.uint64], 16, "frameNumber"], [[type, type.int32], 16, "mipChange"], [[type, type.boolean], 16, "cachedInRam"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_cachedInRam(this);
  }
  /** frameNumber (uint64_t) */
  frameNumber = _init_frameNumber(this, 0);

  /** mipChange (int32_t) */
  mipChange = (_init_extra_frameNumber(this), _init_mipChange(this, 0));

  /** cachedInRam (bool) */
  cachedInRam = (_init_extra_mipChange(this), _init_cachedInRam(this, false));
  static {
    _initClass();
  }
}

export { _Tr2TextureLodUpdateR as Tr2TextureLodUpdateRequest };
//# sourceMappingURL=Tr2TextureLodUpdateRequest.js.map
