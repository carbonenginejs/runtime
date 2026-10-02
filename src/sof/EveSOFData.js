// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";

/** Root SOF data catalog. */
@meta.define({ className: "EveSOFData", family: "eve" })
export class EveSOFData
{

  /** m_faction (PEveSOFDataFactionVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveSOFDataFaction")
  faction = [];

  /** m_generic (EveSOFDataGenericPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("EveSOFDataGeneric")
  generic = null;

  /** m_hull (PEveSOFDataHullVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveSOFDataHull")
  hull = [];

  /** m_layout (PEveSOFDataLayoutVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveSOFDataLayout")
  layout = [];

  /** m_material (PEveSOFDataMaterialVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveSOFDataMaterial")
  material = [];

  /** m_pattern (PEveSOFDataPatternVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveSOFDataPattern")
  pattern = [];

  /** m_race (PEveSOFDataRaceVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveSOFDataRace")
  race = [];

}
