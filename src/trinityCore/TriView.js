// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/TriView.h
//   trinity/trinity/TriView.cpp
//   trinity/trinity/TriView_Blue.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";


@type.define({ className: "TriView", family: "trinityCore" })
export class TriView extends CjsModel
{

  /** m_transform (Matrix) [READWRITE, PERSIST] */
  @io.persist
  @type.mat4
  transform = mat4.create();

  @carbon.method
  @impl.implemented
  SetTransform(value)
  {
    mat4.copy(this.transform, value);
  }

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
