// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataHullBooster (eve) - generated from schema shapeHash 8aafe11c.... */
@type.define({ className: "EveSOFDataHullBooster", family: "eve" })
export class EveSOFDataHullBooster extends CjsModel
{

  /** m_items (PEveSOFDataHullBoosterItemVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataHullBoosterItem")
  items = [];

  /** m_alwaysOn (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  alwaysOn = false;

  /** m_hasTrails (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  hasTrails = true;

}
