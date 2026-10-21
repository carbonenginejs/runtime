import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta, type, blue } from "#schema";

/** Names a controller resource path and its build filter, deriving the controller name from the path. */
@be.define("EveSOFDataHullController")
@blue.inherit(IRoot)
export class EveSOFDataHullController
{

  /** m_buildFilter (uint32_t) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.uint32
  buildFilter = 0xffffffff;

  /** m_path (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.path("object")
  path = "";

  /**
   * Carbon MAP_PROPERTY_READONLY "name" over GetName
   * (EveSOFData_Blue.cpp:902): the controller path's basename without its extension. Carbon persists no name for
   * this class; the getter derives it.
   */
  @be.mapPropertyReadOnly()
  @type.string
  @meta.implemented
  get name()
  {
    return this.GetName();
  }

  /**
   * Derives the controller resource's basename without its extension when a
   * forward-slash-qualified path is available.
   */
  @blue.method
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
