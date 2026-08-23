// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataHullHazeSet (eve) - generated from schema shapeHash 3da83fe6.... */
@type.define({ className: "EveSOFDataHullHazeSet", family: "eve" })
export class EveSOFDataHullHazeSet extends CjsModel
{

  /** m_hazeType (HazeType - enum HazeType) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @type.enum("HazeType")
  hazeType = 0;

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

  /** m_items (PEveSOFDataHullHazeSetItemVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataHullHazeSetItem")
  items = [];

  static HazeType = Object.freeze({
    TYPE_SPHERICAL: 0,
    TYPE_HALFSPHERICAL: 1
  });

}
