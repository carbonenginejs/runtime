// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { blue, EnumRegistrationType } from "#blue";
import { CjsModel } from "#model";

/** Groups named haze items with spherical-type, visibility, and skinning policy. */
@type.define({ className: "EveSOFDataHullHazeSet", family: "eve" })
export class EveSOFDataHullHazeSet extends CjsModel
{

  /** m_hazeType (HazeType - enum HazeType) [READWRITE, PERSIST, ENUM] */
  @edit.readwrite
  @edit.persist
  @type.int32
  @type.enum("trinity.EveSOFDataHullHazeSet.HazeType")
  hazeType = 0;

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

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  visibilityGroup = "primary";

  /** m_items (PEveSOFDataHullHazeSetItemVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("EveSOFDataHullHazeSetItem")
  items = [];

  static HazeType = Object.freeze({
    TYPE_SPHERICAL: 0,
    TYPE_HALFSPHERICAL: 1
  });

}

// Native chooser labels and selection; the enum object retains all C++ members.
blue.enums.RegisterEnum("trinity.EveSOFDataHullHazeSet.HazeType", EveSOFDataHullHazeSet.HazeType, {
  source: "trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h", family: "eve", line: 861,
  exposedName: "HazeType", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:95",
  chooser: [
    { name: "Spherical", value: EveSOFDataHullHazeSet.HazeType.TYPE_SPHERICAL, description: "Spherical Haze" },
    { name: "HalfSpherical_DONOTUSE", value: EveSOFDataHullHazeSet.HazeType.TYPE_HALFSPHERICAL, description: "HalfSpherical Haze" }
  ]
});
