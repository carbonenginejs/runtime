import { exposure as be } from "#be";
import { IRoot } from "../../blue/blueexposure/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:557-566
import "#consts/graphics/trinityEnums";
import { type, blue } from "#schema";
import { ReflectionMode } from "#consts/graphics";

/** Names a generic hull category and records its reflection mode.
 * Native IRoot-only data with a self-only Blue table. Field initializers
 * preserve native defaults; no initialization, update or resource lifecycle
 * is required, and the native destructor is empty.
 */
@be.define("EveSOFDataGenericHullCategory")
@be.inherit(IRoot)

export class EveSOFDataGenericHullCategory extends IRoot
{
  /** Existing JavaScript alias for the native reflection-mode chooser. */
  static ReflectionMode = ReflectionMode;


  /** m_categoryName (BlueSharedString) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /**
   * m_reflectionMode (EntityComponents::ReflectionMode - enum ReflectionMode) [READWRITE, PERSIST, ENUM]
   * Carbon: MAP_ATTRIBUTE_WITH_CHOOSER (trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:563); chooser ReflectionModeChooser (trinity/trinity/Eve/EveEntity_Blue.cpp:10).
   */
  @be.mapAttributeWithChooser(be.READWRITE | be.PERSIST | be.ENUM, "trinity.EntityComponents.ReflectionMode")
  @type.int32
  @type.enum("trinity.EntityComponents.ReflectionMode")
  reflectionMode = ReflectionMode.REFLECT_NEVER;

}

