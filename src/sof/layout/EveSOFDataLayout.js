// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Defines a named, seeded top-level layout with placements, counters, and randomization policy. */
@type.define({ className: "EveSOFDataLayout", family: "eve" })
export class EveSOFDataLayout extends CjsModel
{

  /** m_depletionCounters (PEveSOFDataDistributionDepletionCounterVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataDistributionDepletionCounter")
  depletionCounters = [];

  /** m_name (std::string) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  name = "";

  /** m_placements (PIEveSOFDataHullExtensionPlacementVector) [READ, PERSIST] */
  @edit.persist
  @type.list("IEveSOFDataHullExtensionPlacement")
  placements = [];

  /** m_randomizeSeedOnLoad (bool) [READWRITE, PERSIST] */
  @edit.persist
  @type.boolean
  randomizeSeedOnLoad = false;

  /** m_seed (int32_t) [READWRITE, PERSIST] */
  @edit.persist
  @type.int32
  seed = 1337;

}
