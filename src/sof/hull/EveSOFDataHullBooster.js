// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";

/** Groups booster placements and records whether boosters and their trails remain active. */
@meta.define({ className: "EveSOFDataHullBooster", family: "eve" })
export class EveSOFDataHullBooster
{

  /** m_items (PEveSOFDataHullBoosterItemVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveSOFDataHullBoosterItem")
  items = [];

  /** m_alwaysOn (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  alwaysOn = false;

  /** m_hasTrails (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  hasTrails = true;

}
