import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, schema } from '@carbonenginejs/core-types/schema';
import { CjsModel } from '@carbonenginejs/core-types/model';

let _initClass, _init_format, _init_extra_format, _init_a, _init_extra_a, _init_b, _init_extra_b, _init_g, _init_extra_g, _init_r, _init_extra_r;

/** Tr2TexturePipelineStepPack (resources) - maintained from schema shapeHash 3efe48d4.... */
let _Tr2TexturePipelineSt;
class Tr2TexturePipelineStepPack extends CjsModel {
  static {
    ({
      e: [_init_format, _init_extra_format, _init_a, _init_extra_a, _init_b, _init_extra_b, _init_g, _init_extra_g, _init_r, _init_extra_r],
      c: [_Tr2TexturePipelineSt, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2TexturePipelineStepPack",
      family: "resources"
    })], [[[io, io.persist, type, type.int32, void 0, schema.enum("PixelFormat")], 16, "format"], [[io, io.persist, void 0, type.objectRef("Tr2TexturePackChannel")], 16, "a"], [[io, io.persist, void 0, type.objectRef("Tr2TexturePackChannel")], 16, "b"], [[io, io.persist, void 0, type.objectRef("Tr2TexturePackChannel")], 16, "g"], [[io, io.persist, void 0, type.objectRef("Tr2TexturePackChannel")], 16, "r"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_r(this);
  }
  /** m_format (Tr2RenderContextEnum::PixelFormat - enum PixelFormat) [READWRITE, PERSIST, ENUM] */
  format = _init_format(this, 87);

  /** m_a (PTr2TexturePackChannel) [READ, PERSIST] */
  a = (_init_extra_format(this), _init_a(this, null));

  /** m_b (PTr2TexturePackChannel) [READ, PERSIST] */
  b = (_init_extra_a(this), _init_b(this, null));

  /** m_g (PTr2TexturePackChannel) [READ, PERSIST] */
  g = (_init_extra_b(this), _init_g(this, null));

  /** m_r (PTr2TexturePackChannel) [READ, PERSIST] */
  r = (_init_extra_g(this), _init_r(this, null));
  static {
    _initClass();
  }
}

export { _Tr2TexturePipelineSt as Tr2TexturePipelineStepPack };
//# sourceMappingURL=Tr2TexturePipelineStepPack.js.map
