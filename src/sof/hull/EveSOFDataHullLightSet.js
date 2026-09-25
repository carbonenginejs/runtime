// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Groups named hull light items and their visibility policy. */
@type.define({ className: "EveSOFDataHullLightSet", family: "eve" })
export class EveSOFDataHullLightSet extends CjsModel
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  visibilityGroup = "primary";

  /** m_items (PEveSOFDataHullLightSetItemVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("EveSOFDataHullLightSetItem")
  items = [];

}
