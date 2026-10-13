// Source: trinity/trinity/Include/TriMatrix.h, TriMatrix.cpp, TriMatrix_Blue.cpp
import { meta } from "#schema";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";

/** Carbon's Matrix element names in storage order (_11 .. _44, row by row). */
const ELEMENTS = [
  "_11", "_12", "_13", "_14",
  "_21", "_22", "_23", "_24",
  "_31", "_32", "_33", "_34",
  "_41", "_42", "_43", "_44"
];

/**
 * Carbon's Blue wrapper over a Matrix. Carbon's TriMatrix inherits Matrix, and its
 * sixteen persisted members are that matrix's elements (TriMatrix_Blue.cpp:18-33). The
 * port stores one mat4 and maps each element member to its index: Carbon's row-major
 * Matrix has gl-matrix's byte layout, so `_41.._43` is the translation at [12..14].
 * Compositions swap operands, since Carbon is row-vector and gl-matrix column-vector.
 */
@meta.define({
  className: "TriMatrix",
  family: "trinityCore",
  members: ELEMENTS.map((name, index) => ({
    name, key: "_matrix", index, type: { kind: "float32" }, edit: { read: true, write: true, persist: true }
  }))
})
export class TriMatrix
{
  /**
   * The matrix itself; Carbon constructs an identity (TriMatrix.cpp:72-90).
   * @type {mat4}
   */
  _matrix = mat4.create();

  /**
   * Carbon GetMatrix (TriMatrix.cpp:160-163): the matrix storage itself.
   * @returns {mat4} The stored matrix.
   */
  @meta.implemented
  GetMatrix()
  {
    return this._matrix;
  }

  /**
   * Carbon CopyMatrix (TriMatrix.cpp:165-170).
   * @param {mat4} out Receives the matrix.
   * @returns {mat4} out
   */
  @meta.implemented
  CopyMatrix(out)
  {
    return mat4.copy(out, this._matrix);
  }

  /**
   * Carbon SetMatrix.
   * @param {mat4} m The matrix to copy in.
   */
  @meta.implemented
  SetMatrix(m)
  {
    mat4.copy(this._matrix, m);
  }

  /**
   * Carbon SetPivots: the sixteen elements in `_11 .. _44` order.
   * @param {...number} elements The elements.
   */
  @meta.implemented
  SetPivots(...elements)
  {
    for (let i = 0; i < 16; i++) this._matrix[i] = elements[i];
  }

  /**
   * Carbon Determinant (TriMatrix.cpp:172-175).
   * @returns {number} The determinant.
   */
  @meta.blue.method
  @meta.implemented
  Determinant()
  {
    return mat4.determinant(this._matrix);
  }

  /** Carbon Identity (TriMatrix.cpp:177-180). */
  @meta.blue.method
  @meta.implemented
  Identity()
  {
    mat4.identity(this._matrix);
  }

  /**
   * Carbon Inverse (TriMatrix.cpp:182-187): inverts in place and returns the determinant.
   * @returns {number} The determinant of the matrix before inversion.
   */
  @meta.blue.method
  @meta.implemented
  Inverse()
  {
    const determinant = mat4.determinant(this._matrix);
    mat4.invert(this._matrix, this._matrix);
    return determinant;
  }

  /**
   * Carbon LookAtRH (TriMatrix.cpp:189-195, math LookAtMatrix): a right-handed view
   * matrix, element for element gl-matrix's lookAt.
   * @param {vec3} eye Eye position.
   * @param {vec3} at Target position.
   * @param {vec3} up Up direction.
   */
  @meta.blue.method
  @meta.implemented
  LookAtRH(eye, at, up)
  {
    mat4.lookAt(this._matrix, eye, at, up);
  }

  /**
   * Carbon Multiply (TriMatrix.cpp:197-201): `this = this * other`, this applied first.
   * @param {TriMatrix} other The matrix applied after this one.
   */
  @meta.blue.method
  @meta.implemented
  Multiply(other)
  {
    mat4.multiply(this._matrix, other.GetMatrix(), this._matrix);
  }

  /**
   * Carbon RotationAxis (TriMatrix.cpp:203-208).
   * @param {vec3} axis Rotation axis; normalized as Carbon does.
   * @param {number} angle Angle in radians.
   */
  @meta.blue.method
  @meta.implemented
  RotationAxis(axis, angle)
  {
    mat4.fromRotation(this._matrix, angle, axis);
  }

  /**
   * Carbon RotationQuaternion (TriMatrix.cpp:210-214).
   * @param {quat} rotation The rotation.
   */
  @meta.blue.method
  @meta.implemented
  RotationQuaternion(rotation)
  {
    mat4.fromQuat(this._matrix, rotation);
  }

