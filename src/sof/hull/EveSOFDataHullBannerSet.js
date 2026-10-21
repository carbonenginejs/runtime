import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta, type, blue } from "#schema";

/** Groups banner items under a named visibility identity. */
@be.define("EveSOFDataHullBannerSet")
@blue.inherit(IRoot)
export class EveSOFDataHullBannerSet extends IRoot
{

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  visibilityGroup = "primary";

  /** m_banners (PEveSOFDataHullBannerSetItemVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataHullBannerSetItem")
  banners = [];

  /**
   * Carbon MAP_PROPERTY_READONLY "name" over GetName
   * (EveSOFData_Blue.cpp:692): the banner set's visibility group. Carbon persists no name for
   * this class; the getter derives it.
   */
  @be.mapPropertyReadOnly()
  @type.string
  @meta.implemented
  get name()
  {
    return this.GetName();
  }

  /** Uses the banner set's visibility group as its externally comparable name. */

  GetName()
  {
    return this.visibilityGroup;
  }

}
