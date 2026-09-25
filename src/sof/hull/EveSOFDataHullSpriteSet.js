// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Groups named sprite items with visibility and skinning policy. */
@type.define({ className: "EveSOFDataHullSpriteSet", family: "eve" })
export class EveSOFDataHullSpriteSet extends CjsModel
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  name = "";

  /** m_skinned (bool) [READWRITE, PERSIST] */
  @edit.persist
  @type.boolean
  skinned = false;

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  visibilityGroup = "primary";

  /** m_items (PEveSOFDataHullSpriteSetItemVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataHullSpriteSetItem")
  items = [];

}
