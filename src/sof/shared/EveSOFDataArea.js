import { IRoot } from "../../blue/exposure/IRoot.js";
import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h:352-383
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:113-145
import { type } from "#schema";
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
@be.define({
  name: "EveSOFDataArea",
  inherit: [ IRoot ],
  // EveSOFData_Blue.cpp:132-144, in Carbon's order.
  members: [
    [ be.ATTR_INDEX, "Primary", be.READWRITE | be.PERSIST, AreaType.TYPE_PRIMARY, "materials" ],
    [ be.ATTR_INDEX, "Glass", be.READWRITE | be.PERSIST, AreaType.TYPE_GLASS, "materials" ],
    [ be.ATTR_INDEX, "Sails", be.READWRITE | be.PERSIST, AreaType.TYPE_SAILS, "materials" ],
    [ be.ATTR_INDEX, "Reactor", be.READWRITE | be.PERSIST, AreaType.TYPE_REACTOR, "materials" ],
    [ be.ATTR_INDEX, "Darkhull", be.READWRITE | be.PERSIST, AreaType.TYPE_DARKHULL, "materials" ],
    [ be.ATTR_INDEX, "Rock", be.READWRITE | be.PERSIST, AreaType.TYPE_ROCK, "materials" ],
    [ be.ATTR_INDEX, "Monument", be.READWRITE | be.PERSIST, AreaType.TYPE_MONUMENT, "materials" ],
    [ be.ATTR_INDEX, "Ornament", be.READWRITE | be.PERSIST, AreaType.TYPE_ORNAMENT, "materials" ],
    [ be.ATTR_INDEX, "SimplePrimary", be.READWRITE | be.PERSIST, AreaType.TYPE_SIMPLEPRIMARY, "materials" ],
    [ be.ATTR_INDEX, "Turret", be.READWRITE | be.PERSIST, AreaType.TYPE_TURRET, "materials" ]
  ]
})
export class EveSOFDataArea extends IRoot
{
  static AreaType = AreaType;

  /**
   * m_materials: one area material per AreaType, or null.
   * @type {Array<EveSOFDataAreaMaterial|null>}
   */
  @type.object.ref.array("EveSOFDataAreaMaterial", AreaType.TYPE_MAX)
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
