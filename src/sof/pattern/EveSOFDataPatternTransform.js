import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/** Stores pattern position, scale, rotation, and mirror settings and composes their transformation matrix. */
@be.define("EveSOFDataPatternTransform")

@blue.inherit(IRoot)
export class EveSOFDataPatternTransform
{

  /** m_position (Vector3) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec3
  position = vec3.create();

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.quat
  rotation = quat.create();

  /** m_isMirrored (bool) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

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
