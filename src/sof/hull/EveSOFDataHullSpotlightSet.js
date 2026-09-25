// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Groups spotlight items with cone, glow, and flare textures plus skinning, depth, and visibility policy. */
@type.define({ className: "EveSOFDataHullSpotlightSet", family: "eve" })
export class EveSOFDataHullSpotlightSet extends CjsModel
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  /** m_skinned (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  skinned = false;

  /** m_zOffset (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  zOffset = 0;

  /** m_coneTextureResPath (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  coneTextureResPath = "";

  /** m_glowTextureResPath (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  glowTextureResPath = "";

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  visibilityGroup = "primary";

  /** m_items (PEveSOFDataHullSpotlightSetItemVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("EveSOFDataHullSpotlightSetItem")
  items = [];

}
