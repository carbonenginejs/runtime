import { CjsSchema } from "#schema";
/** Reports that a pattern has no projection for the requested hull. */
export class ErrSOFProjectionNotFound extends Error
{
  /**
   * The error's class name, shadowing Error.prototype.name.
   * @type {string}
   */
  name = "ErrSOFProjectionNotFound";

  /**
   * The stable error code.
   * @type {string}
   */
  code = "EVE_SOF_PROJECTION_NOT_FOUND";

  /**
   * The pattern whose projection was requested.
   * @type {string}
   */
  pattern = "";

  /**
   * The requested projection name.
   * @type {string}
   */
  projection = "";

  /**
   * Creates a projection lookup error carrying both the pattern and hull names
   * with a stable error code.
   */
  constructor({ pattern = "", projection = "" } = {})
  {
    super("SOF pattern projection '" + projection + "' not found for pattern '" + pattern + "'");
    this.pattern = pattern;
    this.projection = projection;
  }
}

CjsSchema.meta.define(ErrSOFProjectionNotFound, { className: "ErrSOFProjectionNotFound" });
