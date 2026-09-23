// Source: trinity/trinity/Resources/Tr2ImageRes.h
// Source: trinity/trinity/Resources/Tr2ImageRes.cpp
// Source: trinity/trinity/Resources/Tr2ImageRes_Blue.cpp
import { CjsSchema, carbon, impl, edit, type } from "#schema";
import { CjsResource } from "../CjsResource.js";
import { HostBitmap } from "#imageio";
import { PixelFormat } from "#consts/render-context";
import { validateRgbaPayload } from "../format/payloadContract.js";
import { validateResourcePayload } from "../resourceBoundary.js";
import { ResourceRequirement } from "../ResourceRequirement.js";

/**
 * Tr2ImageRes resource record.
 *
 * Carbon treats this as image payload data. Engine-gpu decides whether it ever
 * becomes device texture state.
 */
export class Tr2ImageRes extends CjsResource
{

  /** m_bitmap: the decoded image (Tr2ImageRes.h:38). */
  bitmap = new HostBitmap();

  /** Mirrors the bitmap's width, so the schema and tools can read it. */
  width = 0;

  /** Mirrors the bitmap's height. */
  height = 0;

  /** Creates a Tr2ImageRes with caller-provided initial state. */
  constructor(values = null) {
    super();
    this.SetValues(values || {}, {
      skipUpdate: true,
      skipEvents: true
    });
  }

  /**
   * Attach a plain canonical RGBA payload and mirror Carbon-exposed metadata.
   *
   * @param {object|null} payload
   * @param {object|null} options
   * @returns {Tr2ImageRes}
   */
  SetPayload(payload = null, options = null)
  {
    if (payload === null)
    {
      this.bitmap.Destroy();
      super.SetPayload(null);
      return this;
    }

    // Carbon's DoLoad reads straight into m_bitmap (Tr2ImageRes.cpp:39-52), so
    // a HostBitmap is what this resource is made of; the plain RGBA payload
    // below is the TRANSITIONAL route (/docs/projects/hostbitmap-port.md).
    const bitmap = CjsSchema.cast(payload, HostBitmap);

    if (bitmap)
    {
      this.bitmap = bitmap;
      super.SetPayload(bitmap);
      this.SetValues({ ...(options || {}), width: bitmap.GetWidth(), height: bitmap.GetHeight() });
      return this;
    }

    validateResourcePayload("Tr2ImageRes", payload, validateRgbaPayload);
    const values = { ...(options || {}) };
    values.width = payload.width;
    values.height = payload.height;
    super.SetPayload(payload);
    this.SetValues(values);
    return this;
  }

  /**
   * Return image width in pixels.
   *
   * @returns {number}
   */
  GetWidth()
  {
    return this.bitmap.IsValid() ? this.bitmap.GetWidth() : (this.width || 0);
  }

  /**
   * Return image height in pixels.
   *
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
   * @param {number} x Pixel column.
   * @param {number} y Pixel row.
   * @returns {{r: number, g: number, b: number, a: number}} The colour.
   */
  GetPixelColor(x = 0, y = 0)
  {
    const transparent = { r: 0, g: 0, b: 0, a: 0 };

    if (!this.bitmap.IsValid()) return transparent;

    const format = this.bitmap.GetFormat();

    // Carbon: CCP_LOGERR("Tr2ImageRes::GetPixelColor currently only supports ...")
    if (format !== PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM && format !== PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM) return transparent;

    const color = this.bitmap.GetPixel(x, y);

    if (!color) return transparent;

    return format === PixelFormat.PIXEL_FORMAT_B8G8R8X8_UNORM ? { ...color, a: 1 } : color;
  }

  /**
   * Carbon IsPixelOpaque (Tr2ImageRes.cpp:54-70): BGRA only, and "opaque"
   * means an alpha byte above 0x7f.
   *
   * @param {number} x Pixel column.
   * @param {number} y Pixel row.
   * @returns {boolean} Whether the pixel is opaque.
   */
  IsPixelOpaque(x = 0, y = 0)
  {
    // Carbon: CCP_LOGERR("Tr2ImageRes::IsPixelOpaque currently only supports PIXEL_FORMAT_B8G8R8A8_UNORM")
    if (!this.bitmap.IsValid() || this.bitmap.GetFormat() !== PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM) return false;

    const color = this.bitmap.GetPixel(x, y);

    return !!color && color.a > 0x7f / 255;
  }

  /**
   * Carbon GetBitmap (Tr2ImageRes.cpp:110-113): the bitmap DoLoad decoded.
   *
   * @returns {HostBitmap} The bitmap, valid once the image has loaded.
   */
  GetBitmap()
  {
    return this.bitmap;
  }

  /**
   * Carbon IsMemoryUsageKnown (cpp:14): usage is only trustworthy once the
   * async load has settled.
   *
   * @returns {boolean}
   */
  IsMemoryUsageKnown()
  {
    return !this.IsLoading();
  }

  /**
   * Carbon GetMemoryUsage (cpp:19): the bitmap's raw byte size, or a
   * 1024-byte placeholder so an unloaded resource still has nonzero
   * accounted cost.
   *
   * @returns {number}
   */
  GetMemoryUsage()
  {
    if (this.bitmap.IsValid()) return this.bitmap.GetRawDataSize();

    const payload = this.GetPayload();

    return payload?.data?.byteLength ? payload.data.byteLength : 1024;
  }

  static payload = ResourceRequirement.IMAGE;
}

// Declared as data rather than with decorators, so the resource tree loads from
// source without a transform. Field order is key order, and GetValues() exports
// in that order.
CjsSchema.define(Tr2ImageRes, {
  className: "Tr2ImageRes",
  family: "resources",
  fields: {
    width: [ type.uint32, edit.persist ],
    height: [ type.uint32, edit.persist ]
  },
  methods: {
    GetWidth: [ carbon.method, impl.adapted ],
    GetHeight: [ carbon.method, impl.adapted ],
    GetPixelColor: [ carbon.method, impl.adapted ],
    IsPixelOpaque: [ carbon.method, impl.adapted ],
    GetBitmap: [ carbon.method, impl.adapted ],
    IsMemoryUsageKnown: [ carbon.method, impl.implemented ],
    GetMemoryUsage: [ carbon.method, impl.adapted ]
  }
});
