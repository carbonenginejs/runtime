import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsObjectDTO } from "./CjsObjectDTO.js";

/**
 * Shader/effect-oriented DTO used by shader formats.
 */
@type.define({ className: "CjsShaderDTO", family: "resource" })
export class CjsShaderDTO extends CjsObjectDTO
{
  @io.persist
  @type.list("unknown")
  techniques = [];

  @io.persist
  @type.list("unknown")
  permutations = [];

  @io.persist
  @type.list("unknown")
  passes = [];

  @io.persist
  @type.unknown
  signature = null;

  constructor(values = null) {
    super();
    this.SetValues(values || {}, {
      markDirty: false,
      skipUpdate: true,
      skipEvents: true
    });
  }

  static payload = "shader";
}
