// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { vec4 } from "#math/vec4";

/** EveSOFDataFactionPlaneSet (eve) - generated from schema shapeHash e6cd0e1a.... */
@type.define({ className: "EveSOFDataFactionPlaneSet", family: "eve" })
export class EveSOFDataFactionPlaneSet extends CjsModel
{

  /** m_groupIndex (int32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.int32
  groupIndex = -1;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_color (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  color = vec4.create();

}
