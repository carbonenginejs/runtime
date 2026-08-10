import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { Tr2RenderContext as _Tr2RenderContext } from '../../core/context/Tr2RenderContext.js';

let _initClass, _init_name, _init_extra_name, _init_addressU, _init_extra_addressU, _init_addressV, _init_extra_addressV, _init_addressW, _init_extra_addressW, _init_filter, _init_extra_filter, _init_mipFilter, _init_extra_mipFilter, _init_lodBias, _init_extra_lodBias, _init_maxMipLevel, _init_extra_maxMipLevel, _init_maxAnisotropy, _init_extra_maxAnisotropy;

/** Tr2SamplerOverride (shader) - generated from schema shapeHash b3478476.... */
let _Tr2SamplerOverride;
new class extends _identity {
  static [class Tr2SamplerOverride extends CjsModel {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_addressU, _init_extra_addressU, _init_addressV, _init_extra_addressV, _init_addressW, _init_extra_addressW, _init_filter, _init_extra_filter, _init_mipFilter, _init_extra_mipFilter, _init_lodBias, _init_extra_lodBias, _init_maxMipLevel, _init_extra_maxMipLevel, _init_maxAnisotropy, _init_extra_maxAnisotropy],
        c: [_Tr2SamplerOverride, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2SamplerOverride",
        family: "shader"
      })], [[[void 0, io.rebuild("bindings"), io, io.persist, type, type.string], 16, "name"], [[void 0, io.rebuild("bindings"), io, io.persist, type, type.int32, void 0, type.enum("TextureAddressMode")], 16, "addressU"], [[void 0, io.rebuild("bindings"), io, io.persist, type, type.int32, void 0, type.enum("TextureAddressMode")], 16, "addressV"], [[void 0, io.rebuild("bindings"), io, io.persist, type, type.int32, void 0, type.enum("TextureAddressMode")], 16, "addressW"], [[void 0, io.rebuild("bindings"), io, io.persist, type, type.int32, void 0, type.enum("TextureFilter")], 16, "filter"], [[void 0, io.rebuild("bindings"), io, io.persist, type, type.int32, void 0, type.enum("TextureFilter")], 16, "mipFilter"], [[void 0, io.rebuild("bindings"), io, io.persist, type, type.float32], 16, "lodBias"], [[void 0, io.rebuild("bindings"), io, io.persist, type, type.uint32], 16, "maxMipLevel"], [[void 0, io.rebuild("bindings"), io, io.persist, type, type.uint32], 16, "maxAnisotropy"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_maxAnisotropy(this);
    }
    /** name (BlueSharedString) */
    name = _init_name(this, "");

    /** addressU (Tr2RenderContextEnum::TextureAddressMode - enum Tr2RenderContextEnum) */
    addressU = (_init_extra_name(this), _init_addressU(this, 1));

    /** addressV (Tr2RenderContextEnum::TextureAddressMode - enum Tr2RenderContextEnum) */
    addressV = (_init_extra_addressU(this), _init_addressV(this, 1));

    /** addressW (Tr2RenderContextEnum::TextureAddressMode - enum Tr2RenderContextEnum) */
    addressW = (_init_extra_addressV(this), _init_addressW(this, 1));

    /** filter (Tr2RenderContextEnum::TextureFilter) */
    filter = (_init_extra_addressW(this), _init_filter(this, 2));

    /** mipFilter (Tr2RenderContextEnum::TextureFilter) */
    mipFilter = (_init_extra_filter(this), _init_mipFilter(this, 2));

    /** lodBias (float) */
    lodBias = (_init_extra_mipFilter(this), _init_lodBias(this, 0));

    /** maxMipLevel (uint32_t) */
    maxMipLevel = (_init_extra_lodBias(this), _init_maxMipLevel(this, 0));

    /** maxAnisotropy (uint32_t) */
    maxAnisotropy = (_init_extra_maxMipLevel(this), _init_maxAnisotropy(this, 4));
  }];
  TextureAddressMode = _Tr2RenderContext.TextureAddressMode;
  TextureFilter = _Tr2RenderContext.TextureFilter;
  constructor() {
    super(_Tr2SamplerOverride), _initClass();
  }
}();

export { _Tr2SamplerOverride as Tr2SamplerOverride };
//# sourceMappingURL=Tr2SamplerOverride.js.map
