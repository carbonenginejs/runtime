import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, schema } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_format, _init_extra_format, _init_b, _init_extra_b, _init_g, _init_extra_g, _init_r, _init_extra_r;

/** Tr2TexturePipelineStepCompress (resources) - maintained from schema shapeHash 4d367f1c.... */
let _Tr2TexturePipelineSt;
class Tr2TexturePipelineStepCompress extends CjsModel {
  static {
    ({
      e: [_init_format, _init_extra_format, _init_b, _init_extra_b, _init_g, _init_extra_g, _init_r, _init_extra_r],
      c: [_Tr2TexturePipelineSt, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2TexturePipelineStepCompress",
      family: "resources"
    })], [[[io, io.persist, type, type.int32, void 0, schema.enum("PixelFormat")], 16, "format"], [[io, io.persist, type, type.float32], 16, "b"], [[io, io.persist, type, type.float32], 16, "g"], [[io, io.persist, type, type.float32], 16, "r"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_r(this);
  }
  /** m_format (Tr2RenderContextEnum::PixelFormat - enum PixelFormat) [READWRITE, PERSIST, ENUM] */
  format = _init_format(this, 71);

  /** m_bWeight (float) [READWRITE, PERSIST] */
  b = (_init_extra_format(this), _init_b(this, 1));

  /** m_gWeight (float) [READWRITE, PERSIST] */
  g = (_init_extra_b(this), _init_g(this, 1));

  /** m_rWeight (float) [READWRITE, PERSIST] */
  r = (_init_extra_g(this), _init_r(this, 1));
  static {
    _initClass();
  }
}

export { _Tr2TexturePipelineSt as Tr2TexturePipelineStepCompress };
//# sourceMappingURL=Tr2TexturePipelineStepCompress.js.map
