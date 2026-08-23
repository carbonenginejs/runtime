// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataLayout (eve) - generated from schema shapeHash 8fb7e831.... */
@type.define({ className: "EveSOFDataLayout", family: "eve" })
export class EveSOFDataLayout extends CjsModel
{

  /** m_depletionCounters (PEveSOFDataDistributionDepletionCounterVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataDistributionDepletionCounter")
  depletionCounters = [];

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_placements (PIEveSOFDataHullExtensionPlacementVector) [READ, PERSIST] */
  @io.persist
  @type.list("IEveSOFDataHullExtensionPlacement")
  placements = [];

  /** m_randomizeSeedOnLoad (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  randomizeSeedOnLoad = false;

  /** m_seed (int32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.int32
  seed = 1337;

}
