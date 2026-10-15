import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Stores a named integer counter used to deplete layout-distribution capacity deterministically. */
@blue.define("EveSOFDataDistributionDepletionCounter")
@blue.inherit(IRoot)
export class EveSOFDataDistributionDepletionCounter
{

  /** m_value (int32_t) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.int32
  value = 1;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

}
