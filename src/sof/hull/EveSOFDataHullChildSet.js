import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Groups child-resource placements under a named visibility identity. */
@blue.define("EveSOFDataHullChildSet")
@blue.inherit(IRoot)
export class EveSOFDataHullChildSet
{

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  visibilityGroup = "primary";

  /** m_items (PEveSOFDataHullChildSetItemVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullChildSetItem")
  items = [];

  /** Uses the child set's visibility group as its externally comparable name. */
  @blue.method
  GetName()
  {
    return this.visibilityGroup;
  }

}
