import { IRoot } from "../../blue/blueexposure/IRoot.js";
import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h:352-383
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:113-145
import { type, blue as legacyBlue } from "#schema";
import { blue, EnumRegistrationType } from "#blue";

/**
 * `EveSOFDataArea::AreaType` (EveSOFData.h:363-377). TYPE_MAX and
 * TYPE_NO_OVERWRITE share the value 11; neither is a stored slot.
 * @type {Object<string, number>}
 */
const AreaType = {
  TYPE_PRIMARY: 0,
  TYPE_GLASS: 1,
  TYPE_SAILS: 2,
  TYPE_REACTOR: 3,
  TYPE_DARKHULL: 4,
  TYPE_WRECK: 5,
  TYPE_ROCK: 6,
  TYPE_MONUMENT: 7,
  TYPE_ORNAMENT: 8,
  TYPE_SIMPLEPRIMARY: 9,
  TYPE_TURRET: 10,
  TYPE_MAX: 11,
  TYPE_NO_OVERWRITE: 11
};

/**
 * Area-material slots: `EveSOFDataAreaMaterialPtr m_materials[TYPE_MAX]`,
 * exposed by chooser name. TYPE_WRECK has no exposed slot, so it is never
 * read or written and stays null. Native IRoot-only data with no lifecycle.
 */
@be.define("EveSOFDataArea")
@legacyBlue.inherit(IRoot)
export class EveSOFDataArea extends IRoot
{
  static AreaType = AreaType;

  /**
   * m_materials: one area material per AreaType, or null.
   * @type {Array<EveSOFDataAreaMaterial|null>}
   */
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Primary", AreaType.TYPE_PRIMARY)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Glass", AreaType.TYPE_GLASS)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Sails", AreaType.TYPE_SAILS)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Reactor", AreaType.TYPE_REACTOR)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Darkhull", AreaType.TYPE_DARKHULL)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Rock", AreaType.TYPE_ROCK)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Monument", AreaType.TYPE_MONUMENT)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Ornament", AreaType.TYPE_ORNAMENT)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "SimplePrimary", AreaType.TYPE_SIMPLEPRIMARY)
  @be.mapAttribute__Index(be.READWRITE | be.PERSIST, "Turret", AreaType.TYPE_TURRET)
  @type.array({ kind: "rootRef", className: "EveSOFDataAreaMaterial" })
  materials = new Array(AreaType.TYPE_MAX).fill(null);
}

// Native chooser labels and descriptions are distinct from C++ member names.
blue.enums.Create("trinity.EveSOFDataArea.AreaType", AreaType, {
  exposedName: "EveSOFDataAreaType", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooser: [
    { name: "Primary", value: AreaType.TYPE_PRIMARY, description: "Primary Area Type" },
    { name: "Glass", value: AreaType.TYPE_GLASS, description: "Area Type Glass" },
    { name: "Sails", value: AreaType.TYPE_SAILS, description: "Area Type Sails" },
    { name: "Reactor", value: AreaType.TYPE_REACTOR, description: "Area Type Reactor" },
    { name: "Darkhull", value: AreaType.TYPE_DARKHULL, description: "Area Type Dark Hull" },
    { name: "Wreck", value: AreaType.TYPE_WRECK, description: "Area Type Generic Wreck" },
    { name: "Rock", value: AreaType.TYPE_ROCK, description: "Area Type Rock" },
    { name: "Monument", value: AreaType.TYPE_MONUMENT, description: "Area Type Monument" },
    { name: "Ornament", value: AreaType.TYPE_ORNAMENT, description: "Area Type Ornament" },
    { name: "SimplePrimary", value: AreaType.TYPE_SIMPLEPRIMARY, description: "Simple Primary Area Type" },
    { name: "Turret", value: AreaType.TYPE_TURRET, description: "Area Type Turrets" },
    { name: "NoOverwrite", value: AreaType.TYPE_NO_OVERWRITE, description: "Area Type No Overwrite" }
  ]
});
