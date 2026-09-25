// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/** Stores a bone-relative scale, rotation, and translation and composes them into a transformation matrix. */
@type.define({ className: "EveSOFDataTransform", family: "eve" })
export class EveSOFDataTransform extends CjsModel
{

  /** m_boneIndex (int32_t) [READWRITE, PERSIST] */
  @edit.persist
  @type.int32
  boneIndex = -1;

  /** m_position (Vector3) [READWRITE, PERSIST] */
  @edit.persist
  @type.vec3
  position = vec3.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @edit.persist
  @type.quat
  rotation = quat.create();

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  @edit.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /**
   * Composes rotation, position, and scale directly into the required output
   * matrix.
   */
  GetTransform(out)
  {
    return mat4.fromRotationTranslationScale(out, this.rotation, this.position, this.scaling);
  }

}
