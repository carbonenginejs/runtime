// Source: trinity/trinity/Resources/Tr2ImageRes.h
// Source: trinity/trinity/Resources/Tr2ImageRes.cpp
// Source: trinity/trinity/Resources/Tr2ImageRes_Blue.cpp
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsResource } from "../CjsResource.js";
import { validateRgbaPayload } from "../format/payloadContract.js";
import { ValidateResourcePayload } from "./resourceBoundary.js";

/**
 * Tr2ImageRes resource record.
 *
 * Carbon treats this as image payload data. Engine-gpu decides whether it ever
 * becomes device texture state.
 */
@type.define({ className: "Tr2ImageRes", family: "resources" })
export class Tr2ImageRes extends CjsResource
{

  @io.persist
  @type.uint32
  width = 0;

  @io.persist
  @type.uint32
  height = 0;

  constructor(values = null) {
    super();
    this.SetValues(values || {}, {
      markDirty: false,
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
      super.SetPayload(null);
      return this;
    }
    ValidateResourcePayload("Tr2ImageRes", payload, validateRgbaPayload);
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
  @carbon.method
  @impl.adapted
  GetWidth()
  {
    return this.width || 0;
  }

  /**
   * Return image height in pixels.
   *
   * @returns {number}
   */
  @carbon.method
  @impl.adapted
  GetHeight()
  {
    return this.height || 0;
  }

  /**
   * Read pixel color from payload metadata when a simple pixel accessor exists.
   *
   * @param {number} x
   * @param {number} y
   * @returns {*}
   */
  @carbon.method
  @impl.adapted
  GetPixelColor(x = 0, y = 0)
  {
    const payload = this.GetPayload();
    if (!payload || !Number.isInteger(x) || !Number.isInteger(y)
      || x < 0 || y < 0 || x >= payload.width || y >= payload.height) return null;

    const elementsPerRow = payload.strideBytes / payload.data.BYTES_PER_ELEMENT;
    const offset = y * elementsPerRow + x * 4;
    return Array.from(payload.data.subarray(offset, offset + 4));
  }

  /**
   * Return true when a pixel alpha channel is absent or non-zero.
   *
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  @carbon.method
  @impl.adapted
  IsPixelOpaque(x = 0, y = 0)
  {
    const color = this.GetPixelColor(x, y);
    if (!Array.isArray(color)) return false;
    return color.length < 4 || color[3] > 0;
  }

  static payload = "image";
}
