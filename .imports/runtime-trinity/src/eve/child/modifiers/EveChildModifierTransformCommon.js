// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Children\TransformModifiers\EveChildModifierTransformCommon.h
//
// Shared camera-relative transform math for the camera-dependent
// EveChildModifier* family. Carbon's free functions are inline in the header.
//
// Carbon's Matrix is row-major / row-vector (v' = v * M). Its basis rows
// X=(_11.._13) / Y=(_21.._23) / Z=(_31.._33) map onto this codebase's
// column-major gl-matrix mat4 at indices [0,1,2] / [4,5,6] / [8,9,10];
// translation (_41.._43) at [12,13,14] - the byte layouts are identical, so
// individual matrices carry over unchanged. Composition REVERSES: Carbon's
// row-vector product A * B applies A first, which in gl-matrix is
// mat4.multiply(out, B, A) - SWAPPED operands. (A previous revision of this
// comment claimed same-order operands; that was wrong and produced reversed
// child-transform composition. See EveTransform.UpdateViewDependentData for
// the reference pattern: world = parent . local.)
//
// Carbon reads view state from Tr2Renderer statics; we thread it explicitly and
// read the same values from the frame context's Tr2RenderContext (context first):
//   camPos     = Tr2Renderer::GetViewPosition()         -> renderContext.GetViewPosition()
//   viewMatrix = Tr2Renderer::GetViewTransform()        -> renderContext.GetViewTransform()
//   invView    = Tr2Renderer::GetInverseViewTransform() -> renderContext.GetInverseViewTransform()
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";


// Allocated once, reused in place - non-reentrant per-frame math (equivalent to
// static class scratch for these free functions). Never pooled, never remade.
const scratch = {
  camFwd: vec3.create(),
  right: vec3.create(),
  up: vec3.create()
};

/**
 * Rotates a vector into a transform's basis frame, reproducing Carbon
 * TriVectorRotateMatrix(out, v, Transpose(transform)) - i.e. dotting v against
 * the transform's basis ROWS (X=[0,1,2] / Y=[4,5,6] / Z=[8,9,10]). This is a
 * pure 3x3 rotate: NO translation and NO perspective divide. (gl-matrix
 * vec3.transformMat4 against Transpose(transform) would divide by
 * w = dot(v, transform.translation) + 1, corrupting the result for any child
 * that has a non-zero position - Carbon does no such divide.) Safe in place.
 * @param {Float32Array} out
 * @param {Float32Array} v
 * @param {Float32Array} transform
 * @returns {Float32Array} out
 */
function rotateIntoBasis(out, v, transform)
{
  const x = v[0];
  const y = v[1];
  const z = v[2];
  out[0] = x * transform[0] + y * transform[1] + z * transform[2];
  out[1] = x * transform[4] + y * transform[5] + z * transform[6];
  out[2] = x * transform[8] + y * transform[9] + z * transform[10];
  return out;
}

/**
 * Change-of-basis matrix, reproducing TriMatrixChangeBase(out, fwd, up) (Carbon
 * TriMath.cpp): row0 (right) = Cross(up, fwd), row1 = up, row2 = fwd.
 * @param {Float32Array} out
 * @param {Float32Array} forward - unit vector
 * @param {Float32Array} up - unit vector
 * @returns {Float32Array} out
 */
function changeBase(out, forward, up)
{
  const { right } = scratch;
  vec3.cross(right, up, forward);

  mat4.identity(out);
  out[0] = right[0];
  out[1] = right[1];
  out[2] = right[2];
  out[4] = up[0];
  out[5] = up[1];
  out[6] = up[2];
  out[8] = forward[0];
  out[9] = forward[1];
  out[10] = forward[2];
  return out;
}

/**
 * Camera-facing alignment basis plus the parent-space, scale-corrected distance
 * and (unnormalized) direction from the child to the camera. Reproduces
 * DistanceBase (EveChildModifierTransformCommon.h) - used by Booster and
 * HaloInverted.
 * @param {Object} context - frame context; reads context.renderContext
 * @param {Float32Array} transform - child local transform (read only)
 * @param {Float32Array} outAlignMat - receives the change-of-basis matrix
 * @param {Float32Array} outD - receives camPos - transform translation (not normalized)
 * @returns {Number} distCenter - parent-space, scale-corrected distance to the camera
 */
export function DistanceBase(context, transform, outAlignMat, outD)
{
  const { camFwd, right, up } = scratch;
  const renderContext = context.renderContext;
  const camPos = renderContext.GetViewPosition();

  outD[0] = camPos[0] - transform[12];
  outD[1] = camPos[1] - transform[13];
  outD[2] = camPos[2] - transform[14];

  rotateIntoBasis(camFwd, outD, transform);

  const lengthSqX = vec3.squaredLength(transform.subarray(0, 3));
  const lengthSqY = vec3.squaredLength(transform.subarray(4, 7));
  const lengthSqZ = vec3.squaredLength(transform.subarray(8, 11));
  camFwd[0] = lengthSqX !== 0 ? camFwd[0] / lengthSqX : 0;
  camFwd[1] = lengthSqY !== 0 ? camFwd[1] / lengthSqY : 0;
  camFwd[2] = lengthSqZ !== 0 ? camFwd[2] / lengthSqZ : 0;

  const distCenter = vec3.length(camFwd);
  vec3.normalize(camFwd, camFwd);

  // right = first column of the view matrix (_11,_21,_31 -> [0,4,8]), rotated
  // into the transform's basis frame.
  const view = renderContext.GetViewTransform();
  vec3.set(right, view[0], view[4], view[8]);
  rotateIntoBasis(right, right, transform);

  vec3.cross(up, camFwd, right);
  vec3.normalize(up, up);

  changeBase(outAlignMat, camFwd, up);

  return distCenter;
}

/**
 * Screen-aligned billboard: copies the inverse-view rotation rows into the
 * transform's 3x3 scaled by parent axis magnitudes, preserving translation.
 * Reproduces Billboard2D (EveChildModifierTransformCommon.h).
 * @param {Object} context - frame context; reads context.renderContext
 * @param {Float32Array} transform - source (read only)
 * @param {Float32Array} out - receives the result
 * @returns {Float32Array} out
 */
export function Billboard2D(context, transform, out)
{
  const scaleX = vec3.length(transform.subarray(0, 3));
  const scaleY = vec3.length(transform.subarray(4, 7));
  const scaleZ = vec3.length(transform.subarray(8, 11));

  const invView = context.renderContext.GetInverseViewTransform();

  mat4.copy(out, transform);
  out[0] = invView[0] * scaleX;
  out[1] = invView[1] * scaleX;
  out[2] = invView[2] * scaleX;
  out[4] = invView[4] * scaleY;
  out[5] = invView[5] * scaleY;
  out[6] = invView[6] * scaleY;
  out[8] = invView[8] * scaleZ;
  out[9] = invView[9] * scaleZ;
  out[10] = invView[10] * scaleZ;
  return out;
}