  /**
   * Carbon RotationX (TriMatrix.cpp:216-220).
   * @param {number} angle Angle in radians.
   */
  @meta.blue.method
  @meta.implemented
  RotationX(angle)
  {
    mat4.fromXRotation(this._matrix, angle);
  }

  /**
   * Carbon RotationY (TriMatrix.cpp:222-226).
   * @param {number} angle Angle in radians.
   */
  @meta.blue.method
  @meta.implemented
  RotationY(angle)
  {
    mat4.fromYRotation(this._matrix, angle);
  }

  /**
   * Carbon RotationYawPitchRoll (TriMatrix.cpp:228-234).
   * @param {number} yaw Yaw in radians.
   * @param {number} pitch Pitch in radians.
   * @param {number} roll Roll in radians.
   */
  @meta.blue.method
  @meta.implemented
  RotationYawPitchRoll(yaw, pitch, roll)
  {
    mat4.fromQuat(this._matrix, quat.fromYawPitchRoll(TriMatrix._rotation, yaw, pitch, roll));
  }

  /**
   * Carbon RotationZ (TriMatrix.cpp:236-240).
   * @param {number} angle Angle in radians.
   */
  @meta.blue.method
  @meta.implemented
  RotationZ(angle)
  {
    mat4.fromZRotation(this._matrix, angle);
  }

  /**
   * Carbon Scaling (TriMatrix.cpp:242-248).
   * @param {number} sx X scale.
   * @param {number} sy Y scale.
   * @param {number} sz Z scale.
   */
  @meta.blue.method
  @meta.implemented
  Scaling(sx, sy, sz)
  {
    mat4.fromScaling(this._matrix, [ sx, sy, sz ]);
  }

  /**
   * Carbon Transformation (TriMatrix.cpp:250-266, math Matrix.cpp:66-143): the product
   * `T(-scalingCenter) * inverse(Rs) * S * Rs * T(scalingCenter - rotationCenter) * R
   * * T(rotationCenter + translation)`, each factor applied before the next.
   * @param {vec3} scalingCenter Centre of scaling.
   * @param {quat} scalingRotation Orientation of the scaling axes.
   * @param {vec3} scaling Scale.
   * @param {vec3} rotationCenter Centre of rotation.
   * @param {quat} rotation Rotation.
   * @param {vec3} translation Translation.
   */
  @meta.blue.method
  @meta.implemented
  Transformation(scalingCenter, scalingRotation, scaling, rotationCenter, rotation, translation)
  {
    const out = this._matrix, factor = TriMatrix._factor, offset = TriMatrix._offset;
    mat4.fromTranslation(out, [ -scalingCenter[0], -scalingCenter[1], -scalingCenter[2] ]);
    mat4.fromQuat(factor, scalingRotation);
    mat4.invert(factor, factor);
    mat4.multiply(out, factor, out);
    mat4.fromScaling(factor, scaling);
    mat4.multiply(out, factor, out);
    mat4.fromQuat(factor, scalingRotation);
    mat4.multiply(out, factor, out);
    offset[0] = scalingCenter[0] - rotationCenter[0];
    offset[1] = scalingCenter[1] - rotationCenter[1];
    offset[2] = scalingCenter[2] - rotationCenter[2];
    mat4.multiply(out, mat4.fromTranslation(factor, offset), out);
    mat4.multiply(out, mat4.fromQuat(factor, rotation), out);
    offset[0] = rotationCenter[0] + translation[0];
    offset[1] = rotationCenter[1] + translation[1];
    offset[2] = rotationCenter[2] + translation[2];
    mat4.multiply(out, mat4.fromTranslation(factor, offset), out);
  }

  /**
   * Carbon Translation (TriMatrix.cpp:268-274).
   * @param {number} x X translation.
   * @param {number} y Y translation.
   * @param {number} z Z translation.
   */
  @meta.blue.method
  @meta.implemented
  Translation(x, y, z)
  {
    mat4.fromTranslation(this._matrix, [ x, y, z ]);
  }

  /** Carbon Transpose (TriMatrix.cpp:276-279). */
  @meta.blue.method
  @meta.implemented
  Transpose()
  {
    mat4.transpose(this._matrix, this._matrix);
  }

  /** Scratch for RotationYawPitchRoll. */
  static _rotation = quat.create();

  /** Scratch factor for Transformation. */
  static _factor = mat4.create();

  /** Scratch translation for Transformation. */
  static _offset = new Float32Array(3);
}
