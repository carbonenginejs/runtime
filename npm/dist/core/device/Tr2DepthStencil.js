import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { DepthStencilFormat } from '@carbonenginejs/runtime-utils/render-context';

let _initProto, _initClass, _init_name, _init_extra_name, _init_width, _init_extra_width, _init_height, _init_extra_height, _init_multiSampleType, _init_extra_multiSampleType, _init_multiSampleQuality, _init_extra_multiSampleQuality, _init_mipCount, _init_extra_mipCount, _init_format, _init_extra_format, _init_isValid, _init_extra_isValid, _init_isReadable, _init_extra_isReadable;

/** Tr2DepthStencil (trinityCore) - generated from schema shapeHash 9acb2c99.... */
let _Tr2DepthStencil;
new class extends _identity {
  static [class Tr2DepthStencil extends CjsModel {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_width, _init_extra_width, _init_height, _init_extra_height, _init_multiSampleType, _init_extra_multiSampleType, _init_multiSampleQuality, _init_extra_multiSampleQuality, _init_mipCount, _init_extra_mipCount, _init_format, _init_extra_format, _init_isValid, _init_extra_isValid, _init_isReadable, _init_extra_isReadable, _initProto],
        c: [_Tr2DepthStencil, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2DepthStencil",
        family: "trinityCore"
      })], [[[io, io.persistOnly, type, type.string], 16, "name"], [[io, io.read, type, type.uint32], 16, "width"], [[io, io.read, type, type.uint32], 16, "height"], [[io, io.read, type, type.uint32], 16, "multiSampleType"], [[io, io.read, type, type.uint32], 16, "multiSampleQuality"], [[io, io.read, type, type.uint32], 16, "mipCount"], [[io, io.read, type, type.int32, void 0, schema.enum("DepthStencilFormat")], 16, "format"], [[io, io.read, type, type.boolean], 16, "isValid"], [[io, io.read, type, type.boolean], 16, "isReadable"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "__init__"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "Create"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "HasALObject"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "sharedHandle"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_isReadable(this);
    }
    /** m_name (std::string) [PERSISTONLY] */
    name = (_initProto(this), _init_name(this, ""));
    width = (_init_extra_name(this), _init_width(this, 0));
    height = (_init_extra_width(this), _init_height(this, 0));
    multiSampleType = (_init_extra_height(this), _init_multiSampleType(this, 0));
    multiSampleQuality = (_init_extra_multiSampleType(this), _init_multiSampleQuality(this, 0));
    mipCount = (_init_extra_multiSampleQuality(this), _init_mipCount(this, 0));
    format = (_init_extra_mipCount(this), _init_format(this, 7));
    isValid = (_init_extra_format(this), _init_isValid(this, false));
    isReadable = (_init_extra_isValid(this), _init_isReadable(this, false));

    /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
    __init__(...args) {
      throw new Error("Tr2DepthStencil.__init__ is not implemented in CarbonEngineJS.");
    }

    /** Carbon method Create (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
    Create(...args) {
      throw new Error("Tr2DepthStencil.Create is not implemented in CarbonEngineJS.");
    }

    /** Carbon method HasALObject (MAP_METHOD_AND_WRAP). */
    HasALObject(...args) {
      throw new Error("Tr2DepthStencil.HasALObject is not implemented in CarbonEngineJS.");
    }

    /** Carbon method sharedHandle -> GetSharedHandle (MAP_METHOD_AND_WRAP). */
    sharedHandle(...args) {
      throw new Error("Tr2DepthStencil.sharedHandle is not implemented in CarbonEngineJS.");
    }
  }];
  DepthStencilFormat = DepthStencilFormat;
  constructor() {
    super(_Tr2DepthStencil), _initClass();
  }
}();

export { _Tr2DepthStencil as Tr2DepthStencil };
//# sourceMappingURL=Tr2DepthStencil.js.map
