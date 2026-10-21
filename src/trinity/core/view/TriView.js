import { exposure as be } from "#be";
import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/TriView.h
//   trinity/trinity/TriView.cpp
//   trinity/trinity/TriView_Blue.cpp
import { mat4 } from "#math/mat4";
import { meta, type, blue } from "#schema";


/** The camera view matrix, together with the look-at helper that builds it. */
@be.define("TriView")
@blue.inherit(IRoot)
export class TriView extends IRoot
{

  /** m_transform (Matrix) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.mat4
  transform = mat4.create();

  /** Copies a view matrix in; the caller's buffer is not retained. */

  @meta.implemented
  SetTransform(value)
  {
    mat4.copy(this.transform, value);
  }

  /**
   * Copies the view matrix into out (a fresh matrix when omitted) and returns
   * it, since JS cannot safely hand out Carbon's const matrix reference.
   *
   * Adapted: Copies the transform into the caller's output matrix instead of returning
   * Carbon's const Matrix reference.
   */

  @meta.adapted
  GetTransform(out = mat4.create())
  {
    return mat4.copy(out, this.transform);
  }

  /** Builds Carbon's right-handed look-at view transform. */
  @be.mapMethodAndWrap()
  @meta.implemented
  SetLookAtPosition(eye, at, up)
  {
    mat4.lookAt(this.transform, eye, at, up);
  }

}


