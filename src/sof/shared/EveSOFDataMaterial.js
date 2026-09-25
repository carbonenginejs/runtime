// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Stores named material parameters and assigns them to a target with an optional parameter prefix. */
@type.define({ className: "EveSOFDataMaterial", family: "eve" })
export class EveSOFDataMaterial extends CjsModel
{

  /** m_parameters (PEveSOFDataParameterVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataParameter")
  parameters = [];

  /** m_name (std::string) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  name = "";

  /**
   * Writes every authored material parameter into the supplied map using an
   * optional prefix.
   */
  AssignParameters(out = {}, prefix = "")
  {
    for (const parameter of this.parameters) parameter.Assign(out, prefix);
    return out;
  }

}
