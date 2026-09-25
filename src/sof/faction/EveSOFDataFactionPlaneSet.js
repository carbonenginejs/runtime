// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";
import { vec4 } from "#math/vec4";

/** Names a faction plane-set group and supplies its color. */
@type.define({ className: "EveSOFDataFactionPlaneSet", family: "eve" })
export class EveSOFDataFactionPlaneSet extends CjsModel
{

  /** m_groupIndex (int32_t) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.int32
  groupIndex = -1;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  /** m_color (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  color = vec4.create();

}
