// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataHullSpotlightSet (eve) - generated from schema shapeHash ab0a5bcb.... */
@type.define({ className: "EveSOFDataHullSpotlightSet", family: "eve" })
export class EveSOFDataHullSpotlightSet extends CjsModel
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_skinned (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  skinned = false;

  /** m_zOffset (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  zOffset = 0;

  /** m_coneTextureResPath (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  coneTextureResPath = "";

  /** m_glowTextureResPath (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  glowTextureResPath = "";

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  visibilityGroup = "primary";

  /** m_items (PEveSOFDataHullSpotlightSetItemVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataHullSpotlightSetItem")
  items = [];

}
