// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import "#consts/trinity";
import { meta } from "#schema";
import { Tr2Lod } from "#consts/trinity";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/** Places a RED child resource with build and LOD policy plus scale, rotation, and translation, deriving its name from the resource path. */
@meta.define({ className: "EveSOFDataHullChildSetItem", family: "eve" })
export class EveSOFDataHullChildSetItem
{
  static Tr2Lod = Tr2Lod;


  /** m_buildFilter (uint32_t) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  buildFilter = 0xffffffff;

  /** m_redFilePath (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.path
  redFilePath = "";

  /** m_lowestLodVisible (Tr2Lod - enum Tr2Lod) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.Tr2Lod")
  lowestLodVisible = 0;

  /** m_translation (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  translation = vec3.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.quat
  rotation = quat.create();

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /**
   * Derives a child-set item's basename without its extension only from resource
   * paths containing a forward slash.
   */
  GetName()
  {
    const slash = this.redFilePath.lastIndexOf("/");
    if (slash === -1)
    {
      return "";
    }
    let result = this.redFilePath.substring(slash + 1);
    const dot = result.lastIndexOf(".");
    if (dot !== -1)
    {
      result = result.substring(0, dot);
    }
    return result;
  }

}
