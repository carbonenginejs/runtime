// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:130-145
import { meta } from "#schema";
import { blue, EnumRegistrationType } from "#blue";
import { ErrSOFAreaTypeNotFound } from "./ErrSOFAreaTypeNotFound.js";

/** Carbon area-material slots in canonical AreaType order.
 * Native IRoot-only data with a self-only Blue table. Owned authored records
 * are not loaded resources; native construction and empty destruction need
 * no additional initialization or update lifecycle.
 */
@meta.define({ className: "EveSOFDataArea", family: "eve" })
export class EveSOFDataArea
{

  /**
   * JavaScript slot-name lookup indexed by AreaType; index 5 is null because
   * native Wreck has no exposed authored slot.
   * @type {Array<string|null>}
   */
  static Types = [
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
  ];

  /**
   * Native numeric area-enum map and canonical chooser vocabulary. TYPE_MAX
   * and TYPE_NO_OVERWRITE share the value 11; neither identifies a stored slot.
   * @type {Object<string, number>}
   */
  static AreaType = {
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
   * Primary-area material names and faction color selector, or null when absent.
   * Native m_materials[TYPE_PRIMARY], READWRITE | PERSIST.
   * @type {EveSOFDataAreaMaterial|null}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("EveSOFDataAreaMaterial")
  Primary = null;

  /**
   * Glass-area material names and faction color selector, or null when absent.
   * Native m_materials[TYPE_GLASS], READWRITE | PERSIST.
   * @type {EveSOFDataAreaMaterial|null}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("EveSOFDataAreaMaterial")
  Glass = null;

  /**
   * Sails-area material names and faction color selector, or null when absent.
   * Native m_materials[TYPE_SAILS], READWRITE | PERSIST.
   * @type {EveSOFDataAreaMaterial|null}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("EveSOFDataAreaMaterial")
  Sails = null;

  /**
   * Reactor-area material names and faction color selector, or null when absent.
   * Native m_materials[TYPE_REACTOR], READWRITE | PERSIST.
   * @type {EveSOFDataAreaMaterial|null}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("EveSOFDataAreaMaterial")
  Reactor = null;

  /**
   * Darkhull-area material names and faction color selector, or null when absent.
   * Native m_materials[TYPE_DARKHULL], READWRITE | PERSIST.
   * @type {EveSOFDataAreaMaterial|null}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("EveSOFDataAreaMaterial")
  Darkhull = null;

  /**
   * Rock-area material names and faction color selector, or null when absent.
   * Native m_materials[TYPE_ROCK], READWRITE | PERSIST.
   * @type {EveSOFDataAreaMaterial|null}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("EveSOFDataAreaMaterial")
  Rock = null;

  /**
   * Monument-area material names and faction color selector, or null when absent.
   * Native m_materials[TYPE_MONUMENT], READWRITE | PERSIST.
   * @type {EveSOFDataAreaMaterial|null}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("EveSOFDataAreaMaterial")
  Monument = null;

  /**
   * Ornament-area material names and faction color selector, or null when absent.
   * Native m_materials[TYPE_ORNAMENT], READWRITE | PERSIST.
   * @type {EveSOFDataAreaMaterial|null}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("EveSOFDataAreaMaterial")
  Ornament = null;

  /**
   * Simple-primary material names and faction color selector, or null when absent.
   * Native m_materials[TYPE_SIMPLEPRIMARY], READWRITE | PERSIST.
   * @type {EveSOFDataAreaMaterial|null}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("EveSOFDataAreaMaterial")
  SimplePrimary = null;

  /**
   * Turret-area material names and faction color selector, or null when absent.
   * Native m_materials[TYPE_TURRET], READWRITE | PERSIST.
   * @type {EveSOFDataAreaMaterial|null}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("EveSOFDataAreaMaterial")
  Turret = null;

  /**
   * Maps a canonical area enum index to its stored material, returning null for
   * unmapped or empty slots.
   * Custom: retained JavaScript slot lookup, not a native exposed method.
   * @param {number} type Native area index.
   * @returns {EveSOFDataAreaMaterial|null} The selected record or null.
   */
  @meta.ours
  GetTypeByIndex(type)
  {
    const name = this.constructor.Types[type];
    return name ? this[name] : null;
  }

  /**
   * Reports whether the canonical area enum slot resolves to a material.
   * Custom: retained JavaScript SOF lookup convenience.
   * @param {number} type Native area index.
   * @returns {boolean} Whether the slot contains a record.
   */
  @meta.ours
  Has(type)
  {
    return this.GetTypeByIndex(type) !== null;
  }

  /**
   * Returns the material in a canonical area slot or throws when the slot is
   * empty.
   * Custom: retained JavaScript SOF lookup convenience.
   * @param {number} type Native area index.
   * @returns {EveSOFDataAreaMaterial} The selected record.
   * @throws {ErrSOFAreaTypeNotFound} When the slot has no material.
   */
  @meta.ours
  Get(type)
  {
    const value = this.GetTypeByIndex(type);
    if (value === null) throw new ErrSOFAreaTypeNotFound(type);
    return value;
  }

}

// Native chooser labels and descriptions are distinct from C++ member names.
blue.enums.Create("trinity.EveSOFDataArea.AreaType", EveSOFDataArea.AreaType, {
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

meta.blue.interfaceTable({
  interfaces: [ EveSOFDataArea ],
  chainTo: null
})(EveSOFDataArea);
