// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h:112-120
import { meta, type, blue } from "#schema";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/**
 * Runtime representation of Carbon's 44-byte EveSofDataMeshInstance structure.
 * Native is a plain struct in BLUE_DECLARE_STRUCTURE_LIST, not an IRoot or
 * exposed Blue class; no interface table or lifecycle is invented here.
 * Registered JavaScript fields retain the existing values-transport adaptation,
 * with independently owned buffers. Native declares no struct constructor, so
 * the math members take their types' constructors and boneIndex is left unset.
 * Native 64-bit size 44; offsets and storage types: trinity/trinity/
 * Eve/SpaceObjectFactory/EveSOFData.h:112-120; Eve/SpaceObjectFactory/EveSOFData.cpp:123-129.
 */
@blue.define("EveSofDataMeshInstance")
@meta.struct.define({ size: 44 })
export class EveSofDataMeshInstance
{
  /**
   * Instance orientation quaternion (x, y, z, w), stored at native byte offset 0.
   * @type {Float32Array}
   */
  @meta.persist
  @meta.struct.FLOAT32_4(0)
  @type.quat
  rotation = quat.create();

  /**
   * Instance scale along each local axis, native Vector3 at byte offset 16.
   * Scale defaults to identity by rule; Carbon's Vector3 constructor zeroes it
   * (math/include/Vector3_inline.h:5).
   * @type {Float32Array}
   */
  @meta.persist
  @meta.struct.FLOAT32_3(16)
  scaling = vec3.fromValues(1, 1, 1);

  /**
   * Instance translation in the owning mesh or bone's space, native Vector3 at byte offset 28.
   * @type {Float32Array}
   */
  @meta.persist
  @meta.struct.FLOAT32_3(28)
  translation = vec3.create();

  /**
   * Bone index carried into the packed instance transform; native signed int32 at byte offset 40.
   * Carbon leaves it unset.
   * @type {number}
   */
  @meta.persist
  @meta.struct.INT32_1(40)
  boneIndex = 0;

}
