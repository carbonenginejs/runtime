// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";
import { blue, EnumRegistrationType } from "#blue";
import { EveSOFDataLogo } from "./EveSOFDataLogo.js";
import { ErrSOFLogoSetTypeUnknown } from "./ErrSOFLogoSetTypeUnknown.js";
import { ErrSOFLogoSetTypeNotFound } from "./ErrSOFLogoSetTypeNotFound.js";

/** Provides enum-based primary, secondary, tertiary, and marking-logo lookup plus logo-set composition. */
@meta.define({ className: "EveSOFDataLogoSet", family: "eve" })
export class EveSOFDataLogoSet
{

  /** Native logo-slot enum, including TYPE_MAX as the non-slot count sentinel.
   * @type {Readonly<Object<string, number>>}
   */
  static LogoType = {
    TYPE_PRIMARY: 0,
    TYPE_SECONDARY: 1,
    TYPE_TERTIARY: 2,
    TYPE_MARKING_01: 3,
    TYPE_MARKING_02: 4,
    TYPE_MAX: 5
  };

  /** Enum-indexed slot names used by the JavaScript lookup and composition helpers.
   * @type {ReadonlyArray<string>}
   */
  static Types = Object.freeze([
    "Primary",
    "Secondary",
    "Tertiary",
    "Marking_01",
    "Marking_02"
  ]);

  /** Optional primary logo record; native EveSOFDataLogoPtr, READWRITE/PERSIST.
   * @type {EveSOFDataLogo|null}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("EveSOFDataLogo")
  Primary = null;

  /** Optional secondary logo record; native EveSOFDataLogoPtr, READWRITE/PERSIST.
   * @type {EveSOFDataLogo|null}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("EveSOFDataLogo")
  Secondary = null;

  /** Optional tertiary logo record; native EveSOFDataLogoPtr, READWRITE/PERSIST.
   * @type {EveSOFDataLogo|null}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("EveSOFDataLogo")
  Tertiary = null;

  /** Optional first marking logo record; native EveSOFDataLogoPtr, READWRITE/PERSIST.
   * @type {EveSOFDataLogo|null}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("EveSOFDataLogo")
  Marking_01 = null;

  /** Optional second marking logo record; native EveSOFDataLogoPtr, READWRITE/PERSIST.
   * @type {EveSOFDataLogo|null}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("EveSOFDataLogo")
  Marking_02 = null;

  /** Validates an enum slot and checks for a logo; a JS-only helper.
   * @param {number} type LogoType slot value.
   * @returns {boolean} Whether the slot is non-null; an unknown slot throws.
   */
  @meta.ours
  Has(type)
  {
    const name = this.constructor.Types[type];
    if (name === undefined) throw new ErrSOFLogoSetTypeUnknown(type);
    return this[name] !== null;
  }

  /** Resolves a logo through the JS lookup, throwing for unknown or empty slots.
   * @param {number} type LogoType slot value.
   * @returns {EveSOFDataLogo} The requested logo.
   */
  @meta.ours
  Get(type)
  {
    if (!this.Has(type)) throw new ErrSOFLogoSetTypeNotFound(type);
    return this[this.constructor.Types[type]];
  }

  /**
   * Composes every logo slot from a required base set and optional per-slot
   * overrides into a reusable result. This is a JS-only composition helper;
   * a missing base slot creates an empty logo when no output exists, otherwise
   * it retains the existing output unchanged.
   * @param {EveSOFDataLogoSet|null} base Base set; null leaves output unchanged.
   * @param {EveSOFDataLogoSet|null} overrides Optional per-slot overrides.
   * @param {EveSOFDataLogoSet|null} [out=null] Reused output, or a new set when null.
   * @returns {EveSOFDataLogoSet} The output set.
   */
  @meta.ours
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
blue.enums.Create("trinity.EveSOFDataLogoSet.LogoType", EveSOFDataLogoSet.LogoType, {
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

// Native IRoot-only data exposes its own identity, with no lifecycle/update contract.
meta.blue.interfaceTable({ interfaces: [EveSOFDataLogoSet], chainTo: null })(EveSOFDataLogoSet);
