import { CjsSchema } from "#schema";
/** Reports that a requested decal shader is absent from the generic SOF catalog. */
export class ErrSOFDecalShaderNotFound extends Error
{
  /**
   * The error's class name, shadowing Error.prototype.name.
   * @type {string}
   */
  name = "ErrSOFDecalShaderNotFound";

  /**
   * The stable error code.
   * @type {string}
   */
  code = "EVE_SOF_DECAL_SHADER_NOT_FOUND";

  /**
   * The requested decal shader name.
   * @type {string}
   */
  shader = "";

  /**
   * Creates a decal-shader lookup error carrying the requested shader name and
   * stable error code.
   */
  constructor({ name = "" } = {})
  {
    super("SOF decal shader not found: " + name);
    this.shader = name;
  }
}

CjsSchema.meta.define(ErrSOFDecalShaderNotFound, { className: "ErrSOFDecalShaderNotFound" });
