// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";
import { vec4 } from "#math/vec4";

/** Names a faction spotlight-set group and supplies its cone, sprite, and flare colors. */
@meta.define({ className: "EveSOFDataFactionSpotlightSet", family: "eve" })
export class EveSOFDataFactionSpotlightSet
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

  /** m_coneColor (Color) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  coneColor = vec4.create();

  /** m_spriteColor (Color) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  spriteColor = vec4.create();

  /** m_flareColor (Color) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  flareColor = vec4.create();

}
