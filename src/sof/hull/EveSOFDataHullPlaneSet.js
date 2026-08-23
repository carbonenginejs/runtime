// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { vec2 } from "#math/vec2";

/** EveSOFDataHullPlaneSet (eve) - generated from schema shapeHash cb49d2d1.... */
@type.define({ className: "EveSOFDataHullPlaneSet", family: "eve" })
export class EveSOFDataHullPlaneSet extends CjsModel
{

  /** m_usage (Usage - enum Usage) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @type.enum("Usage")
  usage = 0;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_layer1MapResPath (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  layer1MapResPath = "";

  /** m_layer2MapResPath (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  layer2MapResPath = "";

  /** m_maskMapResPath (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  maskMapResPath = "";

  /** m_skinned (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  skinned = false;

  /** m_atlasAspectRatio (Vector2) [READWRITE, PERSIST] */
  @io.persist
  @type.vec2
  atlasAspectRatio = vec2.fromValues(1, 1);

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  visibilityGroup = "primary";

  /** m_atlasSize (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  atlasSize = 1;

  /** m_items (PEveSOFDataHullPlaneSetItemVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataHullPlaneSetItem")
  items = [];

  static Usage = Object.freeze({
    USAGE_STANDARD: 0,
    USAGE_SPACE_VIDEO: 2,
    USAGE_HANGAR_VIDEO: 3,
    USAGE_HAZE: 5
  });

}
