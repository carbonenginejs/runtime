// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:418-427
import { meta } from "#schema";

/** Names and describes a generic visibility group.
 * Native IRoot-only data with a self-only Blue table. Field initializers
 * preserve native defaults; no initialization, update or resource lifecycle
 * is required, and the native destructor is empty.
 */
@meta.define({ className: "EveSOFDataVisibilityGroup", family: "eve" })
export class EveSOFDataVisibilityGroup
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_description (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  description = "";

}

meta.blue.interfaceTable({
  interfaces: [ EveSOFDataVisibilityGroup ],
  chainTo: null
})(EveSOFDataVisibilityGroup);
