// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataHullChildSet (eve) - generated from schema shapeHash 7e44fd77.... */
@type.define({ className: "EveSOFDataHullChildSet", family: "eve" })
export class EveSOFDataHullChildSet extends CjsModel
{

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  visibilityGroup = "primary";

  /** m_items (PEveSOFDataHullChildSetItemVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataHullChildSetItem")
  items = [];

  /** Uses the child set's visibility group as its externally comparable name. */
  GetName()
  {
    return this.visibilityGroup;
  }

}
