// Source: trinity/trinity/Tr2HostBitmap.h
// Maintained promotion: native ImageIO storage replaces the generated model snapshots.
// Async saving and the explicit unimplemented Trinity methods remain unsupported.
import { CjsSchema, meta } from "#schema";
import { PixelFormat, TextureType } from "#consts/render-context";
import { HostBitmap } from "#imageio";

/** Describes a CPU-resident bitmap's dimensions, format, mip count, image type, and diagnostic name. */
export class Tr2HostBitmap extends HostBitmap
{

  /** Native bitmap format storage. */
  get format()
  {
    return this._format;
  }

  /** Native mip-zero width. */
  get width()
  {
    return this._width;
  }

  /** Native mip-zero height. */
  get height()
  {
    return this._height;
  }

  /** Native declared mip count. */
  get mipCount()
  {
    return this._mipCount;
  }

  /** Native texture dimensionality. */
  get imageType()
  {
    return this._type;
  }

  /** Native diagnostic name storage. */
  get name()
  {
    return this._name;
  }
  /** Sets the native diagnostic name. */
  set name(value)
  {
    this._name = value;
  }

  /** Carbon method CreateVolume (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  CreateVolume(...args)
  {
    throw new Error("Tr2HostBitmap.CreateVolume is not implemented in CarbonEngineJS.");
  }

  /** Carbon method Create (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  Create(...args)
  {
    throw new Error("Tr2HostBitmap.Create is not implemented in CarbonEngineJS.");
  }

  /** Carbon method CreateCube (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  CreateCube(...args)
  {
    throw new Error("Tr2HostBitmap.CreateCube is not implemented in CarbonEngineJS.");
  }

  /** Carbon method PopulateMargin (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  PopulateMargin(...args)
  {
    throw new Error("Tr2HostBitmap.PopulateMargin is not implemented in CarbonEngineJS.");
  }

  /** Carbon method SaveAsync -> PySaveAsync (MAP_METHOD). */
  @meta.blue.method
  @meta.notImplemented
  SaveAsync(...args)
  {
    throw new Error("Tr2HostBitmap.SaveAsync is not implemented in CarbonEngineJS.");
  }

  /** Carbon method WaitForSave (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  WaitForSave(...args)
  {
    throw new Error("Tr2HostBitmap.WaitForSave is not implemented in CarbonEngineJS.");
  }

  /** Carbon method ChangeFormat -> ChangeFormatFromScript (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  ChangeFormat(...args)
  {
    throw new Error("Tr2HostBitmap.ChangeFormat is not implemented in CarbonEngineJS.");
  }

  /** Carbon method Compress (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  Compress(...args)
  {
    throw new Error("Tr2HostBitmap.Compress is not implemented in CarbonEngineJS.");
  }

  /** Carbon method SetMipRawData -> PySetMipRawData (MAP_METHOD). */
  @meta.blue.method
  @meta.notImplemented
  SetMipRawData(...args)
  {
    throw new Error("Tr2HostBitmap.SetMipRawData is not implemented in CarbonEngineJS.");
  }

