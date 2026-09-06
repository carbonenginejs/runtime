// Source: trinity/trinity/Tr2StreamingBitmapSaver.h
//   trinity/trinity/Tr2StreamingBitmapSaver.cpp
//   imageio/Tr2TgaHandler.cpp (SaveHeader, the 18-byte TGA header)
// Hand-maintained from Carbon source, promoted out of generated intake
// 2026-09-06 (docs/research/ratchet-three-method-tier-2026-09-06.md).
//
// TWO DONOR DEFECTS AT StartSaving, recorded rather than silently corrected:
// the format pre-check reads the STALE member (`IsSaveSupported( m_format )`
// at cpp:56 while `m_format = pixelFormat` only lands at cpp:94), and
// IsSaveSupported itself is a tautology (`format == X8 || format != A8 ||
// format != R8`, Tr2TgaHandler.cpp) that can never reject. Net Carbon
// behaviour: the pre-check never fails and the REAL format gate is
// SaveHeader's switch, whose default returns SAVE_NOT_SUPPORTED. This port
// keeps that net behaviour: no pre-check, the header switch rejects.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { GetBytesPerPixel, PixelFormat } from "#consts/render-context";
import { ALResult } from "../../trinityal/ALResult.js";

/** TGA image types (Tr2TgaHandler.cpp): raw RGB and raw greyscale. */
const IMAGE_TYPE_RAW_RGB = 2;
const IMAGE_TYPE_RAW_GREYSCALE = 3;

/** Models Carbon's incremental bitmap saver through its dimensions, pixel format, current offset, and batch-copy entry points. */
@type.define({ className: "Tr2StreamingBitmapSaver", family: "trinityCore", purpose: "Models Carbon's incremental bitmap saver through its dimensions, pixel format, current offset, and batch-copy entry points." })
export class Tr2StreamingBitmapSaver extends CjsModel
{

  /** m_currentOffset (uint32_t) [READ] - rows are written bottom-up, so it
   *  starts at the height. */
  @io.read
  @type.uint32
  currentOffset = 0;

  /** m_height (uint32_t) [READ] */
  @io.read
  @type.uint32
  height = 0;

  /** m_format (Tr2RenderContextEnum::PixelFormat - enum PixelFormat) [READ] */
  @io.read
  @type.int32
  @type.enum("PixelFormat")
  format = 0;

  /** m_width (uint32_t) [READ] */
  @io.read
  @type.uint32
  width = 0;

  /** m_output - Carbon's Blue IResFile stream; here any { Write(Uint8Array) } sink. */
  #output = null;

  /** m_bytesPerPixel, derived from the format at StartSaving. */
  #bytesPerPixel = 0;

  /** m_rowsPerBatch - non-zero only between StartBatch and FlushBatch. */
  #rowsPerBatch = 0;

  /**
   * Carbon StartSaving (Tr2StreamingBitmapSaver.cpp:45-100): end any
   * in-flight save, validate the dimensions, open the output and write the
   * 18-byte TGA header (Tr2TgaHandler.cpp SaveHeader - the header's switch
   * is the real format gate: B8G8R8X8 24bpp RGB, B8G8R8A8 32bpp RGB,
   * R8 8bpp greyscale, anything else refused), then latch the image state
   * with the row cursor at the bottom.
   *
   * Carbon opens a Blue ResFile from a path; this runtime has no file
   * layer, so the output is a caller-supplied sink whose Write(bytes)
   * returns the count written - a string path with no sink behind it fails
   * exactly as Carbon's failed stream open does.
   *
   * @param {{Write(bytes: Uint8Array): number}} output The write sink.
   * @param {number} width
   * @param {number} height
   * @param {number} pixelFormat A PixelFormat value.
   * @returns {number} An ALResult value.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon opens a Blue ResFile stream from a path; the runtime has no file layer, so the caller supplies the write sink.")
  StartSaving(output, width, height, pixelFormat)
  {
    if (this.IsSaving())
    {
      const ended = this.EndSaving();
      if (ended !== ALResult.S_OK) return ended;
    }

    if (!width || !height) return ALResult.E_INVALIDARG;
    if (typeof output?.Write !== "function") return ALResult.E_FAIL;

    // The TGA header (Tr2TgaHandler.cpp SaveHeader): idLength, colorMapType,
    // imageType, colorMap start/length/bpp, origin, size, bpp, descriptor.
    let imageType;
    let bpp;
    switch (pixelFormat)
    {
      case PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM: imageType = IMAGE_TYPE_RAW_RGB; bpp = 24; break;
      case PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM: imageType = IMAGE_TYPE_RAW_RGB; bpp = 32; break;
      case PixelFormat.PIXEL_FORMAT_R8_UNORM: imageType = IMAGE_TYPE_RAW_GREYSCALE; bpp = 8; break;
      default: return ALResult.E_FAIL;
    }

    const header = new Uint8Array(18);
    const view = new DataView(header.buffer);
    view.setUint8(2, imageType);
    view.setUint16(12, width & 0xFFFF, true);
    view.setUint16(14, height & 0xFFFF, true);
    view.setUint8(16, bpp);

    if (output.Write(header) !== header.length) return ALResult.E_FAIL;

    this.#output = output;
    this.width = width;
    this.height = height;
    this.format = pixelFormat;
    this.#bytesPerPixel = GetBytesPerPixel(pixelFormat);
    this.currentOffset = this.height;

    return ALResult.S_OK;
  }

  /** Carbon IsSaving (cpp:282-284): whether an output stream is open. */
  @carbon.method
  @impl.implemented
  IsSaving()
  {
    return this.#output !== null;
  }

  /** Carbon HasStartedBatch (cpp:294-296): whether a batch is in flight. */
  @carbon.method
  @impl.implemented
  HasStartedBatch()
  {
    return this.#rowsPerBatch !== 0;
  }

  /** Carbon method CopyFromRenderTargetRegion (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  CopyFromRenderTargetRegion(...args)
  {
    throw new Error("Tr2StreamingBitmapSaver.CopyFromRenderTargetRegion is not implemented in CarbonEngineJS.");
  }

  /** Carbon EndSaving closes and pads the stream; unported with the batch pair. */
  @carbon.method
  @impl.notImplemented
  EndSaving(...args)
  {
    throw new Error("Tr2StreamingBitmapSaver.EndSaving is not implemented in CarbonEngineJS.");
  }

  /** Carbon method FlushBatch (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  FlushBatch(...args)
  {
    throw new Error("Tr2StreamingBitmapSaver.FlushBatch is not implemented in CarbonEngineJS.");
  }

  /** Carbon method StartBatch (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  StartBatch(...args)
  {
    throw new Error("Tr2StreamingBitmapSaver.StartBatch is not implemented in CarbonEngineJS.");
  }

  static PixelFormat = PixelFormat;

}
