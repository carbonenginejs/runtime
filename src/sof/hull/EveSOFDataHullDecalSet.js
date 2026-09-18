// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataHullDecalSet (eve) - generated from schema shapeHash 6c3dc4d1.... */
@type.define({ className: "EveSOFDataHullDecalSet", family: "eve" })
export class EveSOFDataHullDecalSet extends CjsModel
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  name = "";

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  visibilityGroup = "primary";

  /** m_items (PEveSOFDataHullDecalSetItemVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataHullDecalSetItem")
  items = [];

}
