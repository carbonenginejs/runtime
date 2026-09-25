// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Provides the persisted wrapper used for a generic SOF string value. */
@type.define({ className: "EveSOFDataGenericString", family: "eve" })
export class EveSOFDataGenericString extends CjsModel
{

  /** m_str (std::string) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  str = "";

}
