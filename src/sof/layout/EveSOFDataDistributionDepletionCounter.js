// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataDistributionDepletionCounter (eve) - generated from schema shapeHash 33483ac2.... */
@type.define({ className: "EveSOFDataDistributionDepletionCounter", family: "eve" })
export class EveSOFDataDistributionDepletionCounter extends CjsModel
{

  /** m_value (int32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.int32
  value = 1;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

}
