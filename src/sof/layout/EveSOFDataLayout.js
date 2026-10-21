import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Defines a named, seeded top-level layout with placements, counters, and randomization policy. */
@be.define("EveSOFDataLayout")
@blue.inherit(IRoot)
export class EveSOFDataLayout
{

  /** m_depletionCounters (PEveSOFDataDistributionDepletionCounterVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataDistributionDepletionCounter")
  depletionCounters = [];

  /** m_name (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_placements (PIEveSOFDataHullExtensionPlacementVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("IEveSOFDataHullExtensionPlacement")
  placements = [];

  /** m_randomizeSeedOnLoad (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  randomizeSeedOnLoad = false;

  /** m_seed (int32_t) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.int32
  seed = 1337;

}
