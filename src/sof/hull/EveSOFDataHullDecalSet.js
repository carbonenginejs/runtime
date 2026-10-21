import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Groups named decal items and their visibility policy. */
@be.define("EveSOFDataHullDecalSet")
@blue.inherit(IRoot)
export class EveSOFDataHullDecalSet
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  visibilityGroup = "primary";

  /** m_items (PEveSOFDataHullDecalSetItemVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataHullDecalSetItem")
  items = [];

}
