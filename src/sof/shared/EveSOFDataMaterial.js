// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataMaterial (eve) - generated from schema shapeHash 044816c1.... */
@type.define({ className: "EveSOFDataMaterial", family: "eve" })
export class EveSOFDataMaterial extends CjsModel
{

  /** m_parameters (PEveSOFDataParameterVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataParameter")
  parameters = [];

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
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
