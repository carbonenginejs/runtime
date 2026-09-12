/**
 * Reports that a requested pattern-material prefix is absent from the generic
 * SOF catalog.
 */
export class ErrSOFPatternMaterialPrefixNotFound extends Error
{
  /**
   * Creates a pattern-material-prefix lookup error carrying the requested
   * one-based index and stable error code.
   */
  constructor({ index = -1 } = {})
  {
    super("SOF pattern material prefix not found: " + index);
    this.name = "ErrSOFPatternMaterialPrefixNotFound";
    this.code = "EVE_SOF_PATTERN_MATERIAL_PREFIX_NOT_FOUND";
    this.index = index;
  }
}

function findShader(values, name)
{
  if (!name || !Array.isArray(values)) return null;
  return values.find(value => value?.shader === name) || null;
}
