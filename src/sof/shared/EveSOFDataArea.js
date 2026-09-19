// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";
import { blue, EnumRegistrationType } from "#blue";
import { ErrSOFAreaTypeNotFound } from "./ErrSOFAreaTypeNotFound.js";

/** Carbon area-material slots in canonical AreaType order. */
@type.define({ className: "EveSOFDataArea", family: "eve" })
export class EveSOFDataArea extends CjsModel
{

  static Types = Object.freeze([
    "Primary",
    "Glass",
    "Sails",
    "Reactor",
    "Darkhull",
    null,
    "Rock",
    "Monument",
    "Ornament",
    "SimplePrimary",
    "Turret"
  ]);

  static AreaType = Object.freeze({
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
  });

  /** m_materials[TYPE_PRIMARY] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
  @edit.persist
  @type.objectRef("EveSOFDataAreaMaterial")
  Primary = null;

  /** m_materials[TYPE_GLASS] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
  @edit.persist
  @type.objectRef("EveSOFDataAreaMaterial")
  Glass = null;

  /** m_materials[TYPE_SAILS] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
  @edit.persist
  @type.objectRef("EveSOFDataAreaMaterial")
  Sails = null;

  /** m_materials[TYPE_REACTOR] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
  @edit.persist
  @type.objectRef("EveSOFDataAreaMaterial")
  Reactor = null;

  /** m_materials[TYPE_DARKHULL] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
  @edit.persist
  @type.objectRef("EveSOFDataAreaMaterial")
  Darkhull = null;

  /** m_materials[TYPE_ROCK] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
  @edit.persist
  @type.objectRef("EveSOFDataAreaMaterial")
  Rock = null;

  /** m_materials[TYPE_MONUMENT] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
  @edit.persist
  @type.objectRef("EveSOFDataAreaMaterial")
  Monument = null;

  /** m_materials[TYPE_ORNAMENT] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
  @edit.persist
  @type.objectRef("EveSOFDataAreaMaterial")
  Ornament = null;

  /** m_materials[TYPE_SIMPLEPRIMARY] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
  @edit.persist
  @type.objectRef("EveSOFDataAreaMaterial")
  SimplePrimary = null;

  /** m_materials[TYPE_TURRET] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
  @edit.persist
  @type.objectRef("EveSOFDataAreaMaterial")
  Turret = null;

  /**
   * Maps a canonical area enum index to its stored material, returning null for
   * unmapped or empty slots.
   */
  GetTypeByIndex(type)
  {
    const name = this.constructor.Types[type];
    return name ? this[name] : null;
  }

  /** Reports whether the canonical area enum slot resolves to a material. */
  Has(type)
  {
    return this.GetTypeByIndex(type) !== null;
  }

  /**
   * Returns the material in a canonical area slot or throws when the slot is
   * empty.
   */
  Get(type)
  {
    const value = this.GetTypeByIndex(type);
    if (value === null) throw new ErrSOFAreaTypeNotFound(type);
    return value;
  }

}

// Native chooser labels and descriptions are distinct from C++ member names.
blue.enums.RegisterEnum("trinity.EveSOFDataArea.AreaType", EveSOFDataArea.AreaType, {
  source: "trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h", family: "eve", line: 363,
  exposedName: "EveSOFDataAreaType", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:113",
  chooser: [
    { name: "Primary", value: EveSOFDataArea.AreaType.TYPE_PRIMARY, description: "Primary Area Type" },
    { name: "Glass", value: EveSOFDataArea.AreaType.TYPE_GLASS, description: "Area Type Glass" },
    { name: "Sails", value: EveSOFDataArea.AreaType.TYPE_SAILS, description: "Area Type Sails" },
    { name: "Reactor", value: EveSOFDataArea.AreaType.TYPE_REACTOR, description: "Area Type Reactor" },
    { name: "Darkhull", value: EveSOFDataArea.AreaType.TYPE_DARKHULL, description: "Area Type Dark Hull" },
    { name: "Wreck", value: EveSOFDataArea.AreaType.TYPE_WRECK, description: "Area Type Generic Wreck" },
    { name: "Rock", value: EveSOFDataArea.AreaType.TYPE_ROCK, description: "Area Type Rock" },
    { name: "Monument", value: EveSOFDataArea.AreaType.TYPE_MONUMENT, description: "Area Type Monument" },
    { name: "Ornament", value: EveSOFDataArea.AreaType.TYPE_ORNAMENT, description: "Area Type Ornament" },
    { name: "SimplePrimary", value: EveSOFDataArea.AreaType.TYPE_SIMPLEPRIMARY, description: "Simple Primary Area Type" },
    { name: "Turret", value: EveSOFDataArea.AreaType.TYPE_TURRET, description: "Area Type Turrets" },
    { name: "NoOverwrite", value: EveSOFDataArea.AreaType.TYPE_NO_OVERWRITE, description: "Area Type No Overwrite" }
  ]
});
