import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta, type, blue } from "#schema";

/** Groups child-resource placements under a named visibility identity. */
@be.define("EveSOFDataHullChildSet")
@blue.inherit(IRoot)
export class EveSOFDataHullChildSet extends IRoot
{

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  visibilityGroup = "primary";

  /** m_items (PEveSOFDataHullChildSetItemVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataHullChildSetItem")
  items = [];

  /**
   * Carbon MAP_PROPERTY_READONLY "name" over GetName
   * (EveSOFData_Blue.cpp:833): the child set's visibility group. Carbon persists no name for
   * this class; the getter derives it.
   */
  @be.mapPropertyReadOnly()
  @type.string
  @meta.implemented
  get name()
  {
    return this.GetName();
  }

  /** Uses the child set's visibility group as its externally comparable name. */

  GetName()
  {
    return this.visibilityGroup;
  }

}
