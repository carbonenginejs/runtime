import { blue as blueService } from "#blue/blue";
// Source: trinity/trinity/Resources/Tr2ImageRes.h
// Source: trinity/trinity/Resources/Tr2ImageRes.cpp
// Source: trinity/trinity/Resources/Tr2ImageRes_Blue.cpp
import { exposure as be } from "#be";
import * as CcpLog from "../../../global/logging/ccpLog.js";
import { CjsSchema, meta, type, blue } from "#schema";
import { BlueAsyncRes, ICacheable } from "#blue";
import { HostBitmap } from "#imageio";
import { PixelFormat } from "#consts/render-context";
import { resourcePayloadError, validateResourcePayload } from "../resourceBoundary.js";

/**
 * Tr2ImageRes resource record.
 *
 * Carbon treats this as image payload data. Engine-gpu decides whether it ever
 * becomes device texture state.
 */
export class Tr2ImageRes extends BlueAsyncRes
{
  /** Carbon: BLUE_REGISTER_RESOURCE_EXTENSION (trinity/trinity/Resources/Tr2ImageRes_Blue.cpp:15-18). */
  static extensions = ["pngraw", "ddsraw", "sddraw", "tgaraw"];

  /** Our additional raw image routes reuse the existing browser ImageIO formats. */
  static additionalExtensions = ["jpgraw", "jpegraw", "vtaraw", "gifraw"];

  /** Declared by Carbon, not routed here: no SDD image handler is implemented. */
  static unroutedExtensions = { sddraw: "declared by Carbon, not routed here: no image handler" };



  /** m_bitmap: the decoded image (Tr2ImageRes.h:38). */
  bitmap = new HostBitmap();

  /** Mirrors the bitmap's width, so the schema and tools can read it. */
  width = 0;

  /** Mirrors the bitmap's height. */
  height = 0;


  /**
   * Carbon DoLoad (Tr2ImageRes.cpp:39-52). Browser decoding may run in a worker;
   * the manager checks cancellation before the decoded bitmap is adopted.
   *
   * @adapted
   * @returns {Promise<number>} Native LoadingResult.
   */
  async _DoLoad()
  {
    const value = await blueService.resMan.ReadResourceObjectPayload(this, this._dataStream.data);
    const bitmap = CjsSchema.cast(value, HostBitmap);
    if (!bitmap) throw resourcePayloadError("Tr2ImageRes", "Expected an ImageIO::HostBitmap.", "bitmap");
    this.bitmap.Destroy();
    this.bitmap = bitmap;
    this.width = bitmap.GetWidth();
    this.height = bitmap.GetHeight();
    return BlueAsyncRes.LoadingResult.LR_SUCCESS;
  }

  /**
   * Return image width in pixels.
   *
   * @adapted
   * @returns {number}
   */
  GetWidth()
  {
    return this.bitmap.IsValid() ? this.bitmap.GetWidth() : (this.width || 0);
  }

  /**
   * Return image height in pixels.
   *
   * @adapted
   * @returns {number}
   */
  GetHeight()
  {
    return this.bitmap.IsValid() ? this.bitmap.GetHeight() : (this.height || 0);
  }

  /**
   * Carbon GetPixelColor (Tr2ImageRes.cpp:72-108): the pixel as a colour,
   * BGRA or BGRX only. A BGRX pixel reports alpha 1.
   *
   * adapted: Carbon returns a `Color`; this returns `{r, g, b, a}` in 0..1,
   * the shape `HostBitmap.GetPixel` already answers in.
   *
   * @adapted
   * @param {number} x Pixel column.
   * @param {number} y Pixel row.
   * @returns {{r: number, g: number, b: number, a: number}} The colour.
   */
  GetPixelColor(x = 0, y = 0)
  {
    const transparent = { r: 0, g: 0, b: 0, a: 0 };

    if (!this.bitmap.IsValid()) return transparent;

    const format = this.bitmap.GetFormat();

    if (format !== PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM && format !== PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM)
    {
      CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "Tr2ImageRes::GetPixelColor currently only supports PIXEL_FORMAT_B8G8R8A8_UNORM or PIXEL_FORMAT_B8G8R8X8_UNORM");
      return transparent;
    }

