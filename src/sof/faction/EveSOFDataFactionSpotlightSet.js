// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";
import { vec4 } from "#math/vec4";

/** Names a faction spotlight-set group and supplies its cone, sprite, and flare colors. */
@type.define({ className: "EveSOFDataFactionSpotlightSet", family: "eve" })
export class EveSOFDataFactionSpotlightSet extends CjsModel
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

  /** m_coneColor (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  coneColor = vec4.create();

  /** m_spriteColor (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  spriteColor = vec4.create();

  /** m_flareColor (Color) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.color
  flareColor = vec4.create();

}
