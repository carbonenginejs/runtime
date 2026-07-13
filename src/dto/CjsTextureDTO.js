import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsImageDTO } from "./CjsImageDTO.js";

/**
 * Texture DTO for image families that may later be consumed by engine-gpu.
 *
 * Formats may provide both compressed (`variants`) and decoded (`imageBytes`)
 * representations; engine-gpu chooses what to do with them.
 */
@type.define({ className: "CjsTextureDTO", family: "resource" })
export class CjsTextureDTO extends CjsImageDTO
{
  @io.persist
  @type.string
  dimension = "";

  @io.persist
  @type.uint32
  arraySize = 0;

  @io.persist
  @type.list("unknown")
  subresources = [];

  @io.persist
  @type.list("unknown")
  variants = [];

  @io.persist
  @type.list("unknown")
  faces = [];

  @io.persist
  @type.uint32
  mipCount = 0;

  @io.persist
  @type.boolean
  isCompressed = false;

  @io.persist
  @type.boolean
  hasMipMaps = false;

  constructor(values = null) {
    super();
    this.SetValues(values || {}, {
      markDirty: false,
      skipUpdate: true,
      skipEvents: true
    });
  }

  static payload = "texture";
}
