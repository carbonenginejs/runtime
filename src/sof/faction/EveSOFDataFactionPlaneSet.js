// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";
import { vec4 } from "#math/vec4";

/** Names a faction plane-set group and supplies its color. */
@meta.define({ className: "EveSOFDataFactionPlaneSet", family: "eve" })
export class EveSOFDataFactionPlaneSet
{

  /** m_groupIndex (int32_t) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  groupIndex = -1;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_color (Color) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  color = vec4.create();

}
