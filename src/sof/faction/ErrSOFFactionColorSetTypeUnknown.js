/** Reports that a faction-color lookup used an unknown color-slot enum value. */
export class ErrSOFFactionColorSetTypeUnknown extends RangeError
{
  /**
   * Creates the range error for an unknown faction-color enum value and records
   * that value.
   */
  constructor(type)
  {
    super("SOF faction color set type unknown (" + type + ")");
    this.name = "ErrSOFFactionColorSetTypeUnknown";
    this.code = "EVE_SOF_FACTION_COLOR_TYPE_UNKNOWN";
    this.type = type;
  }
}
