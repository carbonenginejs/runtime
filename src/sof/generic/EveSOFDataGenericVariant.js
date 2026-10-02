// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:546-555
import { meta, types } from "#schema";

/** Names a generic variant and its optional hull-area override and transparency policy.
 * Native IRoot-only data with a self-only Blue table. Field initializers
 * preserve native defaults; no initialization, update or resource lifecycle
 * is required, and the native destructor is empty.
 * The hull area is an authored object reference, not a held resource.
 */
@meta.define({ className: "EveSOFDataGenericVariant", family: "eve" })
export class EveSOFDataGenericVariant
{

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  name = "";

  /** m_isTransparent (bool) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.boolean
  isTransparent = false;

  /** m_hullArea (EveSOFDataHullAreaPtr) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.objectRef("EveSOFDataHullArea")
  hullArea = null;

}

meta.carbon.interfaceTable({
  interfaces: [ EveSOFDataGenericVariant ],
  chainTo: null
})(EveSOFDataGenericVariant);
