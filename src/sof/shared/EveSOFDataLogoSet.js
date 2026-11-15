import { IRoot } from "../../blue/exposure/IRoot.js";
import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h:260-284
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:60-66, 1125-1133
import { type } from "#schema";
import { blue, EnumRegistrationType } from "#blue";
import { EveSOFDataLogo } from "./EveSOFDataLogo.js";

/**
 * `EveSOFDataLogoSet::LogoType` (EveSOFData.h:271-279); TYPE_MAX is the slot count.
 * @type {Object<string, number>}
 */
const LogoType = {
  TYPE_PRIMARY: 0,
  TYPE_SECONDARY: 1,
  TYPE_TERTIARY: 2,
  TYPE_MARKING_01: 3,
  TYPE_MARKING_02: 4,
  TYPE_MAX: 5
};

/**
 * Logo slots: `EveSOFDataLogoPtr m_logos[TYPE_MAX]`, exposed by chooser name.
 * Native IRoot-only data with no lifecycle.
 */
@be.define({
  name: "EveSOFDataLogoSet",
  inherit: [ IRoot ],
  // EveSOFData_Blue.cpp:1125-1132, in Carbon's order.
  members: [
    [ be.ATTR_INDEX, "Primary", be.READWRITE | be.PERSIST, LogoType.TYPE_PRIMARY, "logos" ],
    [ be.ATTR_INDEX, "Secondary", be.READWRITE | be.PERSIST, LogoType.TYPE_SECONDARY, "logos" ],
    [ be.ATTR_INDEX, "Tertiary", be.READWRITE | be.PERSIST, LogoType.TYPE_TERTIARY, "logos" ],
    [ be.ATTR_INDEX, "Marking_01", be.READWRITE | be.PERSIST, LogoType.TYPE_MARKING_01, "logos" ],
    [ be.ATTR_INDEX, "Marking_02", be.READWRITE | be.PERSIST, LogoType.TYPE_MARKING_02, "logos" ]
  ]
})
export class EveSOFDataLogoSet extends IRoot
{
  static LogoType = LogoType;

  /**
   * m_logos: one logo per LogoType, or null.
   * @type {Array<EveSOFDataLogo|null>}
   */
  @type.object.ref.array("EveSOFDataLogo", LogoType.TYPE_MAX)
  logos = new Array(LogoType.TYPE_MAX).fill(null);

  /**
   * Composes every logo slot from a base set and optional per-slot overrides
   * into a reusable result; a missing base slot creates an empty logo when no
   * output exists, otherwise it keeps the existing output.
   *
   * Custom: JavaScript composition helper over the logo slots, not a native method.
   * @param {EveSOFDataLogoSet|null} base Base set; null leaves output unchanged.
   * @param {EveSOFDataLogoSet|null} overrides Optional per-slot overrides.
   * @param {EveSOFDataLogoSet|null} [out=null] Reused output, or a new set when null.
   * @returns {EveSOFDataLogoSet} The output set.
   */
  static combine(base, overrides, out = null)
  {
    out ??= new this();
    if (!base) return out;
    for (let type = 0; type < LogoType.TYPE_MAX; type++)
    {
      out.logos[type] = EveSOFDataLogo.combine(base.logos[type], overrides ? overrides.logos[type] : null, out.logos[type]);
    }
    return out;
  }
}

// Native chooser labels and descriptions are distinct from C++ member names.
blue.enums.Create("trinity.EveSOFDataLogoSet.LogoType", LogoType, {
  exposedName: "EveSOFDataLogoSetType", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooser: [
    { name: "Primary", value: LogoType.TYPE_PRIMARY, description: "Primary Logo" },
    { name: "Secondary", value: LogoType.TYPE_SECONDARY, description: "Secondary Logo" },
    { name: "Tertiary", value: LogoType.TYPE_TERTIARY, description: "Tertiary Logo" },
    { name: "Marking_01", value: LogoType.TYPE_MARKING_01, description: "Marking 01 Logo" },
    { name: "Marking_02", value: LogoType.TYPE_MARKING_02, description: "Marking 02 Logo" }
  ]
});
