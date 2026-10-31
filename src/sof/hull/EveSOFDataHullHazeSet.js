import { exposure as be } from "#be";
import { IRoot } from "../../global/blueexposure/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type } from "#schema";
import { blue, EnumRegistrationType } from "#blue";

/** Groups named haze items with spherical-type, visibility, and skinning policy. */
@be.define("EveSOFDataHullHazeSet")
@be.inherit(IRoot)
export class EveSOFDataHullHazeSet extends IRoot
{

  /**
   * m_hazeType (HazeType - enum HazeType) [READWRITE, PERSIST, ENUM]
   * Carbon: MAP_ATTRIBUTE_WITH_CHOOSER (trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:547); chooser EveSOFDataHazeTypeChooser (trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:95).
   */
  @be.mapAttributeWithChooser(be.READWRITE | be.PERSIST | be.ENUM, "trinity.EveSOFDataHullHazeSet.HazeType")
  @type.int32
  @type.enum("trinity.EveSOFDataHullHazeSet.HazeType")
  hazeType = 0;

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

  /** m_items (PEveSOFDataHullHazeSetItemVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataHullHazeSetItem")
  items = [];

  static HazeType = {
    TYPE_SPHERICAL: 0,
    TYPE_HALFSPHERICAL: 1
  };

}

// Native chooser labels and selection; the enum object retains all C++ members.
blue.enums.Create("trinity.EveSOFDataHullHazeSet.HazeType", EveSOFDataHullHazeSet.HazeType, {
  exposedName: "HazeType", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooser: [
    { name: "Spherical", value: EveSOFDataHullHazeSet.HazeType.TYPE_SPHERICAL, description: "Spherical Haze" },
    { name: "HalfSpherical_DONOTUSE", value: EveSOFDataHullHazeSet.HazeType.TYPE_HALFSPHERICAL, description: "HalfSpherical Haze" }
  ]
});
