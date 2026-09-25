// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Groups banner items under a named visibility identity. */
@type.define({ className: "EveSOFDataHullBannerSet", family: "eve" })
export class EveSOFDataHullBannerSet extends CjsModel
{

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  visibilityGroup = "primary";

  /** m_banners (PEveSOFDataHullBannerSetItemVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("EveSOFDataHullBannerSetItem")
  banners = [];

  /** Uses the banner set's visibility group as its externally comparable name. */
  GetName()
  {
    return this.visibilityGroup;
  }

}
