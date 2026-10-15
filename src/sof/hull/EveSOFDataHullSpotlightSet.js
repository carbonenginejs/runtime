// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Groups spotlight items with cone, glow, and flare textures plus skinning, depth, and visibility policy. */
@blue.define("EveSOFDataHullSpotlightSet")
export class EveSOFDataHullSpotlightSet
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_skinned (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  skinned = false;

  /** m_zOffset (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  zOffset = 0;

  /** m_coneTextureResPath (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.path("TriTextureRes")
  coneTextureResPath = "";

  /** m_glowTextureResPath (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.path("TriTextureRes")
  glowTextureResPath = "";

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  visibilityGroup = "primary";

  /** m_items (PEveSOFDataHullSpotlightSetItemVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullSpotlightSetItem")
  items = [];

}
