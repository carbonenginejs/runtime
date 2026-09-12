/** Reports that a logo lookup used an undefined logo-slot enum value. */
export class ErrSOFLogoSetTypeUnknown extends RangeError
{
  /**
   * Creates the range error for an undefined logo-slot enum value and records
   * that value.
   */
  constructor(type)
  {
    super("SOF logo set type unknown (" + type + ")");
    this.name = "ErrSOFLogoSetTypeUnknown";
    this.code = "EVE_SOF_LOGO_TYPE_UNKNOWN";
    this.type = type;
  }
}
