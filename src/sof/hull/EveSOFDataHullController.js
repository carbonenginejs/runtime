// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataHullController (eve) - generated from schema shapeHash ef1e599d.... */
@type.define({ className: "EveSOFDataHullController", family: "eve" })
export class EveSOFDataHullController extends CjsModel
{

  /** m_buildFilter (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  buildFilter = 0xffffffff;

  /** m_path (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  path = "";

  /**
   * Derives the controller resource's basename without its extension when a
   * forward-slash-qualified path is available.
   */
  GetName()
  {
    const slash = this.path.lastIndexOf("/");
    if (slash === -1)
    {
      return "";
    }
    let result = this.path.substring(slash + 1);
    const dot = result.lastIndexOf(".");
    if (dot !== -1)
    {
      result = result.substring(0, dot);
    }
    return result;
  }

}
