// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataHullSpriteLineSet (eve) - generated from schema shapeHash b00a68a1.... */
@type.define({ className: "EveSOFDataHullSpriteLineSet", family: "eve" })
export class EveSOFDataHullSpriteLineSet extends CjsModel
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_skinned (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  skinned = false;

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  visibilityGroup = "primary";

  /** m_items (PEveSOFDataHullSpriteLineSetItemVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataHullSpriteLineSetItem")
  items = [];

}
