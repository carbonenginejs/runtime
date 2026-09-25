// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Names and describes a generic visibility group. */
@type.define({ className: "EveSOFDataVisibilityGroup", family: "eve" })
export class EveSOFDataVisibilityGroup extends CjsModel
{

  /** m_description (std::string) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  description = "";

  /** m_name (std::string) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  name = "";

}
