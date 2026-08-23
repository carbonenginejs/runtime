import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { PixelFormat } from '@carbonenginejs/runtime-utils/render-context';

let _initProto, _initClass, _init_format, _init_extra_format, _init_mipCount, _init_extra_mipCount, _init_height, _init_extra_height, _init_paintEmptyAreas, _init_extra_paintEmptyAreas, _init_optimizeOnRemoval, _init_extra_optimizeOnRemoval, _init_margin, _init_extra_margin, _init_width, _init_extra_width;

/** Tr2TextureAtlas (trinityCore) - generated from schema shapeHash 5855bcfc.... */
let _Tr2TextureAtlas;
new class extends _identity {
  static [class Tr2TextureAtlas extends CjsModel {
    static {
      ({
        e: [_init_format, _init_extra_format, _init_mipCount, _init_extra_mipCount, _init_height, _init_extra_height, _init_paintEmptyAreas, _init_extra_paintEmptyAreas, _init_optimizeOnRemoval, _init_extra_optimizeOnRemoval, _init_margin, _init_extra_margin, _init_width, _init_extra_width, _initProto],
        c: [_Tr2TextureAtlas, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2TextureAtlas",
        family: "trinityCore"
      })], [[[io, io.read, type, type.int32, void 0, type.enum("PixelFormat")], 16, "format"], [[io, io.read, type, type.uint32], 16, "mipCount"], [[io, io.read, type, type.uint32], 16, "height"], [[io, io.readwrite, type, type.boolean], 16, "paintEmptyAreas"], [[io, io.readwrite, type, type.boolean], 16, "optimizeOnRemoval"], [[io, io.readwrite, type, type.uint32], 16, "margin"], [[io, io.read, type, type.uint32], 16, "width"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "CreateTexture"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "CollapseFreeAreas"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "EjectAllTextures"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetFreeMaxHeight"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetFreeMaxWidth"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetFreeTexels"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "PullInOutsiders"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetFreeTexelPercentage"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetTexturesOutsideAtlas"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "HasALObject"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "ConsolidateFreeAreas"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_width(this);
    }
    /** m_format (Tr2RenderContextEnum::PixelFormat - enum PixelFormat) [READ, ENUM] */
    format = (_initProto(this), _init_format(this, 87));

    /** m_mipLevels (unsigned) [READ] */
    mipCount = (_init_extra_format(this), _init_mipCount(this, 0));

    /** m_height (unsigned int) [READ] */
    height = (_init_extra_mipCount(this), _init_height(this, 2048));

    /** m_paintEmptyAreas (bool) [READWRITE] */
    paintEmptyAreas = (_init_extra_height(this), _init_paintEmptyAreas(this, false));

    /** m_optimizeOnRemoval (bool) [READWRITE] */
    optimizeOnRemoval = (_init_extra_paintEmptyAreas(this), _init_optimizeOnRemoval(this, true));

    /** m_margin (unsigned int) [READWRITE] */
    margin = (_init_extra_optimizeOnRemoval(this), _init_margin(this, 2));

    /** m_width (unsigned int) [READ] */
    width = (_init_extra_margin(this), _init_width(this, 2048));

    /** Carbon method CreateTexture (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
    CreateTexture(...args) {
      throw new Error("Tr2TextureAtlas.CreateTexture is not implemented in CarbonEngineJS.");
    }

    /** Carbon method CollapseFreeAreas (MAP_METHOD_AND_WRAP). */
    CollapseFreeAreas(...args) {
      throw new Error("Tr2TextureAtlas.CollapseFreeAreas is not implemented in CarbonEngineJS.");
    }

    /** Carbon method EjectAllTextures (MAP_METHOD_AND_WRAP). */
    EjectAllTextures(...args) {
      throw new Error("Tr2TextureAtlas.EjectAllTextures is not implemented in CarbonEngineJS.");
    }

    /** Carbon method GetFreeMaxHeight (MAP_METHOD_AND_WRAP). */
    GetFreeMaxHeight(...args) {
      throw new Error("Tr2TextureAtlas.GetFreeMaxHeight is not implemented in CarbonEngineJS.");
    }

    /** Carbon method GetFreeMaxWidth (MAP_METHOD_AND_WRAP). */
    GetFreeMaxWidth(...args) {
      throw new Error("Tr2TextureAtlas.GetFreeMaxWidth is not implemented in CarbonEngineJS.");
    }

    /** Carbon method GetFreeTexels (MAP_METHOD_AND_WRAP). */
    GetFreeTexels(...args) {
      throw new Error("Tr2TextureAtlas.GetFreeTexels is not implemented in CarbonEngineJS.");
    }

    /** Carbon method PullInOutsiders (MAP_METHOD_AND_WRAP). */
    PullInOutsiders(...args) {
      throw new Error("Tr2TextureAtlas.PullInOutsiders is not implemented in CarbonEngineJS.");
    }

    /** Carbon method GetFreeTexelPercentage (MAP_METHOD_AND_WRAP). */
    GetFreeTexelPercentage(...args) {
      throw new Error("Tr2TextureAtlas.GetFreeTexelPercentage is not implemented in CarbonEngineJS.");
    }

    /** Carbon method GetTexturesOutsideAtlas (MAP_METHOD_AND_WRAP). */
    GetTexturesOutsideAtlas(...args) {
      throw new Error("Tr2TextureAtlas.GetTexturesOutsideAtlas is not implemented in CarbonEngineJS.");
    }

    /** Carbon method HasALObject (MAP_METHOD_AND_WRAP). */
    HasALObject(...args) {
      throw new Error("Tr2TextureAtlas.HasALObject is not implemented in CarbonEngineJS.");
    }

    /** Carbon method ConsolidateFreeAreas (MAP_METHOD_AND_WRAP). */
    ConsolidateFreeAreas(...args) {
      throw new Error("Tr2TextureAtlas.ConsolidateFreeAreas is not implemented in CarbonEngineJS.");
    }
  }];
  AtlasTextureType = Object.freeze({
    ATT_DEFAULT: 0,
    ATT_VIDEO: 1
  });
  PixelFormat = PixelFormat;
  constructor() {
    super(_Tr2TextureAtlas), _initClass();
  }
}();

export { _Tr2TextureAtlas as Tr2TextureAtlas };
//# sourceMappingURL=Tr2TextureAtlas.js.map
