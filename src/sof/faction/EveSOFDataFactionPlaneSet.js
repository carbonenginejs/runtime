// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";
import { vec4 } from "#math/vec4";

/** Names a faction plane-set group and supplies its color. */
@blue.define("EveSOFDataFactionPlaneSet")
export class EveSOFDataFactionPlaneSet
{

  /** m_groupIndex (int32_t) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.int32
  groupIndex = -1;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_color (Color) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.color
  color = vec4.create();

}
