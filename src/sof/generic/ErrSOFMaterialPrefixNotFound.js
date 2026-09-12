/**
 * Reports that a requested material prefix is absent from the generic SOF
 * catalog.
 */
export class ErrSOFMaterialPrefixNotFound extends Error
{
  /**
   * Creates a material-prefix lookup error carrying the requested one-based
   * index and stable error code.
   */
  constructor({ index = -1 } = {})
  {
    super("SOF material prefix not found: " + index);
    this.name = "ErrSOFMaterialPrefixNotFound";
    this.code = "EVE_SOF_MATERIAL_PREFIX_NOT_FOUND";
    this.index = index;
  }
}
