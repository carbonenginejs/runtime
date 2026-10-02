// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:409-416
import { meta, types } from "#schema";

/**
 * Provides the persisted wrapper used for a generic SOF string value.
 * Native IRoot-only data with a self-only Blue table. Constructor/destructor
 * are empty; no initialization, update or resource lifecycle is required.
 */
@meta.define({ className: "EveSOFDataGenericString", family: "eve" })
export class EveSOFDataGenericString
{

  /** m_str (std::string) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  str = "";

}

meta.carbon.interfaceTable({
  interfaces: [ EveSOFDataGenericString ],
  chainTo: null
})(EveSOFDataGenericString);
