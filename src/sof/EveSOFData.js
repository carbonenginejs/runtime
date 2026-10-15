// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Root SOF data catalog. */
@blue.define("EveSOFData")
export class EveSOFData
{

  /** m_faction (PEveSOFDataFactionVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataFaction")
  faction = [];

  /** m_generic (EveSOFDataGenericPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("EveSOFDataGeneric")
  generic = null;

  /** m_hull (PEveSOFDataHullVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHull")
  hull = [];

  /** m_layout (PEveSOFDataLayoutVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataLayout")
  layout = [];

  /** m_material (PEveSOFDataMaterialVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataMaterial")
  material = [];

  /** m_pattern (PEveSOFDataPatternVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataPattern")
  pattern = [];

  /** m_race (PEveSOFDataRaceVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataRace")
  race = [];

}
