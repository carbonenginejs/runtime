import { exposure as be } from "#be";
import { IRoot } from "../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Root SOF data catalog. */
@be.define("EveSOFData")
@blue.inherit(IRoot)
export class EveSOFData
{

  /** m_faction (PEveSOFDataFactionVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataFaction")
  faction = [];

  /** m_generic (EveSOFDataGenericPtr) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.rootRef("EveSOFDataGeneric")
  generic = null;

  /** m_hull (PEveSOFDataHullVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataHull")
  hull = [];

  /** m_layout (PEveSOFDataLayoutVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataLayout")
  layout = [];

  /** m_material (PEveSOFDataMaterialVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataMaterial")
  material = [];

  /** m_pattern (PEveSOFDataPatternVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataPattern")
  pattern = [];

  /** m_race (PEveSOFDataRaceVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataRace")
  race = [];

}
