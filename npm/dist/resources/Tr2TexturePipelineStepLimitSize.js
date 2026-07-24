import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_maxHeight, _init_extra_maxHeight, _init_maxWidth, _init_extra_maxWidth;

/** Tr2TexturePipelineStepLimitSize (resources) - maintained from schema shapeHash 9e97efed.... */
let _Tr2TexturePipelineSt;
class Tr2TexturePipelineStepLimitSize extends CjsModel {
  static {
    ({
      e: [_init_maxHeight, _init_extra_maxHeight, _init_maxWidth, _init_extra_maxWidth],
      c: [_Tr2TexturePipelineSt, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2TexturePipelineStepLimitSize",
      family: "resources"
    })], [[[io, io.persist, type, type.uint32], 16, "maxHeight"], [[io, io.persist, type, type.uint32], 16, "maxWidth"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_maxWidth(this);
  }
  /** m_maxHeight (uint32_t) [READWRITE, PERSIST] */
  maxHeight = _init_maxHeight(this, 0);

  /** m_maxWidth (uint32_t) [READWRITE, PERSIST] */
  maxWidth = (_init_extra_maxHeight(this), _init_maxWidth(this, 0));
  static {
    _initClass();
  }
}

export { _Tr2TexturePipelineSt as Tr2TexturePipelineStepLimitSize };
//# sourceMappingURL=Tr2TexturePipelineStepLimitSize.js.map
