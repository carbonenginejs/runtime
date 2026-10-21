import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";
import { blue as be, EnumRegistrationType } from "#blue";

/** Groups named haze items with spherical-type, visibility, and skinning policy. */
@blue.define("EveSOFDataHullHazeSet")
@blue.inherit(IRoot)
export class EveSOFDataHullHazeSet extends IRoot
{

  /** m_hazeType (HazeType - enum HazeType) [READWRITE, PERSIST, ENUM] */
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.EveSOFDataHullHazeSet.HazeType")
  hazeType = 0;

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

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  visibilityGroup = "primary";

  /** m_items (PEveSOFDataHullHazeSetItemVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullHazeSetItem")
  items = [];

  static HazeType = {
    TYPE_SPHERICAL: 0,
    TYPE_HALFSPHERICAL: 1
  };

}

// Native chooser labels and selection; the enum object retains all C++ members.
be.enums.Create("trinity.EveSOFDataHullHazeSet.HazeType", EveSOFDataHullHazeSet.HazeType, {
  exposedName: "HazeType", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooser: [
    { name: "Spherical", value: EveSOFDataHullHazeSet.HazeType.TYPE_SPHERICAL, description: "Spherical Haze" },
    { name: "HalfSpherical_DONOTUSE", value: EveSOFDataHullHazeSet.HazeType.TYPE_HALFSPHERICAL, description: "HalfSpherical Haze" }
  ]
});
