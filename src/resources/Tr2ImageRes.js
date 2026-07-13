// Source: trinity/trinity/Resources/Tr2ImageRes.h
// Source: trinity/trinity/Resources/Tr2ImageRes.cpp
// Source: trinity/trinity/Resources/Tr2ImageRes_Blue.cpp
import { carbon, impl, io, type } from "@carbonenginejs/core-types/schema";
import { CjsResource } from "../CjsResource.js";

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
   * Attach an image DTO and mirror Carbon-exposed metadata.
   *
   * @param {object|null} dto
   * @param {object|null} options
   * @returns {Tr2ImageRes}
   */
  SetDTO(dto = null, options = null)
  {
    super.SetDTO(dto);
    const values = { ...(options || {}) };
    if (dto && typeof dto === "object") {
      if (dto.width !== undefined) values.width = dto.width;
      if (dto.height !== undefined) values.height = dto.height;
    }
    this.SetValues(values);
    Object.assign(this, values);
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
    const pixels = this.GetDTO()?.pixels;
    if (!Array.isArray(pixels)) return null;
    return pixels[y]?.[x] ?? null;
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
