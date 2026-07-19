import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/core-types/schema';
import { CjsModel } from '@carbonenginejs/core-types/model';

let _initClass, _init_path, _init_extra_path;

/** Tr2TexturePipelineStepLoad (resources) - maintained from schema shapeHash 8f11e264.... */
let _Tr2TexturePipelineSt;
class Tr2TexturePipelineStepLoad extends CjsModel {
  static {
    ({
      e: [_init_path, _init_extra_path],
      c: [_Tr2TexturePipelineSt, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2TexturePipelineStepLoad",
      family: "resources"
    })], [[[io, io.persist, type, type.string], 16, "path"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_path(this);
  }
  /** m_path (std::wstring) [READWRITE, PERSIST] */
  path = _init_path(this, "");
  static {
    _initClass();
  }
}

export { _Tr2TexturePipelineSt as Tr2TexturePipelineStepLoad };
//# sourceMappingURL=Tr2TexturePipelineStepLoad.js.map
