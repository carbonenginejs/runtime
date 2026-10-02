// Source: trinity/trinity/TriView.h
//   trinity/trinity/TriView.cpp
//   trinity/trinity/TriView_Blue.cpp
import { mat4 } from "#math/mat4";
import { meta } from "#schema";


/** The camera view matrix, together with the look-at helper that builds it. */
@meta.define({ className: "TriView", family: "trinityCore" })
export class TriView
{

  /** m_transform (Matrix) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.mat4
  transform = mat4.create();

  /** Copies a view matrix in; the caller's buffer is not retained. */
  @meta.blue.method
  @meta.implemented
  SetTransform(value)
  {
    mat4.copy(this.transform, value);
  }

  /**
   * Copies the view matrix into out (a fresh matrix when omitted) and returns
   * it, since JS cannot safely hand out Carbon's const matrix reference.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Returns a detached matrix copy because JavaScript cannot expose Carbon's const Matrix reference safely.")
  GetTransform(out = mat4.create())
  {
    return mat4.copy(out, this.transform);
  }

  /** Builds Carbon's right-handed look-at view transform. */
  @meta.blue.method
  @meta.implemented
  SetLookAtPosition(eye, at, up)
  {
    mat4.lookAt(this.transform, eye, at, up);
  }

}
