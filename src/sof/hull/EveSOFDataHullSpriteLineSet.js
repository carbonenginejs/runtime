// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Groups named sprite-line items with visibility and skinning policy. */
@blue.define("EveSOFDataHullSpriteLineSet")
export class EveSOFDataHullSpriteLineSet
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_skinned (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  skinned = false;

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  visibilityGroup = "primary";

  /** m_items (PEveSOFDataHullSpriteLineSetItemVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullSpriteLineSetItem")
  items = [];

}
