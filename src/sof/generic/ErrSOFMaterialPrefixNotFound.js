import { CjsSchema } from "#schema";
/**
 * Reports that a requested material prefix is absent from the generic SOF
 * catalog.
 */
export class ErrSOFMaterialPrefixNotFound extends Error
{
  /**
   * The error's class name, shadowing Error.prototype.name.
   * @type {string}
   */
  name = "ErrSOFMaterialPrefixNotFound";

  /**
   * The stable error code.
   * @type {string}
   */
  code = "EVE_SOF_MATERIAL_PREFIX_NOT_FOUND";

  /**
   * The requested one-based material prefix index, or -1.
   * @type {number}
   */
  index = -1;

  /**
   * Creates a material-prefix lookup error carrying the requested one-based
   * index and stable error code.
   */
  constructor({ index = -1 } = {})
  {
    super("SOF material prefix not found: " + index);
    this.index = index;
  }
}

CjsSchema.meta.define("ErrSOFMaterialPrefixNotFound")(ErrSOFMaterialPrefixNotFound);
