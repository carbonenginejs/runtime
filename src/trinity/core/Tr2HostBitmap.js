// Source: trinity/trinity/Tr2HostBitmap.h
// Maintained promotion: native ImageIO storage replaces the generated model snapshots.
// Async saving and the explicit unimplemented Trinity methods remain unsupported.
import { CjsSchema, meta } from "#schema";
import { PixelFormat, TextureType } from "#consts/render-context";
import { HostBitmap } from "#imageio";
import { CjsDdsFormat } from "#resource/formats/dds";
import { createDdsBitmap } from "../../resource/texture/ddsBitmap.js";

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

  /** Uses the inherited ImageIO volume allocation exposed by Tr2HostBitmap_Blue.cpp:467-471. */
  @meta.blue.method
  @meta.implemented
  CreateVolume(width, height, depth, mipCount, format)
  {
    return super.CreateVolume(width, height, depth, mipCount, format);
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

  /**
   * Compress into the supplied texture through the shared DDS worker encoder.
   * Source: Tr2HostBitmap.cpp:512-557. Browser workers require an async result;
   * no source or output is changed before the complete encoding succeeds.
   * Approved extensions preserve all source mips and replace Carbon's LGPL
   * realtime encoders with MIT libsquish. DDS owns corrected BC2/BC5 mappings.
   * @param {number} compressionFormat Carbon compression mode.
   * @param {number} qualityLevel Carbon squish quality (or -1 for range fit).
   * @param {object} output TriTextureRes receiving the completed bitmap.
   * @param {object} [options] DDS worker options and cancellation signal.
   * @returns {Promise<boolean>} Whether the complete bitmap was published.
   */
  @meta.blue.method
  @meta.adapted
  async Compress(compressionFormat, qualityLevel, output, options = {})
  {
    if (!output || !this.IsValid() || this.GetType() !== TextureType.TEX_TYPE_2D) return false;
    try
    {
      const packet = await CjsDdsFormat.compressBitmapAsync({
        description: { type: this.GetType(), format: this.GetFormat(), width: this.GetWidth(),
          height: this.GetHeight(), depth: this.GetDepth(), mipCount: this.GetMipCount(), arraySize: this.GetArraySize() },
        data: this.GetRawData(), metadata: this.metadata ?? { cutout: {}, metadata: [] }
      }, compressionFormat, { ...options, quality: qualityLevel });
      if (options.signal?.aborted) return false;
      return output.CreateFromHostBitmap(createDdsBitmap(packet));
    }
    catch
    {
      return false;
    }
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

  /** Uses the inherited ImageIO storage-validity predicate exposed by the native Blue table. */
  @meta.blue.method
  @meta.implemented
  IsValid()
  {
    return super.IsValid();
  }

  /** Uses the inherited ImageIO compression predicate exposed by the native Blue table. */
  @meta.blue.method
  @meta.implemented
  IsCompressed()
  {
    return super.IsCompressed();
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

  /** Returns the inherited writable byte view; typed-array access replaces Python memoryview packaging while preserving the native CPU overload. */
  @meta.blue.method
  @meta.adapted
  GetRawData(x, y)
  {
    return super.GetRawData(x, y);
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
