import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Groups named sprite-line items with visibility and skinning policy. */
@be.define("EveSOFDataHullSpriteLineSet")
@blue.inherit(IRoot)
export class EveSOFDataHullSpriteLineSet
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /** m_skinned (bool) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  skinned = false;

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  visibilityGroup = "primary";

  /** m_items (PEveSOFDataHullSpriteLineSetItemVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataHullSpriteLineSetItem")
  items = [];

}
