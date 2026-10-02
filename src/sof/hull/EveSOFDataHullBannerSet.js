// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";

/** Groups banner items under a named visibility identity. */
@meta.define({ className: "EveSOFDataHullBannerSet", family: "eve" })
export class EveSOFDataHullBannerSet
{

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  visibilityGroup = "primary";

  /** m_banners (PEveSOFDataHullBannerSetItemVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveSOFDataHullBannerSetItem")
  banners = [];

  /** Uses the banner set's visibility group as its externally comparable name. */
  GetName()
  {
    return this.visibilityGroup;
  }

}
