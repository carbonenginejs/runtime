// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** Root SOF data catalog. */
@type.define({ className: "EveSOFData", family: "eve" })
export class EveSOFData extends CjsModel
{

  /** m_faction (PEveSOFDataFactionVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataFaction")
  faction = [];

  /** m_generic (EveSOFDataGenericPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataGeneric")
  generic = null;

  /** m_hull (PEveSOFDataHullVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataHull")
  hull = [];

  /** m_layout (PEveSOFDataLayoutVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataLayout")
  layout = [];

  /** m_material (PEveSOFDataMaterialVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataMaterial")
  material = [];

  /** m_pattern (PEveSOFDataPatternVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataPattern")
  pattern = [];

  /** m_race (PEveSOFDataRaceVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataRace")
  race = [];

}
