// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
// Source: trinity/trinity/Include/TriMatrix.h
// Maintained but intentionally unexported until the row-major Blue wrapper has
// an explicit conversion contract with column-major runtime-utils matrices.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/**
 * Unexported current Carbon row-major scripting matrix pending an explicit conversion contract.
 */
@type.define({ className: "TriMatrix", family: "trinityCore" })
export class TriMatrix extends CjsModel
{

  /** _11 (unknown) [READWRITE, PERSIST] */
  @io.persist
  @type.unknown
  _11 = null;

  /** _12 (unknown) [READWRITE, PERSIST] */
  @io.persist
  @type.unknown
  _12 = null;

  /** _13 (unknown) [READWRITE, PERSIST] */
  @io.persist
  @type.unknown
  _13 = null;

  /** _14 (unknown) [READWRITE, PERSIST] */
  @io.persist
  @type.unknown
  _14 = null;

  /** _21 (unknown) [READWRITE, PERSIST] */
  @io.persist
  @type.unknown
  _21 = null;

  /** _22 (unknown) [READWRITE, PERSIST] */
  @io.persist
  @type.unknown
  _22 = null;

  /** _23 (unknown) [READWRITE, PERSIST] */
  @io.persist
  @type.unknown
  _23 = null;

  /** _24 (unknown) [READWRITE, PERSIST] */
  @io.persist
  @type.unknown
  _24 = null;

  /** _31 (unknown) [READWRITE, PERSIST] */
  @io.persist
  @type.unknown
  _31 = null;

  /** _32 (unknown) [READWRITE, PERSIST] */
  @io.persist
  @type.unknown
  _32 = null;

  /** _33 (unknown) [READWRITE, PERSIST] */
  @io.persist
  @type.unknown
  _33 = null;

  /** _34 (unknown) [READWRITE, PERSIST] */
  @io.persist
  @type.unknown
  _34 = null;

  /** _41 (unknown) [READWRITE, PERSIST] */
  @io.persist
  @type.unknown
  _41 = null;

  /** _42 (unknown) [READWRITE, PERSIST] */
  @io.persist
  @type.unknown
  _42 = null;

  /** _43 (unknown) [READWRITE, PERSIST] */
  @io.persist
  @type.unknown
  _43 = null;

  /** _44 (unknown) [READWRITE, PERSIST] */
  @io.persist
  @type.unknown
  _44 = null;

  /** Carbon method RotationZ (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  RotationZ(...args)
  {
    throw new Error("TriMatrix.RotationZ is not implemented in CarbonEngineJS.");
  }

  /** Carbon method RotationX (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  RotationX(...args)
  {
    throw new Error("TriMatrix.RotationX is not implemented in CarbonEngineJS.");
  }

  /** Carbon method RotationY (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  RotationY(...args)
  {
    throw new Error("TriMatrix.RotationY is not implemented in CarbonEngineJS.");
  }

  /** Carbon method RotationAxis -> PyRotationAxis (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  RotationAxis(...args)
  {
    throw new Error("TriMatrix.RotationAxis is not implemented in CarbonEngineJS.");
  }

  /** Carbon method LookAtRH -> PyLookAtRH (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  LookAtRH(...args)
  {
    throw new Error("TriMatrix.LookAtRH is not implemented in CarbonEngineJS.");
  }

  /** Carbon method Multiply -> PyMultiply (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  Multiply(...args)
  {
    throw new Error("TriMatrix.Multiply is not implemented in CarbonEngineJS.");
  }

  /** Carbon method RotationQuaternion -> PyRotationQuaternion (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  RotationQuaternion(...args)
  {
    throw new Error("TriMatrix.RotationQuaternion is not implemented in CarbonEngineJS.");
  }

  /** Carbon method Transformation -> PyTransformation (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  Transformation(...args)
  {
    throw new Error("TriMatrix.Transformation is not implemented in CarbonEngineJS.");
  }

  /** Carbon method Scaling (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  Scaling(...args)
  {
    throw new Error("TriMatrix.Scaling is not implemented in CarbonEngineJS.");
  }

  /** Carbon method Translation (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  Translation(...args)
  {
    throw new Error("TriMatrix.Translation is not implemented in CarbonEngineJS.");
  }

  /** Carbon method RotationYawPitchRoll (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  RotationYawPitchRoll(...args)
  {
    throw new Error("TriMatrix.RotationYawPitchRoll is not implemented in CarbonEngineJS.");
  }

  /** Carbon method Transpose (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  Transpose(...args)
  {
    throw new Error("TriMatrix.Transpose is not implemented in CarbonEngineJS.");
  }

  /** Carbon method Determinant (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  Determinant(...args)
  {
    throw new Error("TriMatrix.Determinant is not implemented in CarbonEngineJS.");
  }

  /** Carbon method Identity (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  Identity(...args)
  {
    throw new Error("TriMatrix.Identity is not implemented in CarbonEngineJS.");
  }

  /** Carbon method Inverse (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  Inverse(...args)
  {
    throw new Error("TriMatrix.Inverse is not implemented in CarbonEngineJS.");
  }

}
