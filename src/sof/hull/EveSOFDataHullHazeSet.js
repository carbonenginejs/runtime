// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataHullHazeSet (eve) - generated from schema shapeHash 3da83fe6.... */
@type.define({ className: "EveSOFDataHullHazeSet", family: "eve" })
export class EveSOFDataHullHazeSet extends CjsModel
{

  /** m_hazeType (HazeType - enum HazeType) [READWRITE, PERSIST, ENUM] */
  @edit.persist
  @type.int32
  @type.enum("HazeType")
  hazeType = 0;

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

  /** m_items (PEveSOFDataHullHazeSetItemVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataHullHazeSetItem")
  items = [];

  static HazeType = Object.freeze({
    TYPE_SPHERICAL: 0,
    TYPE_HALFSPHERICAL: 1
  });

}
