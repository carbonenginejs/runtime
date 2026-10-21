import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Stores a named integer counter used to deplete layout-distribution capacity deterministically. */
@be.define("EveSOFDataDistributionDepletionCounter")
@blue.inherit(IRoot)
export class EveSOFDataDistributionDepletionCounter
{

  /** m_value (int32_t) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.int32
  value = 1;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

}
