// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { EveSOFDataLogo } from "./EveSOFDataLogo.js";

/** EveSOFDataLogoSet (eve) - generated from schema shapeHash 1a77225e.... */
@type.define({ className: "EveSOFDataLogoSet", family: "eve" })
export class EveSOFDataLogoSet extends CjsModel
{

  static LogoType = Object.freeze({
    TYPE_PRIMARY: 0,
    TYPE_SECONDARY: 1,
    TYPE_TERTIARY: 2,
    TYPE_MARKING_01: 3,
    TYPE_MARKING_02: 4,
    TYPE_MAX: 5
  });

  static Types = Object.freeze([
    "Primary",
    "Secondary",
    "Tertiary",
    "Marking_01",
    "Marking_02"
  ]);

  /** m_logos[TYPE_PRIMARY] (EveSOFDataLogoPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataLogo")
  Primary = null;

  /** m_logos[TYPE_SECONDARY] (EveSOFDataLogoPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataLogo")
  Secondary = null;

  /** m_logos[TYPE_TERTIARY] (EveSOFDataLogoPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataLogo")
  Tertiary = null;

  /** m_logos[TYPE_MARKING_01] (EveSOFDataLogoPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataLogo")
  Marking_01 = null;

  /** m_logos[TYPE_MARKING_02] (EveSOFDataLogoPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataLogo")
  Marking_02 = null;

  /** Validates an enum slot and reports whether that slot contains a logo. */
  Has(type)
  {
    const name = this.constructor.Types[type];
    if (name === undefined) throw new ErrSOFLogoSetTypeUnknown(type);
    return this[name] !== null;
  }

  /** Resolves a defined enum slot to its logo, throwing when the slot is empty. */
  Get(type)
  {
    if (!this.Has(type)) throw new ErrSOFLogoSetTypeNotFound(type);
    return this[this.constructor.Types[type]];
  }

  /**
   * Composes every logo slot from a required base set and optional per-slot
   * overrides into a reusable result.
   */
  static combine(base, overrides, out = null)
  {
    out ??= new this();
    if (!base) return out;
    for (const name of this.Types)
    {
      out[name] = EveSOFDataLogo.combine(base[name], overrides?.[name], out[name]);
    }
    return out;
  }

}

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
