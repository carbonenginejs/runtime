import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h:352-383
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:113-145
import { blue } from "#schema";
import { blue as be, EnumRegistrationType } from "#blue";

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

/** One exposed `m_materials[type]` slot, named by its chooser key (EveSOFData_Blue.cpp:135-144). */
const slot = (name, index) => ({ name, key: "materials", index, type: { kind: "rootRef", className: "EveSOFDataAreaMaterial" },
  edit: { read: true, write: true, persist: true } });

/**
 * Area-material slots: `EveSOFDataAreaMaterialPtr m_materials[TYPE_MAX]`,
 * exposed by chooser name. TYPE_WRECK has no exposed slot, so it is never
 * read or written and stays null. Native IRoot-only data with no lifecycle.
 */
@blue.define({
  className: "EveSOFDataArea",
  members: [
  slot("Primary", AreaType.TYPE_PRIMARY),
  slot("Glass", AreaType.TYPE_GLASS),
  slot("Sails", AreaType.TYPE_SAILS),
  slot("Reactor", AreaType.TYPE_REACTOR),
  slot("Darkhull", AreaType.TYPE_DARKHULL),
  slot("Rock", AreaType.TYPE_ROCK),
  slot("Monument", AreaType.TYPE_MONUMENT),
  slot("Ornament", AreaType.TYPE_ORNAMENT),
  slot("SimplePrimary", AreaType.TYPE_SIMPLEPRIMARY),
  slot("Turret", AreaType.TYPE_TURRET)
]
})
@blue.interface()
@blue.inherit(IRoot)
export class EveSOFDataArea extends IRoot
{
  static AreaType = AreaType;

  /**
   * m_materials: one area material per AreaType, or null.
   * @type {Array<EveSOFDataAreaMaterial|null>}
   */
  materials = new Array(AreaType.TYPE_MAX).fill(null);
}

// Native chooser labels and descriptions are distinct from C++ member names.
be.enums.Create("trinity.EveSOFDataArea.AreaType", AreaType, {
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
