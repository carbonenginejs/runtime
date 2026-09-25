// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { blue, EnumRegistrationType } from "#blue";
import { CjsModel } from "#model";
import { vec2 } from "#math/vec2";

/** Groups plane items with usage, texture, atlas, visibility, and skinning policy. */
@type.define({ className: "EveSOFDataHullPlaneSet", family: "eve" })
export class EveSOFDataHullPlaneSet extends CjsModel
{

  /** m_usage (Usage - enum Usage) [READWRITE, PERSIST, ENUM] */
  @edit.persist
  @type.int32
  @type.enum("trinity.EveSOFDataHullPlaneSet.Usage")
  usage = 0;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  name = "";

  /** m_layer1MapResPath (std::string) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  layer1MapResPath = "";

  /** m_layer2MapResPath (std::string) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  layer2MapResPath = "";

  /** m_maskMapResPath (std::string) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  maskMapResPath = "";

  /** m_skinned (bool) [READWRITE, PERSIST] */
  @edit.persist
  @type.boolean
  skinned = false;

  /** m_atlasAspectRatio (Vector2) [READWRITE, PERSIST] */
  @edit.persist
  @type.vec2
  atlasAspectRatio = vec2.fromValues(1, 1);

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  visibilityGroup = "primary";

  /** m_atlasSize (uint32_t) [READWRITE, PERSIST] */
  @edit.persist
  @type.uint32
  atlasSize = 1;

  /** m_items (PEveSOFDataHullPlaneSetItemVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataHullPlaneSetItem")
  items = [];

  static Usage = Object.freeze({
    USAGE_STANDARD: 0,
    USAGE_SPACE_VIDEO: 2,
    USAGE_HANGAR_VIDEO: 3,
    USAGE_HAZE: 5
  });

}

// Native chooser labels and selection; the enum object retains all C++ members.
blue.enums.RegisterEnum("trinity.EveSOFDataHullPlaneSet.Usage", EveSOFDataHullPlaneSet.Usage, {
  source: "trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h", family: "eve", line: 711,
  exposedName: "HullPlanesetUsage", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:375",
  chooser: [
    { name: "Standard", value: EveSOFDataHullPlaneSet.Usage.USAGE_STANDARD, description: "Standard planeset" },
    { name: "SpaceVideo", value: EveSOFDataHullPlaneSet.Usage.USAGE_SPACE_VIDEO, description: "Space Video planeset" },
    { name: "HangarVideo", value: EveSOFDataHullPlaneSet.Usage.USAGE_HANGAR_VIDEO, description: "Hangar Video planeset" },
    { name: "Haze", value: EveSOFDataHullPlaneSet.Usage.USAGE_HAZE, description: "Fake haze planeset" }
  ]
});
