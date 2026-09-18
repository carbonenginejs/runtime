// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataGenericString (eve) - generated from schema shapeHash ebea2832.... */
@type.define({ className: "EveSOFDataGenericString", family: "eve" })
export class EveSOFDataGenericString extends CjsModel
{

  /** m_str (std::string) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  str = "";

}
