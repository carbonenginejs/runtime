// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";
import { blue, EnumRegistrationType } from "#blue";
import { EveSOFDataLogo } from "./EveSOFDataLogo.js";
import { ErrSOFLogoSetTypeUnknown } from "./ErrSOFLogoSetTypeUnknown.js";
import { ErrSOFLogoSetTypeNotFound } from "./ErrSOFLogoSetTypeNotFound.js";

/** Provides enum-based primary, secondary, tertiary, and marking-logo lookup plus logo-set composition. */
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
  @edit.persist
  @type.objectRef("EveSOFDataLogo")
  Primary = null;

  /** m_logos[TYPE_SECONDARY] (EveSOFDataLogoPtr) [READWRITE, PERSIST] */
  @edit.persist
  @type.objectRef("EveSOFDataLogo")
  Secondary = null;

  /** m_logos[TYPE_TERTIARY] (EveSOFDataLogoPtr) [READWRITE, PERSIST] */
  @edit.persist
  @type.objectRef("EveSOFDataLogo")
  Tertiary = null;

  /** m_logos[TYPE_MARKING_01] (EveSOFDataLogoPtr) [READWRITE, PERSIST] */
  @edit.persist
  @type.objectRef("EveSOFDataLogo")
  Marking_01 = null;

  /** m_logos[TYPE_MARKING_02] (EveSOFDataLogoPtr) [READWRITE, PERSIST] */
  @edit.persist
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

// Native chooser labels and descriptions are distinct from C++ member names.
blue.enums.RegisterEnum("trinity.EveSOFDataLogoSet.LogoType", EveSOFDataLogoSet.LogoType, {
  source: "trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h", family: "eve", line: 271,
  exposedName: "EveSOFDataLogoSetType", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:60",
  chooser: [
    { name: "Primary", value: EveSOFDataLogoSet.LogoType.TYPE_PRIMARY, description: "Primary Logo" },
    { name: "Secondary", value: EveSOFDataLogoSet.LogoType.TYPE_SECONDARY, description: "Secondary Logo" },
    { name: "Tertiary", value: EveSOFDataLogoSet.LogoType.TYPE_TERTIARY, description: "Tertiary Logo" },
    { name: "Marking_01", value: EveSOFDataLogoSet.LogoType.TYPE_MARKING_01, description: "Marking 01 Logo" },
    { name: "Marking_02", value: EveSOFDataLogoSet.LogoType.TYPE_MARKING_02, description: "Marking 02 Logo" }
  ]
});
