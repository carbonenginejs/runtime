// Source: trinity/trinity/Tr2ManipulationTool.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/** The interactive manipulator base: axis selection, drag handling and the callback a move reports through. */
@type.define({ className: "Tr2ManipulationTool", family: "trinityCore" })
export class Tr2ManipulationTool extends CjsModel
{

  /** Carbon's selected primitive/axis name. */
  @type.string
  selectedAxis = "";

  /** Browser callback replacing BlueScriptCallback. */
  @type.rawStruct("BlueScriptCallback")
  moveCallback = null;

  /** m_captured (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  captured = false;

  /** m_primitives (PTr2PrimitiveSetVector) [READ] */
  @io.read
  @type.list("Tr2PrimitiveSet")
  primitives = [];

  /** m_pythonUserData (PyObject*) [READWRITE] */
  @io.readwrite
  @type.objectRef("PyObject")
  _userData = null;

  /** m_localTransform (Matrix) [READWRITE, PERSIST] */
  @io.persist
  @type.mat4
  localTransform = mat4.create();

  /** m_pivot (Vector3) [READWRITE] */
  @io.readwrite
  @type.vec3
  pivot = vec3.create();

  /** m_worldTransform (Matrix) [READ] */
  @io.read
  @type.mat4
  worldTransform = mat4.create();

  /** Carbon method SetMoveCallback (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  SetMoveCallback(callback)
  {
    this.moveCallback = callback ?? null;
  }

  /** Carbon method SelectAxis (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  SelectAxis(axisName)
  {
    const selected = this.primitives.filter(primitive => primitive?.name === axisName);
    if (selected.length === 0)
    {
      return false;
    }
    this.ResetPrimitiveColors();
    const yellow = vec4.fromValues(1, 1, 0.01, 1);
    for (const primitive of selected)
    {
      primitive.SetCurrentColor(yellow);
    }
    this.selectedAxis = axisName;
    return true;
  }

  /** Carbon method Init (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  Init(initialTransform)
  {
    mat4.copy(this.localTransform, initialTransform);
  }

  /** Required per-frame manipulator update contract (Tr2ManipulationTool.h:37). */
  @impl.abstract
  Update(..._args)
  {
    throw new Error("Tr2ManipulationTool.Update must be implemented by a concrete manipulation tool.");
  }

  /** Required guide-geometry construction contract (Tr2ManipulationTool.h:38). */
  @impl.abstract
  GenLineSets(..._args)
  {
    throw new Error("Tr2ManipulationTool.GenLineSets must be implemented by a concrete manipulation tool.");
  }

  /** Required primitive-colour reset contract (Tr2ManipulationTool.h:39). */
  @impl.abstract
  ResetPrimitiveColors(..._args)
  {
    throw new Error("Tr2ManipulationTool.ResetPrimitiveColors must be implemented by a concrete manipulation tool.");
  }

  /** Required visible-primitive collection contract (Tr2ManipulationTool.h:40). */
  @impl.abstract
  GetPrimitivesToRender(..._args)
  {
    throw new Error("Tr2ManipulationTool.GetPrimitivesToRender must be implemented by a concrete manipulation tool.");
  }

  /** Carbon's pure-virtual Move contract, exposed through PyMove. */
  @carbon.method
  @impl.abstract
  Move(..._args)
  {
    throw new Error("Tr2ManipulationTool.Move must be implemented by a concrete manipulation tool.");
  }

  /** Invokes Carbon's move veto callback with current and proposed transforms. */
  @impl.adapted
  OnMoveCallback(currentTransform, nextTransform)
  {
    if (!this.moveCallback)
    {
      return true;
    }
    if (typeof this.moveCallback === "function")
    {
      return this.moveCallback(currentTransform, nextTransform) !== false;
    }
    return this.moveCallback.Call?.(currentTransform, nextTransform) !== false;
  }

}
