// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Names a controller resource path and its build filter, deriving the controller name from the path. */
@blue.define("EveSOFDataHullController")
export class EveSOFDataHullController
{

  /** m_buildFilter (uint32_t) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.uint32
  buildFilter = 0xffffffff;

  /** m_path (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.path("object")
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
