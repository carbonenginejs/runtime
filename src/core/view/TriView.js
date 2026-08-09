// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/TriView.h
//   trinity/trinity/TriView.cpp
//   trinity/trinity/TriView_Blue.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";


/** The camera view matrix, together with the look-at helper that builds it. */
@type.define({ className: "TriView", family: "trinityCore" })
export class TriView extends CjsModel
{

  /** m_transform (Matrix) [READWRITE, PERSIST] */
  @io.persist
  @type.mat4
  transform = mat4.create();

  /** Copies a view matrix in; the caller's buffer is not retained. */
  @carbon.method
  @impl.implemented
  SetTransform(value)
  {
    mat4.copy(this.transform, value);
  }

  /**
   * Copies the view matrix into out (a fresh matrix when omitted) and returns
   * it, since JS cannot safely hand out Carbon's const matrix reference.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Returns a detached matrix copy because JavaScript cannot expose Carbon's const Matrix reference safely.")
  GetTransform(out = mat4.create())
  {
    return mat4.copy(out, this.transform);
  }

  /** Builds Carbon's right-handed look-at view transform. */
  @carbon.method
  @impl.implemented
  SetLookAtPosition(eye, at, up)
  {
    mat4.lookAt(this.transform, eye, at, up);
  }

}
