// Source: trinity/trinity/Curves/Tr2BoneMatrixCurve.h
// Source: trinity/trinity/Curves/Tr2BoneMatrixCurve_Blue.cpp
// Source: trinity/trinity/include/Tr2Curve.h:26-33
import { mat4 } from "#math/mat4";
import { meta, types } from "#schema";


/**
 * One key of a matrix curve: a time in seconds and the 4x4 matrix value at that
 * time.
 * Adapted: the Tr2Key<Matrix> data members are stored directly; no behavioral
 * base is needed. Zero time remains a deterministic JS default for the native
 * uninitialized scalar. The identity matrix matches Matrix's default constructor
 * (math/include/Matrix_inline.h:7-11).
 */
@meta.define({
  className: "Tr2MatrixKey",
  family: "curves"
})
export class Tr2MatrixKey
{
  /** Key time in seconds. */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  time = 0;

  /** Owned matrix storage; each key has a distinct buffer. */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.mat4
  value = mat4.create();

}

// Native own query table; no inherited exposure chain.
meta.carbon.interfaceTable({ interfaces: [ Tr2MatrixKey ], chainTo: null })(Tr2MatrixKey);
