// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Groups banner items under a named visibility identity. */
@blue.define("EveSOFDataHullBannerSet")
export class EveSOFDataHullBannerSet
{

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  visibilityGroup = "primary";

  /** m_banners (PEveSOFDataHullBannerSetItemVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullBannerSetItem")
  banners = [];

  /** Uses the banner set's visibility group as its externally comparable name. */
  GetName()
  {
    return this.visibilityGroup;
  }

}
