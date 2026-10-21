import { CjsSchema } from "#schema";
/** Reports that a requested area shader is absent from the generic SOF catalog. */
export class ErrSOFAreaShaderNotFound extends Error
{
  /**
   * The error's class name, shadowing Error.prototype.name.
   * @type {string}
   */
  name = "ErrSOFAreaShaderNotFound";

  /**
   * The stable error code.
   * @type {string}
   */
  code = "EVE_SOF_AREA_SHADER_NOT_FOUND";

  /**
   * The requested area shader name.
   * @type {string}
   */
  shader = "";

  /**
   * Creates an area-shader lookup error carrying the requested shader name and
   * stable error code.
   */
  constructor({ name = "" } = {})
  {
    super("SOF area shader not found: " + name);
    this.shader = name;
  }
}

CjsSchema.meta.define("ErrSOFAreaShaderNotFound")(ErrSOFAreaShaderNotFound);
