/** Reports that a requested decal shader is absent from the generic SOF catalog. */
export class ErrSOFDecalShaderNotFound extends Error
{
  /**
   * Creates a decal-shader lookup error carrying the requested shader name and
   * stable error code.
   */
  constructor({ name = "" } = {})
  {
    super("SOF decal shader not found: " + name);
    this.name = "ErrSOFDecalShaderNotFound";
    this.code = "EVE_SOF_DECAL_SHADER_NOT_FOUND";
    this.shader = name;
  }
}
