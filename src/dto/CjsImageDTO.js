import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsObjectDTO } from "./CjsObjectDTO.js";

/**
 * Image-oriented DTO for decoded pixel data.
 *
 * Runtime-resource can hydrate this class from raw image parser output, while
 * more texture-specific fields can be added by subclasses.
 */
@type.define({ className: "CjsImageDTO", family: "resource" })
export class CjsImageDTO extends CjsObjectDTO
{
  @io.persist
  @type.uint32
  width = 0;

  @io.persist
  @type.uint32
  height = 0;

  @io.persist
  @type.uint32
  channels = 0;

  @io.persist
  @type.string
  pixelFormat = "";

  @io.persist
  @type.string
  colorSpace = "";

  @io.persist
  @type.string
  origin = "";

  @io.persist
  @type.string
  alphaMode = "";

  @io.persist
  @type.uint32
  strideBytes = 0;

  @io.persist
  @type.unknown
  data = null;

  /** Compatibility field; use data for canonical decoded bytes. */
  @io.persist
  @type.unknown
  imageBytes = null;

  /** Compatibility field; canonical RGBA payloads use data: Uint8Array. */
  @io.persist
  @type.unknown
  pixels = null;

  @io.persist
  @type.unknown
  strideInfo = null;

  constructor(values = null) {
    super();
    this.SetValues(values || {}, {
      markDirty: false,
      skipUpdate: true,
      skipEvents: true
    });
  }

  static payload = "image";
}
