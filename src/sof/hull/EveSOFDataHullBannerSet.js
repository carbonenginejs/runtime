// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataHullBannerSet (eve) - generated from schema shapeHash a31a1da4.... */
@type.define({ className: "EveSOFDataHullBannerSet", family: "eve" })
export class EveSOFDataHullBannerSet extends CjsModel
{

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  visibilityGroup = "primary";

  /** m_banners (PEveSOFDataHullBannerSetItemVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataHullBannerSetItem")
  banners = [];

  /** Uses the banner set's visibility group as its externally comparable name. */
  GetName()
  {
    return this.visibilityGroup;
  }

}
