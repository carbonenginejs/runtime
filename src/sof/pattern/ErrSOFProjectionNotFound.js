/** Reports that a pattern has no projection for the requested hull. */
export class ErrSOFProjectionNotFound extends Error
{
  /**
   * Creates a projection lookup error carrying both the pattern and hull names
   * with a stable error code.
   */
  constructor({ pattern = "", projection = "" } = {})
  {
    super("SOF pattern projection '" + projection + "' not found for pattern '" + pattern + "'");
    this.name = "ErrSOFProjectionNotFound";
    this.code = "EVE_SOF_PROJECTION_NOT_FOUND";
    this.pattern = pattern;
    this.projection = projection;
  }
}
