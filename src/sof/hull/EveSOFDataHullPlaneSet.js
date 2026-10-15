import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";
import { be, EnumRegistrationType } from "#blue";
import { vec2 } from "#math/vec2";

/** Groups plane items with usage, texture, atlas, visibility, and skinning policy. */
@blue.define("EveSOFDataHullPlaneSet")
@blue.inherit(IRoot)
export class EveSOFDataHullPlaneSet
{

  /** m_usage (Usage - enum Usage) [READWRITE, PERSIST, ENUM] */
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.EveSOFDataHullPlaneSet.Usage")
  usage = 0;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_layer1MapResPath (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.path("TriTextureRes")
  layer1MapResPath = "";

  /** m_layer2MapResPath (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.path("TriTextureRes")
  layer2MapResPath = "";

  /** m_maskMapResPath (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.path("TriTextureRes")
  maskMapResPath = "";

  /** m_skinned (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  skinned = false;

  /** m_atlasAspectRatio (Vector2) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.vec2
  atlasAspectRatio = vec2.fromValues(1, 1);

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  visibilityGroup = "primary";

  /** m_atlasSize (uint32_t) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.uint32
  atlasSize = 1;

  /** m_items (PEveSOFDataHullPlaneSetItemVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullPlaneSetItem")
  items = [];

  static Usage = {
    USAGE_STANDARD: 0,
    USAGE_SPACE_VIDEO: 2,
    USAGE_HANGAR_VIDEO: 3,
    USAGE_HAZE: 5
  };

}

// Native chooser labels and selection; the enum object retains all C++ members.
be.enums.Create("trinity.EveSOFDataHullPlaneSet.Usage", EveSOFDataHullPlaneSet.Usage, {
  exposedName: "HullPlanesetUsage", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooser: [
    { name: "Standard", value: EveSOFDataHullPlaneSet.Usage.USAGE_STANDARD, description: "Standard planeset" },
    { name: "SpaceVideo", value: EveSOFDataHullPlaneSet.Usage.USAGE_SPACE_VIDEO, description: "Space Video planeset" },
    { name: "HangarVideo", value: EveSOFDataHullPlaneSet.Usage.USAGE_HANGAR_VIDEO, description: "Hangar Video planeset" },
    { name: "Haze", value: EveSOFDataHullPlaneSet.Usage.USAGE_HAZE, description: "Fake haze planeset" }
  ]
});
