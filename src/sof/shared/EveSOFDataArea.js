// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";

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
  @io.persist
  @type.objectRef("EveSOFDataAreaMaterial")
  Primary = null;

  /** m_materials[TYPE_GLASS] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataAreaMaterial")
  Glass = null;

  /** m_materials[TYPE_SAILS] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataAreaMaterial")
  Sails = null;

  /** m_materials[TYPE_REACTOR] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataAreaMaterial")
  Reactor = null;

  /** m_materials[TYPE_DARKHULL] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataAreaMaterial")
  Darkhull = null;

  /** m_materials[TYPE_ROCK] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataAreaMaterial")
  Rock = null;

  /** m_materials[TYPE_MONUMENT] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataAreaMaterial")
  Monument = null;

  /** m_materials[TYPE_ORNAMENT] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataAreaMaterial")
  Ornament = null;

  /** m_materials[TYPE_SIMPLEPRIMARY] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataAreaMaterial")
  SimplePrimary = null;

  /** m_materials[TYPE_TURRET] (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
  @io.persist
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

/** Reports that a requested canonical area slot has no material assigned. */
export class ErrSOFAreaTypeNotFound extends Error
{
  /**
   * Creates the missing-area error for the requested canonical slot and records
   * its enum value.
   */
  constructor(type)
  {
    super(`SOF area type not found (${type})`);
    this.name = "ErrSOFAreaTypeNotFound";
    this.code = "EVE_SOF_AREA_TYPE_NOT_FOUND";
    this.type = type;
  }
}
