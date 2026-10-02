// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";

/** Groups spotlight items with cone, glow, and flare textures plus skinning, depth, and visibility policy. */
@meta.define({ className: "EveSOFDataHullSpotlightSet", family: "eve" })
export class EveSOFDataHullSpotlightSet
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_skinned (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  skinned = false;

  /** m_zOffset (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  zOffset = 0;

  /** m_coneTextureResPath (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  coneTextureResPath = "";

  /** m_glowTextureResPath (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  glowTextureResPath = "";

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  visibilityGroup = "primary";

  /** m_items (PEveSOFDataHullSpotlightSetItemVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveSOFDataHullSpotlightSetItem")
  items = [];

}
