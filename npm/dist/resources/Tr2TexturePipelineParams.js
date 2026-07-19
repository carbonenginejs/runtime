import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/core-types/schema';
import { CjsModel } from '@carbonenginejs/core-types/model';

let _initClass, _init_maxWidth, _init_extra_maxWidth, _init_maxHeight, _init_extra_maxHeight;

/** Tr2TexturePipelineParams (resources) - maintained from schema shapeHash 36df8e41.... */
let _Tr2TexturePipelinePa;
class Tr2TexturePipelineParams extends CjsModel {
  static {
    ({
      e: [_init_maxWidth, _init_extra_maxWidth, _init_maxHeight, _init_extra_maxHeight],
      c: [_Tr2TexturePipelinePa, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2TexturePipelineParams",
      family: "resources"
    })], [[[type, type.uint32], 16, "maxWidth"], [[type, type.uint32], 16, "maxHeight"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_maxHeight(this);
  }
  /** maxWidth (uint32_t) */
  maxWidth = _init_maxWidth(this, 0);

  /** maxHeight (uint32_t) */
  maxHeight = (_init_extra_maxWidth(this), _init_maxHeight(this, 0));
  static {
    _initClass();
  }
}

export { _Tr2TexturePipelinePa as Tr2TexturePipelineParams };
//# sourceMappingURL=Tr2TexturePipelineParams.js.map
