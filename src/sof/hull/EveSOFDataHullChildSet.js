// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Groups child-resource placements under a named visibility identity. */
@type.define({ className: "EveSOFDataHullChildSet", family: "eve" })
export class EveSOFDataHullChildSet extends CjsModel
{

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  visibilityGroup = "primary";

  /** m_items (PEveSOFDataHullChildSetItemVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("EveSOFDataHullChildSetItem")
  items = [];

  /** Uses the child set's visibility group as its externally comparable name. */
  GetName()
  {
    return this.visibilityGroup;
  }

}
