import { CjsModel } from "@carbonenginejs/core-types/model";
import { io, type } from "@carbonenginejs/core-types/schema";

/**
 * Optional runtime-resource DTO carrier for parsed content returned by format readers.
 *
 * Format packages may return plain semantic objects or their own hydrated
 * classes. Runtime-resource can use this class when it wants a known CjsModel
 * normalization target without adding resource lifecycle state.
 */
@type.define({ className: "CjsObjectDTO", family: "resource" })
export class CjsObjectDTO extends CjsModel
{
  @io.persist
  @type.string
  sourceFormat = "";

  @io.persist
  @type.unknown
  metadata = null;

  @io.persist
  @type.list("unknown")
  report = [];

  constructor(values = null) {
    super();
    this.SetValues(values || {}, {
      markDirty: false,
      skipUpdate: true,
      skipEvents: true
    });
  }

  static payload = "object";
}
