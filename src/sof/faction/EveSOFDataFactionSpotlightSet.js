import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";
import { vec4 } from "#math/vec4";

/** Names a faction spotlight-set group and supplies its cone, sprite, and flare colors. */
@be.define("EveSOFDataFactionSpotlightSet")

@blue.inherit(IRoot)
export class EveSOFDataFactionSpotlightSet
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

  /** m_coneColor (Color) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.color
  coneColor = vec4.create();

  /** m_spriteColor (Color) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.color
  spriteColor = vec4.create();

  /** m_flareColor (Color) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.color
  flareColor = vec4.create();

}
