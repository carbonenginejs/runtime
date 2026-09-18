// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataHullBooster (eve) - generated from schema shapeHash 8aafe11c.... */
@type.define({ className: "EveSOFDataHullBooster", family: "eve" })
export class EveSOFDataHullBooster extends CjsModel
{

  /** m_items (PEveSOFDataHullBoosterItemVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataHullBoosterItem")
  items = [];

  /** m_alwaysOn (bool) [READWRITE, PERSIST] */
  @edit.persist
  @type.boolean
  alwaysOn = false;

  /** m_hasTrails (bool) [READWRITE, PERSIST] */
  @edit.persist
  @type.boolean
  hasTrails = true;

}
