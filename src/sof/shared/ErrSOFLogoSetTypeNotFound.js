/** Reports that a defined logo slot has no logo assigned. */
export class ErrSOFLogoSetTypeNotFound extends Error
{
  /**
   * Creates the missing-logo error for an unpopulated defined slot and records
   * the requested value.
   */
  constructor(type)
  {
    super("SOF logo set type not found (" + type + ")");
    this.name = "ErrSOFLogoSetTypeNotFound";
    this.code = "EVE_SOF_LOGO_TYPE_NOT_FOUND";
    this.type = type;
  }
}
