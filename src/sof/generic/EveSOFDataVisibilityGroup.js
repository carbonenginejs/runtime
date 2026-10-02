// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:418-427
import { meta, types } from "#schema";

/** Names and describes a generic visibility group.
 * Native IRoot-only data with a self-only Blue table. Field initializers
 * preserve native defaults; no initialization, update or resource lifecycle
 * is required, and the native destructor is empty.
 */
@meta.define({ className: "EveSOFDataVisibilityGroup", family: "eve" })
export class EveSOFDataVisibilityGroup
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  name = "";

  /** m_description (std::string) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  description = "";

}

meta.carbon.interfaceTable({
  interfaces: [ EveSOFDataVisibilityGroup ],
  chainTo: null
})(EveSOFDataVisibilityGroup);
