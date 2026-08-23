// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataHullDecalSet (eve) - generated from schema shapeHash 6c3dc4d1.... */
@type.define({ className: "EveSOFDataHullDecalSet", family: "eve" })
export class EveSOFDataHullDecalSet extends CjsModel
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  visibilityGroup = "primary";

  /** m_items (PEveSOFDataHullDecalSetItemVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataHullDecalSetItem")
  items = [];

}
