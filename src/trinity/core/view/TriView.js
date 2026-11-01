import { exposure as be } from "#be";
import { IRoot } from "../../../blue/blueexposure/IRoot.js";
// Source: trinity/trinity/TriView.h
//   trinity/trinity/TriView.cpp
//   trinity/trinity/TriView_Blue.cpp
import { mat4 } from "#math/mat4";
import { type, blue } from "#schema";


/** The camera view matrix, together with the look-at helper that builds it. */
@be.define("TriView")
@be.inherit(IRoot)
export class TriView extends IRoot
{

  /** m_transform (Matrix) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.mat4
  transform = mat4.create();

  /**
   * Copies a view matrix in; the caller's buffer is not retained.
   *
   * @implemented
   */

  SetTransform(value)
  {
    mat4.copy(this.transform, value);
  }

  /**
   * Copies the view matrix into out and returns
   * it, since JS cannot safely hand out Carbon's const matrix reference.
   *
   * @adapted Copies the transform into the caller's output matrix instead of returning
   *   Carbon's const Matrix reference.
   */

  GetTransform(out)
  {
    return mat4.copy(out, this.transform);
  }

  /**
   * Builds Carbon's right-handed look-at view transform.
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  SetLookAtPosition(eye, at, up)
  {
    mat4.lookAt(this.transform, eye, at, up);
  }

}
