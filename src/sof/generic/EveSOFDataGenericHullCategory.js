import { IRoot } from "../../global/blue/IRoot.js";
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
@blue.define("EveSOFDataGenericHullCategory")
@blue.inherit(IRoot)
@blue.interface()
export class EveSOFDataGenericHullCategory
{
  /** Existing JavaScript alias for the native reflection-mode chooser. */
  static ReflectionMode = ReflectionMode;


  /** m_categoryName (BlueSharedString) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_reflectionMode (EntityComponents::ReflectionMode - enum ReflectionMode) [READWRITE, PERSIST, ENUM] */
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.EntityComponents.ReflectionMode")
  reflectionMode = ReflectionMode.REFLECT_NEVER;

}

