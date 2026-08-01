// Source: trinity/trinity/Resources/Tr2ImageRes.h
// Source: trinity/trinity/Resources/Tr2ImageRes.cpp
// Source: trinity/trinity/Resources/Tr2ImageRes_Blue.cpp
import { CjsSchema, carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsResource } from "../CjsResource.js";
import { validateRgbaPayload } from "../../format/payloadContract.js";
import { validateResourcePayload } from "../resourceBoundary.js";

/**
 * Tr2ImageRes resource record.
 *
 * Carbon treats this as image payload data. Engine-gpu decides whether it ever
 * becomes device texture state.
 */
export class Tr2ImageRes extends CjsResource
{

  width = 0;

  height = 0;

  /** Creates a Tr2ImageRes with caller-provided initial state. */
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
    return this.width || 0;
  }

  /**
   * Return image height in pixels.
   *
   * @returns {number}
   */
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
  IsPixelOpaque(x = 0, y = 0)
  {
    const color = this.GetPixelColor(x, y);
    if (!Array.isArray(color)) return false;
    return color.length < 4 || color[3] > 0;
  }

  static payload = "image";
}

// Declared as data rather than with decorators, so the resource tree loads from
// source without a transform. Field order is key order, and GetValues() exports
// in that order.
CjsSchema.define(Tr2ImageRes, {
  className: "Tr2ImageRes",
  family: "resources",
  fields: {
    width: [ type.uint32, io.persist ],
    height: [ type.uint32, io.persist ]
  },
  methods: {
    GetWidth: [ carbon.method, impl.adapted ],
    GetHeight: [ carbon.method, impl.adapted ],
    GetPixelColor: [ carbon.method, impl.adapted ],
    IsPixelOpaque: [ carbon.method, impl.adapted ]
  }
});
