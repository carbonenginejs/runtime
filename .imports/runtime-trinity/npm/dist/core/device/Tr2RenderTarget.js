import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { PixelFormat, TextureType } from '@carbonenginejs/runtime-utils/render-context';

let _initProto, _initClass, _init_name, _init_extra_name, _init_width, _init_extra_width, _init_height, _init_extra_height, _init_arraySize, _init_extra_arraySize, _init_mipCount, _init_extra_mipCount, _init_multiSampleType, _init_extra_multiSampleType, _init_multiSampleQuality, _init_extra_multiSampleQuality, _init_format, _init_extra_format, _init_type, _init_extra_type, _init_isValid, _init_extra_isValid, _init_isReadable, _init_extra_isReadable;

/** Tr2RenderTarget (trinityCore) - generated from schema shapeHash dc39c914.... */
let _Tr2RenderTarget;
new class extends _identity {
  static [class Tr2RenderTarget extends CjsModel {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_width, _init_extra_width, _init_height, _init_extra_height, _init_arraySize, _init_extra_arraySize, _init_mipCount, _init_extra_mipCount, _init_multiSampleType, _init_extra_multiSampleType, _init_multiSampleQuality, _init_extra_multiSampleQuality, _init_format, _init_extra_format, _init_type, _init_extra_type, _init_isValid, _init_extra_isValid, _init_isReadable, _init_extra_isReadable, _initProto],
        c: [_Tr2RenderTarget, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2RenderTarget",
        family: "trinityCore"
      })], [[[io, io.persistOnly, type, type.string], 16, "name"], [[io, io.read, type, type.uint32], 16, "width"], [[io, io.read, type, type.uint32], 16, "height"], [[io, io.read, type, type.uint32], 16, "arraySize"], [[io, io.read, type, type.uint32], 16, "mipCount"], [[io, io.read, type, type.uint32], 16, "multiSampleType"], [[io, io.read, type, type.uint32], 16, "multiSampleQuality"], [[io, io.read, type, type.int32, void 0, type.enum("PixelFormat")], 16, "format"], [[io, io.read, type, type.int32, void 0, type.enum("TextureType")], 16, "type"], [[io, io.read, type, type.boolean], 16, "isValid"], [[io, io.read, type, type.boolean], 16, "isReadable"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "__init__"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "Create"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "CreateArray"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GenerateMipMaps"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "Resolve"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "HasALObject"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "sharedHandle"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_isReadable(this);
    }
    /** m_name (std::string) [PERSISTONLY] */
    name = (_initProto(this), _init_name(this, ""));
    width = (_init_extra_name(this), _init_width(this, 0));
    height = (_init_extra_width(this), _init_height(this, 0));
    arraySize = (_init_extra_height(this), _init_arraySize(this, 0));
    mipCount = (_init_extra_arraySize(this), _init_mipCount(this, 0));
    multiSampleType = (_init_extra_mipCount(this), _init_multiSampleType(this, 0));
    multiSampleQuality = (_init_extra_multiSampleType(this), _init_multiSampleQuality(this, 0));
    format = (_init_extra_multiSampleQuality(this), _init_format(this, 0));
    type = (_init_extra_format(this), _init_type(this, 6));
    isValid = (_init_extra_type(this), _init_isValid(this, false));
    isReadable = (_init_extra_isValid(this), _init_isReadable(this, false));

    /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
    __init__(...args) {
      throw new Error("Tr2RenderTarget.__init__ is not implemented in CarbonEngineJS.");
    }

    /** Carbon method Create (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
    Create(...args) {
      throw new Error("Tr2RenderTarget.Create is not implemented in CarbonEngineJS.");
    }

    /** Carbon method CreateArray -> Create (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
    CreateArray(...args) {
      throw new Error("Tr2RenderTarget.CreateArray is not implemented in CarbonEngineJS.");
    }

    /** Carbon method GenerateMipMaps (MAP_METHOD_AND_WRAP). */
    GenerateMipMaps(...args) {
      throw new Error("Tr2RenderTarget.GenerateMipMaps is not implemented in CarbonEngineJS.");
    }

    /** Carbon method Resolve (MAP_METHOD_AND_WRAP). */
    Resolve(...args) {
      throw new Error("Tr2RenderTarget.Resolve is not implemented in CarbonEngineJS.");
    }

    /** Carbon method HasALObject (MAP_METHOD_AND_WRAP). */
    HasALObject(...args) {
      throw new Error("Tr2RenderTarget.HasALObject is not implemented in CarbonEngineJS.");
    }

    /** Carbon method sharedHandle -> GetSharedHandle (MAP_METHOD_AND_WRAP). */
    sharedHandle(...args) {
      throw new Error("Tr2RenderTarget.sharedHandle is not implemented in CarbonEngineJS.");
    }
  }];
  PixelFormat = PixelFormat;
  TextureType = TextureType;
  constructor() {
    super(_Tr2RenderTarget), _initClass();
  }
}();

export { _Tr2RenderTarget as Tr2RenderTarget };
//# sourceMappingURL=Tr2RenderTarget.js.map