  /** Carbon method CopyFaceFromRenderTarget -> CopyFaceFromRenderTargetPython (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  CopyFaceFromRenderTarget(...args)
  {
    throw new Error("Tr2HostBitmap.CopyFaceFromRenderTarget is not implemented in CarbonEngineJS.");
  }

  /** Carbon method CopyFromRenderTargetRegion -> CopyFromRenderTargetRegionPython (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  CopyFromRenderTargetRegion(...args)
  {
    throw new Error("Tr2HostBitmap.CopyFromRenderTargetRegion is not implemented in CarbonEngineJS.");
  }

  /** Carbon method CopyFromRenderTarget -> CopyFromRenderTargetPython (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  CopyFromRenderTarget(...args)
  {
    throw new Error("Tr2HostBitmap.CopyFromRenderTarget is not implemented in CarbonEngineJS.");
  }

  /** Carbon method CopyFromTextureRes -> CopyFromTextureResPython (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  CopyFromTextureRes(...args)
  {
    throw new Error("Tr2HostBitmap.CopyFromTextureRes is not implemented in CarbonEngineJS.");
  }

  /** Carbon method CountPixelsOfValue (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  CountPixelsOfValue(...args)
  {
    throw new Error("Tr2HostBitmap.CountPixelsOfValue is not implemented in CarbonEngineJS.");
  }

  /** Carbon method CreateFromHeightData (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  CreateFromHeightData(...args)
  {
    throw new Error("Tr2HostBitmap.CreateFromHeightData is not implemented in CarbonEngineJS.");
  }

  /** Carbon method Crop (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  Crop(...args)
  {
    throw new Error("Tr2HostBitmap.Crop is not implemented in CarbonEngineJS.");
  }

  /** Carbon method IsSaveSucceeded (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  IsSaveSucceeded(...args)
  {
    throw new Error("Tr2HostBitmap.IsSaveSucceeded is not implemented in CarbonEngineJS.");
  }

  /** Carbon method Downsample2x2 (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  Downsample2x2(...args)
  {
    throw new Error("Tr2HostBitmap.Downsample2x2 is not implemented in CarbonEngineJS.");
  }

  /** Carbon method __init__ -> PyInit (MAP_METHOD). */
  @meta.blue.method
  @meta.notImplemented
  __init__(...args)
  {
    throw new Error("Tr2HostBitmap.__init__ is not implemented in CarbonEngineJS.");
  }

  /** Carbon method IsSaveCompleted (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  IsSaveCompleted(...args)
  {
    throw new Error("Tr2HostBitmap.IsSaveCompleted is not implemented in CarbonEngineJS.");
  }

  /** Carbon method IsSaving (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  IsSaving(...args)
  {
    throw new Error("Tr2HostBitmap.IsSaving is not implemented in CarbonEngineJS.");
  }

  /** Carbon method IsValid (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  IsValid(...args)
  {
    throw new Error("Tr2HostBitmap.IsValid is not implemented in CarbonEngineJS.");
  }

  /** Carbon method IsCompressed (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  IsCompressed(...args)
  {
    throw new Error("Tr2HostBitmap.IsCompressed is not implemented in CarbonEngineJS.");
  }

  /** Carbon method IsMonochrome (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  IsMonochrome(...args)
  {
    throw new Error("Tr2HostBitmap.IsMonochrome is not implemented in CarbonEngineJS.");
  }

  /** Carbon method GetMipRawData -> PyGetMipRawData (MAP_METHOD). */
  @meta.blue.method
  @meta.notImplemented
  GetMipRawData(...args)
  {
    throw new Error("Tr2HostBitmap.GetMipRawData is not implemented in CarbonEngineJS.");
  }

  /** Carbon method GetRawData -> PyGetRawData (MAP_METHOD). */
  @meta.blue.method
  @meta.notImplemented
  GetRawData(...args)
  {
    throw new Error("Tr2HostBitmap.GetRawData is not implemented in CarbonEngineJS.");
  }

  /** Carbon method Save -> PySave (MAP_METHOD). */
  @meta.blue.method
  @meta.notImplemented
  Save(...args)
  {
    throw new Error("Tr2HostBitmap.Save is not implemented in CarbonEngineJS.");
  }

  /** Carbon method ConvertToVolume (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  ConvertToVolume(...args)
  {
    throw new Error("Tr2HostBitmap.ConvertToVolume is not implemented in CarbonEngineJS.");
  }

  static PixelFormat = PixelFormat;

  static TextureType = TextureType;

}

CjsSchema.define(Tr2HostBitmap, {
  className: "Tr2HostBitmap", family: "trinityCore",
  members: [
    { name: "format", key: "_format", type: { kind: "int32" }, enum: { enumType: "PixelFormat" }, edit: { read: true } },
    { name: "width", key: "_width", type: { kind: "uint32" }, edit: { read: true } },
    { name: "height", key: "_height", type: { kind: "uint32" }, edit: { read: true } },
    { name: "mipCount", key: "_mipCount", type: { kind: "uint32" }, edit: { read: true } },
    { name: "imageType", key: "_type", type: { kind: "int32" }, enum: { enumType: "TextureType" }, edit: { read: true } },
    { name: "name", key: "_name", type: { kind: "string" }, edit: { read: true, write: true, persist: true } }
  ]
});
meta.blue.interfaceTable({ interfaces: [Tr2HostBitmap], chainTo: null })(Tr2HostBitmap, { kind: "class" });
