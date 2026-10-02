// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:557-566
import "#consts/graphics/trinityEnums";
import { meta } from "#schema";
import { ReflectionMode } from "#consts/graphics";

/** Names a generic hull category and records its reflection mode.
 * Native IRoot-only data with a self-only Blue table. Field initializers
 * preserve native defaults; no initialization, update or resource lifecycle
 * is required, and the native destructor is empty.
 */
@meta.define({ className: "EveSOFDataGenericHullCategory", family: "eve" })
export class EveSOFDataGenericHullCategory
{
  /** Existing JavaScript alias for the native reflection-mode chooser. */
  static ReflectionMode = ReflectionMode;


  /** m_categoryName (BlueSharedString) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_reflectionMode (EntityComponents::ReflectionMode - enum ReflectionMode) [READWRITE, PERSIST, ENUM] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.EntityComponents.ReflectionMode")
  reflectionMode = ReflectionMode.REFLECT_NEVER;

}

meta.blue.interfaceTable({
  interfaces: [ EveSOFDataGenericHullCategory ],
  chainTo: null
})(EveSOFDataGenericHullCategory);
