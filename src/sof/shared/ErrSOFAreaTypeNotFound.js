/** Reports that a requested canonical area slot has no material assigned. */
export class ErrSOFAreaTypeNotFound extends Error
{
  /**
   * Creates the missing-area error for the requested canonical slot and records
   * its enum value.
   */
  constructor(type)
  {
    super(`SOF area type not found (${type})`);
    this.name = "ErrSOFAreaTypeNotFound";
    this.code = "EVE_SOF_AREA_TYPE_NOT_FOUND";
    this.type = type;
  }
}
