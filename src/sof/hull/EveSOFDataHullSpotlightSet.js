import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Groups spotlight items with cone, glow, and flare textures plus skinning, depth, and visibility policy. */
@be.define("EveSOFDataHullSpotlightSet")
@blue.inherit(IRoot)
export class EveSOFDataHullSpotlightSet
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /** m_skinned (bool) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  skinned = false;

  /** m_zOffset (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  zOffset = 0;

  /** m_coneTextureResPath (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.path("TriTextureRes")
  coneTextureResPath = "";

  /** m_glowTextureResPath (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.path("TriTextureRes")
  glowTextureResPath = "";

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  visibilityGroup = "primary";

  /** m_items (PEveSOFDataHullSpotlightSetItemVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataHullSpotlightSetItem")
  items = [];

}
