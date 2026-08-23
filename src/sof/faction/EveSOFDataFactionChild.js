// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataFactionChild (eve) - generated from schema shapeHash 283273de.... */
@type.define({ className: "EveSOFDataFactionChild", family: "eve" })
export class EveSOFDataFactionChild extends CjsModel
{

  /** m_groupIndex (int32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.int32
  groupIndex = -1;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_isVisible (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  isVisible = false;

}
