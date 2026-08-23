// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/** EveSOFDataPatternTransform (eve) - generated from schema shapeHash 67e6771a.... */
@type.define({ className: "EveSOFDataPatternTransform", family: "eve" })
export class EveSOFDataPatternTransform extends CjsModel
{

  /** m_position (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  position = vec3.create();

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @io.persist
  @type.quat
  rotation = quat.create();

  /** m_isMirrored (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  isMirrored = false;

  /** Clears the projection transform while retaining its value objects. */
  Empty()
  {
    vec3.set(this.position, 0, 0, 0);
    vec3.set(this.scaling, 0, 0, 0);
    quat.identity(this.rotation);
    this.isMirrored = false;
    return this;
  }

  /** Copies the transform state retained by a Trinity custom mask. */
  SetFromCustomMask(customMask)
  {
    if (!customMask) return this.Empty();
    vec3.copy(this.position, customMask.translation);
    vec3.copy(this.scaling, customMask.scaling);
    quat.copy(this.rotation, customMask.rotation);
    this.isMirrored = Boolean(customMask.isMirrored);
    return this;
  }

  /** Composes the Carbon position/rotation/scaling fields into a matrix. */
  GetTransform(out)
  {
    return mat4.fromRotationTranslationScale(out, this.rotation, this.position, this.scaling);
  }

}
