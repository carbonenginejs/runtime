// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h:112-120
import { meta, types } from "#schema";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/**
 * Runtime representation of Carbon's 44-byte EveSofDataMeshInstance structure.
 * Native is a plain struct in BLUE_DECLARE_STRUCTURE_LIST, not an IRoot or
 * exposed Blue class; no interface table or lifecycle is invented here.
 * Registered JavaScript fields retain the existing values-transport adaptation,
 * with independently owned buffers and deterministic construction defaults.
 * Native declares no struct constructor or bone-index initializer; the retained
 * identity scale and zero bone index are JavaScript defaults, not native defaults.
 */
@meta.define({ className: "EveSofDataMeshInstance", family: "eve" })
export class EveSofDataMeshInstance
{
  /**
   * Instance orientation quaternion (x, y, z, w), stored at native byte offset 0.
   * @type {Float32Array}
   */
  @meta.edit.persist
  @types.quat
  rotation = quat.create();

  /**
   * Instance scale along each local axis, native Vector3 at byte offset 16.
   * Identity is the retained JavaScript construction default.
   * @type {Float32Array}
   */
  @meta.edit.persist
  @types.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /**
   * Instance translation in the owning mesh or bone's space, native Vector3 at byte offset 28.
   * @type {Float32Array}
   */
  @meta.edit.persist
  @types.vec3
  translation = vec3.create();

  /**
   * Bone index carried into the packed instance transform; native signed int32 at byte offset 40.
   * Zero is the retained JavaScript construction default.
   * @type {number}
   */
  @meta.edit.persist
  @types.int32
  boneIndex = 0;

}
