// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Stores a named integer counter used to deplete layout-distribution capacity deterministically. */
@type.define({ className: "EveSOFDataDistributionDepletionCounter", family: "eve" })
export class EveSOFDataDistributionDepletionCounter extends CjsModel
{

  /** m_value (int32_t) [READWRITE, PERSIST] */
  @edit.persist
  @type.int32
  value = 1;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  name = "";

}
