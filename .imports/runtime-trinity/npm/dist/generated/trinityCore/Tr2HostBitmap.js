import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { PixelFormat } from '@carbonenginejs/runtime-utils/render-context';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_format, _init_extra_format, _init_width, _init_extra_width, _init_height, _init_extra_height, _init_mipCount, _init_extra_mipCount, _init_imageType, _init_extra_imageType, _init_name, _init_extra_name;

/** Tr2HostBitmap (trinityCore) - generated from schema shapeHash fee9dda7.... */
let _Tr2HostBitmap;
new class extends _identity {
  static [class Tr2HostBitmap extends CjsModel {
    static {
      ({
        e: [_init_format, _init_extra_format, _init_width, _init_extra_width, _init_height, _init_extra_height, _init_mipCount, _init_extra_mipCount, _init_imageType, _init_extra_imageType, _init_name, _init_extra_name, _initProto],
        c: [_Tr2HostBitmap, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2HostBitmap",
        family: "trinityCore"
      })], [[[io, io.read, type, type.int32, void 0, type.enum("PixelFormat")], 16, "format"], [[io, io.read, type, type.uint32], 16, "width"], [[io, io.read, type, type.uint32], 16, "height"], [[io, io.read, type, type.uint32], 16, "mipCount"], [[io, io.read, type, type.int32, void 0, type.enum("TextureType")], 16, "imageType"], [[io, io.persist, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "CreateVolume"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "Create"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "CreateCube"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "PopulateMargin"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "SaveAsync"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "WaitForSave"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "ChangeFormat"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "Compress"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "SetMipRawData"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "CopyFaceFromRenderTarget"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "CopyFromRenderTargetRegion"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "CopyFromRenderTarget"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "CopyFromTextureRes"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "CountPixelsOfValue"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "CreateFromHeightData"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "Crop"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "IsSaveSucceeded"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "Downsample2x2"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "__init__"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "IsSaveCompleted"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "IsSaving"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "IsValid"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "IsCompressed"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "IsMonochrome"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetMipRawData"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetRawData"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "Save"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "ConvertToVolume"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_name(this);
    }
    /** m_format (unknown) [READ] */
    format = (_initProto(this), _init_format(this, 0));

    /** m_width (unknown) [READ] */
    width = (_init_extra_format(this), _init_width(this, 0));

    /** m_height (unknown) [READ] */
    height = (_init_extra_width(this), _init_height(this, 0));

    /** m_mipCount (unknown) [READ] */
    mipCount = (_init_extra_height(this), _init_mipCount(this, 0));

    /** m_type (unknown) [READ] */
    imageType = (_init_extra_mipCount(this), _init_imageType(this, 6));

    /** m_name (unknown) [READWRITE, PERSIST] */
    name = (_init_extra_imageType(this), _init_name(this, ""));

    /** Carbon method CreateVolume (MAP_METHOD_AND_WRAP). */
    CreateVolume(...args) {
      throw new Error("Tr2HostBitmap.CreateVolume is not implemented in CarbonEngineJS.");
    }

    /** Carbon method Create (MAP_METHOD_AND_WRAP). */
    Create(...args) {
      throw new Error("Tr2HostBitmap.Create is not implemented in CarbonEngineJS.");
    }

    /** Carbon method CreateCube (MAP_METHOD_AND_WRAP). */
    CreateCube(...args) {
      throw new Error("Tr2HostBitmap.CreateCube is not implemented in CarbonEngineJS.");
    }

    /** Carbon method PopulateMargin (MAP_METHOD_AND_WRAP). */
    PopulateMargin(...args) {
      throw new Error("Tr2HostBitmap.PopulateMargin is not implemented in CarbonEngineJS.");
    }

    /** Carbon method SaveAsync -> PySaveAsync (MAP_METHOD). */
    SaveAsync(...args) {
      throw new Error("Tr2HostBitmap.SaveAsync is not implemented in CarbonEngineJS.");
    }

    /** Carbon method WaitForSave (MAP_METHOD_AND_WRAP). */
    WaitForSave(...args) {
      throw new Error("Tr2HostBitmap.WaitForSave is not implemented in CarbonEngineJS.");
    }

    /** Carbon method ChangeFormat -> ChangeFormatFromScript (MAP_METHOD_AND_WRAP). */
    ChangeFormat(...args) {
      throw new Error("Tr2HostBitmap.ChangeFormat is not implemented in CarbonEngineJS.");
    }

    /** Carbon method Compress (MAP_METHOD_AND_WRAP). */
    Compress(...args) {
      throw new Error("Tr2HostBitmap.Compress is not implemented in CarbonEngineJS.");
    }

    /** Carbon method SetMipRawData -> PySetMipRawData (MAP_METHOD). */
    SetMipRawData(...args) {
      throw new Error("Tr2HostBitmap.SetMipRawData is not implemented in CarbonEngineJS.");
    }

    /** Carbon method CopyFaceFromRenderTarget -> CopyFaceFromRenderTargetPython (MAP_METHOD_AND_WRAP). */
    CopyFaceFromRenderTarget(...args) {
      throw new Error("Tr2HostBitmap.CopyFaceFromRenderTarget is not implemented in CarbonEngineJS.");
    }

    /** Carbon method CopyFromRenderTargetRegion -> CopyFromRenderTargetRegionPython (MAP_METHOD_AND_WRAP). */
    CopyFromRenderTargetRegion(...args) {
      throw new Error("Tr2HostBitmap.CopyFromRenderTargetRegion is not implemented in CarbonEngineJS.");
    }

    /** Carbon method CopyFromRenderTarget -> CopyFromRenderTargetPython (MAP_METHOD_AND_WRAP). */
    CopyFromRenderTarget(...args) {
      throw new Error("Tr2HostBitmap.CopyFromRenderTarget is not implemented in CarbonEngineJS.");
    }

    /** Carbon method CopyFromTextureRes -> CopyFromTextureResPython (MAP_METHOD_AND_WRAP). */
    CopyFromTextureRes(...args) {
      throw new Error("Tr2HostBitmap.CopyFromTextureRes is not implemented in CarbonEngineJS.");
    }

    /** Carbon method CountPixelsOfValue (MAP_METHOD_AND_WRAP). */
    CountPixelsOfValue(...args) {
      throw new Error("Tr2HostBitmap.CountPixelsOfValue is not implemented in CarbonEngineJS.");
    }

    /** Carbon method CreateFromHeightData (MAP_METHOD_AND_WRAP). */
    CreateFromHeightData(...args) {
      throw new Error("Tr2HostBitmap.CreateFromHeightData is not implemented in CarbonEngineJS.");
    }

    /** Carbon method Crop (MAP_METHOD_AND_WRAP). */
    Crop(...args) {
      throw new Error("Tr2HostBitmap.Crop is not implemented in CarbonEngineJS.");
    }

    /** Carbon method IsSaveSucceeded (MAP_METHOD_AND_WRAP). */
    IsSaveSucceeded(...args) {
      throw new Error("Tr2HostBitmap.IsSaveSucceeded is not implemented in CarbonEngineJS.");
    }

    /** Carbon method Downsample2x2 (MAP_METHOD_AND_WRAP). */
    Downsample2x2(...args) {
      throw new Error("Tr2HostBitmap.Downsample2x2 is not implemented in CarbonEngineJS.");
    }

    /** Carbon method __init__ -> PyInit (MAP_METHOD). */
    __init__(...args) {
      throw new Error("Tr2HostBitmap.__init__ is not implemented in CarbonEngineJS.");
    }

    /** Carbon method IsSaveCompleted (MAP_METHOD_AND_WRAP). */
    IsSaveCompleted(...args) {
      throw new Error("Tr2HostBitmap.IsSaveCompleted is not implemented in CarbonEngineJS.");
    }

    /** Carbon method IsSaving (MAP_METHOD_AND_WRAP). */
    IsSaving(...args) {
      throw new Error("Tr2HostBitmap.IsSaving is not implemented in CarbonEngineJS.");
    }

    /** Carbon method IsValid (MAP_METHOD_AND_WRAP). */
    IsValid(...args) {
      throw new Error("Tr2HostBitmap.IsValid is not implemented in CarbonEngineJS.");
    }

    /** Carbon method IsCompressed (MAP_METHOD_AND_WRAP). */
    IsCompressed(...args) {
      throw new Error("Tr2HostBitmap.IsCompressed is not implemented in CarbonEngineJS.");
    }

    /** Carbon method IsMonochrome (MAP_METHOD_AND_WRAP). */
    IsMonochrome(...args) {
      throw new Error("Tr2HostBitmap.IsMonochrome is not implemented in CarbonEngineJS.");
    }

    /** Carbon method GetMipRawData -> PyGetMipRawData (MAP_METHOD). */
    GetMipRawData(...args) {
      throw new Error("Tr2HostBitmap.GetMipRawData is not implemented in CarbonEngineJS.");
    }

    /** Carbon method GetRawData -> PyGetRawData (MAP_METHOD). */
    GetRawData(...args) {
      throw new Error("Tr2HostBitmap.GetRawData is not implemented in CarbonEngineJS.");
    }

    /** Carbon method Save -> PySave (MAP_METHOD). */
    Save(...args) {
      throw new Error("Tr2HostBitmap.Save is not implemented in CarbonEngineJS.");
    }

    /** Carbon method ConvertToVolume (MAP_METHOD_AND_WRAP). */
    ConvertToVolume(...args) {
      throw new Error("Tr2HostBitmap.ConvertToVolume is not implemented in CarbonEngineJS.");
    }
  }];
  PixelFormat = PixelFormat;
  TextureType = Object.freeze({
    TEX_TYPE_1D: 1,
    TEX_TYPE_2D: 2,
    TEX_TYPE_3D: 3,
    TEX_TYPE_CUBE: 4,
    TEX_TYPE_TYPELESS: 5,
    TEX_TYPE_INVALID: 6
  });
  constructor() {
    super(_Tr2HostBitmap), _initClass();
  }
}();

export { _Tr2HostBitmap as Tr2HostBitmap };
//# sourceMappingURL=Tr2HostBitmap.js.map
