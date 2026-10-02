// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";

/** Groups child-resource placements under a named visibility identity. */
@meta.define({ className: "EveSOFDataHullChildSet", family: "eve" })
export class EveSOFDataHullChildSet
{

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  visibilityGroup = "primary";

  /** m_items (PEveSOFDataHullChildSetItemVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveSOFDataHullChildSetItem")
  items = [];

  /** Uses the child set's visibility group as its externally comparable name. */
  GetName()
  {
    return this.visibilityGroup;
  }

}
