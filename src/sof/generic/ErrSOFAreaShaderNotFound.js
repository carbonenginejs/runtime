/** Reports that a requested area shader is absent from the generic SOF catalog. */
export class ErrSOFAreaShaderNotFound extends Error
{
  /**
   * Creates an area-shader lookup error carrying the requested shader name and
   * stable error code.
   */
  constructor({ name = "" } = {})
  {
    super("SOF area shader not found: " + name);
    this.name = "ErrSOFAreaShaderNotFound";
    this.code = "EVE_SOF_AREA_SHADER_NOT_FOUND";
    this.shader = name;
  }
}
