/** Reports that a known faction-color slot has no color assigned. */
export class ErrSOFFactionColorSetTypeNotFound extends Error
{
  /**
   * Creates the missing-color error for an unpopulated known slot and records
   * the requested value.
   */
  constructor(type)
  {
    super("SOF faction color set type not found (" + type + ")");
    this.name = "ErrSOFFactionColorSetTypeNotFound";
    this.code = "EVE_SOF_FACTION_COLOR_TYPE_NOT_FOUND";
    this.type = type;
  }
}
