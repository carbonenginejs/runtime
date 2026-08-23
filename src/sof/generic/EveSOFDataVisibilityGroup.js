// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataVisibilityGroup (eve) - generated from schema shapeHash a4e27d72.... */
@type.define({ className: "EveSOFDataVisibilityGroup", family: "eve" })
export class EveSOFDataVisibilityGroup extends CjsModel
{

  /** m_description (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  description = "";

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

}