    const color = this.bitmap.GetPixel(x, y);

    if (!color) return transparent;

    return format === PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM ? { ...color, a: 1 } : color;
  }

  /**
   * Carbon IsPixelOpaque (Tr2ImageRes.cpp:54-70): BGRA only, and "opaque"
   * means an alpha byte above 0x7f.
   *
   * @adapted
   * @param {number} x Pixel column.
   * @param {number} y Pixel row.
   * @returns {boolean} Whether the pixel is opaque.
   */
  IsPixelOpaque(x = 0, y = 0)
  {
    if (!this.bitmap.IsValid()) return false;

    if (this.bitmap.GetFormat() !== PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM)
    {
      CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "Tr2ImageRes::IsPixelOpaque currently only supports PIXEL_FORMAT_B8G8R8A8_UNORM");
      return false;
    }

    const color = this.bitmap.GetPixel(x, y);

    return !!color && color.a > 0x7f / 255;
  }

  /**
   * Carbon GetBitmap (Tr2ImageRes.cpp:110-113): the bitmap DoLoad decoded.
   *
   * @adapted
   * @returns {HostBitmap} The bitmap, valid once the image has loaded.
   */
  GetBitmap()
  {
    return this.bitmap;
  }

  /**
   * Carbon: Tr2ImageRes::DoPrepare (Tr2ImageRes.cpp:50-53): nothing to prepare. The
   * decoded bitmap is the whole resource and no device object is made from it.
   *
   * @implemented
   * @returns {boolean} Always true.
   */
  _DoPrepare()
  {
    return true;
  }

  /**
   * Carbon IsMemoryUsageKnown (cpp:14): usage is only trustworthy once the
   * async load has settled.
   *
   * @implemented
   * @returns {boolean}
   */
  IsMemoryUsageKnown()
  {
    return !this.IsLoading();
  }

  /**
   * Carbon GetMemoryUsage (Tr2ImageRes.cpp:19): bitmap size or unloaded placeholder.
   *
   * @adapted
   */
  GetMemoryUsage()
  {
    return this.bitmap.IsValid() ? this.bitmap.GetRawDataSize() : 1024;
  }


  /**
   * Explicit JS cleanup of the bitmap owned by Carbon's resource destructor.
   *
   * @adapted explicit JS teardown replaces native destruction; the existing
   *   MotherLode switches keep CPU data and opaque adapter cleanup independent.
   * @param {object} [options={}] Existing MotherLode cleanup policy.
   * @param {boolean} [options.releasePayload=true] Release owned family data.
   * @param {boolean} [options.destroyAdapters=true] Destroy opaque device adapter slots.
   * @returns {void}
   */
  _OnShutdown(options = {})
  {
    if (options.releasePayload === false) return;
    this.bitmap.Destroy();
    this.width = this.height = 0;
  }
}

// Declared as data rather than with decorators, so the resource tree loads from
// source without a transform. Field order is key order, and GetValues() exports
// in that order.

CjsSchema.decorateField(Tr2ImageRes, "width", type.int32, blue.read, meta.persist);
CjsSchema.decorateField(Tr2ImageRes, "height", type.int32, blue.read, meta.persist);
CjsSchema.decorateMethod(Tr2ImageRes, "GetPixelColor", be.mapMethodAndWrap());
CjsSchema.decorateMethod(Tr2ImageRes, "IsPixelOpaque", be.mapMethodAndWrap());
CjsSchema.exposure.mapICacheableMethods()(Tr2ImageRes);
be.define("Tr2ImageRes")(Tr2ImageRes);
be.inherit(ICacheable)(Tr2ImageRes, { kind: "class" });
CjsSchema.exposure.mapInterface(ICacheable)(Tr2ImageRes);
// Carbon: Tr2ImageRes::ExposeToBlue (trinity/trinity/Resources/Tr2ImageRes_Blue.cpp:52).
CjsSchema.blue.chainTo(BlueAsyncRes)(Tr2ImageRes);


