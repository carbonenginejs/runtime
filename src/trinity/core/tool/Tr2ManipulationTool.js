// Source: trinity/trinity/Tr2ManipulationTool.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta } from "#schema";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/** The interactive manipulator base: axis selection, drag handling and the callback a move reports through. */
@meta.define({ className: "Tr2ManipulationTool", family: "trinityCore" })
export class Tr2ManipulationTool
{

  /** Carbon's selected primitive/axis name. */
  @meta.type.string
  selectedAxis = "";

  /** Browser callback replacing BlueScriptCallback. */
  @meta.type.rawStruct("BlueScriptCallback")
  moveCallback = null;

  /** m_captured (bool) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.boolean
  captured = false;

  /** m_primitives (PTr2PrimitiveSetVector) [READ] */
  @meta.blue.read
  @meta.type.list("Tr2PrimitiveSet")
  primitives = [];

  /** m_pythonUserData (PyObject*) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.objectRef("PyObject")
  _userData = null;

  /** m_localTransform (Matrix) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.mat4
  localTransform = mat4.create();

  /** m_pivot (Vector3) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.vec3
  pivot = vec3.create();

  /** m_worldTransform (Matrix) [READ] */
  @meta.blue.read
  @meta.type.mat4
  worldTransform = mat4.create();

  /** Carbon method SetMoveCallback (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
  SetMoveCallback(callback)
  {
    this.moveCallback = callback ?? null;
  }

  /** Carbon method SelectAxis (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
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
  @meta.blue.method
  @meta.implemented
  Init(initialTransform)
  {
    mat4.copy(this.localTransform, initialTransform);
  }

  /**
   * Carbon GetBaseVectors (Tr2ManipulationTool.cpp): the tool's local basis,
   * each row of the local transform normalised. Row r maps to gl-matrix
   * indices [(r-1)*4 .. (r-1)*4+2].
   *
   * @param {Float32Array} [outX] Caller-owned; allocated when omitted.
   * @param {Float32Array} [outY]
   * @param {Float32Array} [outZ]
   * @returns {[Float32Array, Float32Array, Float32Array]} The three axes.
   */
  @meta.blue.method
  @meta.implemented
  GetBaseVectors(outX = vec3.create(), outY = vec3.create(), outZ = vec3.create())
  {
    const local = this.localTransform;
    vec3.normalize(outX, vec3.set(outX, local[0], local[1], local[2]));
    vec3.normalize(outY, vec3.set(outY, local[4], local[5], local[6]));
    vec3.normalize(outZ, vec3.set(outZ, local[8], local[9], local[10]));
    return [ outX, outY, outZ ];
  }

  /** Required per-frame manipulator update contract (Tr2ManipulationTool.h:37). */
  @meta.abstract
  Update(..._args)
  {
    throw new Error("Tr2ManipulationTool.Update must be implemented by a concrete manipulation tool.");
  }

  /** Required guide-geometry construction contract (Tr2ManipulationTool.h:38). */
  @meta.abstract
  GenLineSets(..._args)
  {
    throw new Error("Tr2ManipulationTool.GenLineSets must be implemented by a concrete manipulation tool.");
  }

  /** Required primitive-colour reset contract (Tr2ManipulationTool.h:39). */
  @meta.abstract
  ResetPrimitiveColors(..._args)
  {
    throw new Error("Tr2ManipulationTool.ResetPrimitiveColors must be implemented by a concrete manipulation tool.");
  }

  /** Required visible-primitive collection contract (Tr2ManipulationTool.h:40). */
  @meta.abstract
  GetPrimitivesToRender(..._args)
  {
    throw new Error("Tr2ManipulationTool.GetPrimitivesToRender must be implemented by a concrete manipulation tool.");
  }

  /** Carbon's pure-virtual Move contract, exposed through PyMove. */
  @meta.blue.method
  @meta.abstract
  Move(..._args)
  {
    throw new Error("Tr2ManipulationTool.Move must be implemented by a concrete manipulation tool.");
  }

  /** Invokes Carbon's move veto callback with current and proposed transforms. */
  @meta.adapted
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
