import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Groups booster placements and records whether boosters and their trails remain active. */
@be.define("EveSOFDataHullBooster")
@blue.inherit(IRoot)
export class EveSOFDataHullBooster extends IRoot
{

  /** m_items (PEveSOFDataHullBoosterItemVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataHullBoosterItem")
  items = [];

  /** m_alwaysOn (bool) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  alwaysOn = false;

  /** m_hasTrails (bool) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  hasTrails = true;

}
