// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Children\TransformModifiers\EveChildModifierCameraOrientedRotationConstrained.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, type } from "@carbonenginejs/runtime-utils/schema";


const UP = vec3.fromValues(0, 1, 0);

/**
 * Transform modifier that yaws a child about world up until it faces the camera
 * in the horizontal plane, leaving its authored pitch and roll intact.
 */
@type.define({
  className: "EveChildModifierCameraOrientedRotationConstrained",
  family: "eve/child/modifiers"
})
export class EveChildModifierCameraOrientedRotationConstrained extends CjsModel
{
  static scratch = {
    rotation: quat.create(),
    translation: vec3.create(),
    scale: vec3.create(),
    normal: vec3.create(),
    p: vec3.create(),
    rotMatrix: mat4.create(),
    result: mat4.create()
  };

  /**
   * Axis-angle rotation matrix in the column-major flat layout, reproducing
   * Carbon RotationMatrix(const Vector3& axis, float angle) (Matrix_inline.h).
   * Carbon's row-major element _(r+1)(c+1) maps to this mat4 at index r*4 + c
   * (the shared byte layout - row i occupies flat [i*4 .. i*4+3]).
   * @param {Float32Array} out
   * @param {Float32Array} axis - normalized internally
   * @param {Number} angle - radians
   * @returns {Float32Array} out
   */
  static rotationMatrixAxisAngle(out, axis, angle)
  {
    const normal = this.scratch.normal;
    vec3.normalize(normal, axis);

    const sinAngle = Math.sin(angle);
    const cosAngle = Math.cos(angle);
    const t = 1 - cosAngle;

    out[0] = t * normal[0] * normal[0] + cosAngle;
    out[4] = t * normal[0] * normal[1] - sinAngle * normal[2];
    out[8] = t * normal[0] * normal[2] + sinAngle * normal[1];
    out[12] = 0;

    out[1] = t * normal[1] * normal[0] + sinAngle * normal[2];
    out[5] = t * normal[1] * normal[1] + cosAngle;
    out[9] = t * normal[1] * normal[2] - sinAngle * normal[0];
    out[13] = 0;

    out[2] = t * normal[2] * normal[0] - sinAngle * normal[1];
    out[6] = t * normal[2] * normal[1] + sinAngle * normal[0];
    out[10] = t * normal[2] * normal[2] + cosAngle;
    out[14] = 0;

    out[3] = 0;
    out[7] = 0;
    out[11] = 0;
    out[15] = 1;
    return out;
  }

  /**
   * Yaws the child about world up (0,1,0) so it faces the camera in the
   * horizontal plane, leaving its own pitch/roll intact. Reproduces
   * EveChildModifierCameraOrientedRotationConstrained::ApplyTransform (Carbon):
   * decompose the child, project (camPos - translation) into the child's
   * rotation frame, take its heading atan2(vec.x, vec.z), and pre-multiply a
   * world-up rotation by that angle. Return result * transform.
   * @param {Object} context - frame context; reads context.renderContext
   * @param {Float32Array} transform - source (read only)
   * @param {Number} [boneCount] - Carbon signature parity, unused
   * @param {Float32Array} [bones] - Carbon signature parity, unused
   * @param {Float32Array} out - caller-owned; receives the result
   * @returns {Float32Array} out
   */
  @carbon.method
  @carbon.contextual(["camera"])
  @impl.implemented
  ApplyTransform(context, transform, boneCount, bones, out)
  {
    const renderContext = context?.renderContext;

    if (!renderContext)
    {
      return mat4.copy(out, transform);
    }

    const { rotation, translation, scale, p, rotMatrix, result } = this.constructor.scratch;

    // Carbon: Decompose(scale, rotation, translation, transform).
    mat4.decompose(transform, rotation, translation, scale);
    mat4.fromQuat(rotMatrix, rotation);

    const camPos = renderContext.GetViewPosition();
    p[0] = camPos[0] - translation[0];
    p[1] = camPos[1] - translation[1];
    p[2] = camPos[2] - translation[2];

    // vec = rotMatrix * Vector4(camPos - translation, 0). Carbon dots the matrix
    // ROWS with the vector: row0 -> mat4 [0,1,2], row2 -> mat4 [8,9,10]. Only
    // vec.x and vec.z feed atan2, so vec.y (row1) is never formed.
    const vecX = rotMatrix[0] * p[0] + rotMatrix[1] * p[1] + rotMatrix[2] * p[2];
    const vecZ = rotMatrix[8] * p[0] + rotMatrix[9] * p[1] + rotMatrix[10] * p[2];

    const rot = Math.atan2(vecX, vecZ);
    this.constructor.rotationMatrixAxisAngle(result, UP, rot);

    // Carbon (row-vector): result * transform - the yaw applies first, then
    // the child transform. In gl-matrix that is out = transform . result.
    mat4.multiply(out, transform, result);
    return out;
  }
}
