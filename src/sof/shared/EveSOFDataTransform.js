// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/** EveSOFDataTransform (eve) - generated from schema shapeHash a3d40133.... */
@type.define({ className: "EveSOFDataTransform", family: "eve" })
export class EveSOFDataTransform extends CjsModel
{

  /** m_boneIndex (int32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.int32
  boneIndex = -1;

  /** m_position (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  position = vec3.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @io.persist
  @type.quat
  rotation = quat.create();

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  @io.persist
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
