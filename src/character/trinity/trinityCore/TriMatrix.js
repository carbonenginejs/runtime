import { IRoot } from "../../../blue/exposure/IRoot.js";
import { exposure as be } from "#be";
import { type } from "#schema";
// Source: trinity/trinity/Include/TriMatrix.h, TriMatrix.cpp, TriMatrix_Blue.cpp
import { IPythonMethods } from "#blue";
import { ITriMatrix } from "./ITriMatrix.js";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/**
 * Carbon's Blue wrapper over a Matrix. Carbon's TriMatrix inherits Matrix, and its
 * sixteen persisted members are that matrix's elements (TriMatrix_Blue.cpp:18-33). The
 * port stores one mat4, and each element member is an accessor over its index: Carbon's row-major
 * Matrix has gl-matrix's byte layout, so `_41.._43` is the translation at [12..14].
 * Compositions swap operands, since Carbon is row-vector and gl-matrix column-vector.
 */
@be.define({
  name: "TriMatrix",
  inherit: [ ITriMatrix, IPythonMethods ],
  interfaces: [ ITriMatrix, IPythonMethods ],
  // TriMatrix_Blue.cpp:12-146, in Carbon's order.
  members: [
    [ be.ATTR, "_11", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "_12", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "_13", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "_14", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "_21", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "_22", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "_23", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "_24", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "_31", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "_32", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "_33", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "_34", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "_41", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "_42", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "_43", be.READWRITE | be.PERSIST ],
    [ be.ATTR, "_44", be.READWRITE | be.PERSIST ],
    [ be.METHOD, "__init__", be.AS_METHOD, "Py__init__" ],
    [ be.METHOD, "Determinant", be.WRAP ],
    [ be.METHOD, "Identity", be.WRAP ],
    [ be.METHOD, "Inverse", be.WRAP ],
    [ be.METHOD, "LookAtRH", be.WRAP, "PyLookAtRH" ],
    [ be.METHOD, "Multiply", be.WRAP, "PyMultiply" ],
    [ be.METHOD, "RotationAxis", be.WRAP, "PyRotationAxis" ],
    [ be.METHOD, "RotationQuaternion", be.WRAP, "PyRotationQuaternion" ],
    [ be.METHOD, "RotationX", be.WRAP ],
    [ be.METHOD, "RotationY", be.WRAP ],
    [ be.METHOD, "RotationYawPitchRoll", be.WRAP ],
    [ be.METHOD, "RotationZ", be.WRAP ],
    [ be.METHOD, "Scaling", be.WRAP ],
    [ be.METHOD, "Transformation", be.WRAP, "PyTransformation" ],
    [ be.METHOD, "Translation", be.WRAP ],
    [ be.METHOD, "Transpose", be.WRAP ]
  ]
})
export class TriMatrix extends IRoot
{
  /**
   * The matrix itself; Carbon constructs an identity (TriMatrix.cpp:72-90).
   * @type {mat4}
   */
  _matrix = mat4.create();

  /** Carbon Matrix::_11, element 0 of the storage. @type {number} */
  @type.float32
  get _11()
  {
    return this._matrix[0];
  }

  /** @param {number} value The element. */
  set _11(value)
  {
    this._matrix[0] = value;
  }

  /** Carbon Matrix::_12, element 1 of the storage. @type {number} */
  @type.float32
  get _12()
  {
    return this._matrix[1];
  }

  /** @param {number} value The element. */
  set _12(value)
  {
    this._matrix[1] = value;
  }

  /** Carbon Matrix::_13, element 2 of the storage. @type {number} */
  @type.float32
  get _13()
  {
    return this._matrix[2];
  }

  /** @param {number} value The element. */
  set _13(value)
  {
    this._matrix[2] = value;
  }

  /** Carbon Matrix::_14, element 3 of the storage. @type {number} */
  @type.float32
  get _14()
  {
    return this._matrix[3];
  }

  /** @param {number} value The element. */
  set _14(value)
  {
    this._matrix[3] = value;
  }

  /** Carbon Matrix::_21, element 4 of the storage. @type {number} */
  @type.float32
  get _21()
  {
    return this._matrix[4];
  }

  /** @param {number} value The element. */
  set _21(value)
  {
    this._matrix[4] = value;
  }

  /** Carbon Matrix::_22, element 5 of the storage. @type {number} */
  @type.float32
  get _22()
  {
    return this._matrix[5];
  }

  /** @param {number} value The element. */
  set _22(value)
  {
    this._matrix[5] = value;
  }

  /** Carbon Matrix::_23, element 6 of the storage. @type {number} */
  @type.float32
  get _23()
  {
    return this._matrix[6];
  }

  /** @param {number} value The element. */
  set _23(value)
  {
    this._matrix[6] = value;
  }

  /** Carbon Matrix::_24, element 7 of the storage. @type {number} */
  @type.float32
  get _24()
  {
    return this._matrix[7];
  }

  /** @param {number} value The element. */
  set _24(value)
  {
    this._matrix[7] = value;
  }

  /** Carbon Matrix::_31, element 8 of the storage. @type {number} */
  @type.float32
  get _31()
  {
    return this._matrix[8];
  }

  /** @param {number} value The element. */
  set _31(value)
  {
    this._matrix[8] = value;
  }

  /** Carbon Matrix::_32, element 9 of the storage. @type {number} */
  @type.float32
  get _32()
  {
    return this._matrix[9];
  }

  /** @param {number} value The element. */
  set _32(value)
  {
    this._matrix[9] = value;
  }

  /** Carbon Matrix::_33, element 10 of the storage. @type {number} */
  @type.float32
  get _33()
  {
    return this._matrix[10];
  }

  /** @param {number} value The element. */
  set _33(value)
  {
    this._matrix[10] = value;
  }

  /** Carbon Matrix::_34, element 11 of the storage. @type {number} */
  @type.float32
  get _34()
  {
    return this._matrix[11];
  }

  /** @param {number} value The element. */
  set _34(value)
  {
    this._matrix[11] = value;
  }

  /** Carbon Matrix::_41, element 12 of the storage. @type {number} */
  @type.float32
  get _41()
  {
    return this._matrix[12];
  }

  /** @param {number} value The element. */
  set _41(value)
  {
    this._matrix[12] = value;
  }

  /** Carbon Matrix::_42, element 13 of the storage. @type {number} */
  @type.float32
  get _42()
  {
    return this._matrix[13];
  }

  /** @param {number} value The element. */
  set _42(value)
  {
    this._matrix[13] = value;
  }

  /** Carbon Matrix::_43, element 14 of the storage. @type {number} */
  @type.float32
  get _43()
  {
    return this._matrix[14];
  }

  /** @param {number} value The element. */
  set _43(value)
  {
    this._matrix[14] = value;
  }

  /** Carbon Matrix::_44, element 15 of the storage. @type {number} */
  @type.float32
  get _44()
  {
    return this._matrix[15];
  }

  /** @param {number} value The element. */
  set _44(value)
  {
    this._matrix[15] = value;
  }

  /**
   * Carbon Py__init__ (TriMatrix.cpp:286-293), the Python constructor: each optional element, in `_11 .. _44` order, replaces
   * that element of the matrix.
   *
   * @implemented
   * @param {...number} elements Up to sixteen elements.
   * @throws {TypeError} When more than sixteen are given, as PyArg_ParseTuple refuses them.
   */
  Py__init__(...elements)
  {
    if (elements.length > 16) throw new TypeError(`TriMatrix.__init__ takes at most 16 elements (${elements.length} given).`);

    for (let i = 0; i < elements.length; i++) this._matrix[i] = elements[i];
  }

  /**
   * Carbon PyLookAtRH (TriMatrix.cpp:298-304): LookAtRH on the wrapped vectors.
   *
   * @implemented
   * @param {ITriVector} eye The eye position.
   * @param {ITriVector} at The target.
   * @param {ITriVector} up The up direction.
   */
  PyLookAtRH(eye, at, up)
  {
    this.LookAtRH(eye.GetVector(), at.GetVector(), up.GetVector());
  }

  /**
   * Carbon PyMultiply (TriMatrix.cpp:306-309): Multiply by the wrapped matrix.
   *
   * @implemented
   * @param {ITriMatrix} other The matrix applied after this one.
   */
  PyMultiply(other)
  {
    this.Multiply(other.GetMatrix());
  }

  /**
   * Carbon PyRotationAxis (TriMatrix.cpp:311-314): RotationAxis on the wrapped axis.
   *
   * @implemented
   * @param {ITriVector} axis The rotation axis.
   * @param {number} angle The angle in radians.
   */
  PyRotationAxis(axis, angle)
  {
    this.RotationAxis(axis.GetVector(), angle);
  }

  /**
   * Carbon PyRotationQuaternion (TriMatrix.cpp:316-319): RotationQuaternion on the wrapped quaternion.
   *
   * @implemented
   * @param {ITriQuaternion} quaternion The rotation.
   */
  PyRotationQuaternion(quaternion)
  {
    this.RotationQuaternion(quaternion.GetQuaternion());
  }

  /**
   * Carbon PyTransformation (TriMatrix.cpp:321-337): Transformation on the wrapped values.
   *
   * @implemented
   * @param {ITriVector} scalingCenter The scaling centre.
   * @param {ITriQuaternion} scalingRotation The scaling rotation.
   * @param {ITriVector} scaling The scaling.
   * @param {ITriVector} rotationCenter The rotation centre.
   * @param {ITriQuaternion} rotation The rotation.
   * @param {ITriVector} translation The translation.
   */
  PyTransformation(scalingCenter, scalingRotation, scaling, rotationCenter, rotation, translation)
  {
    this.Transformation(scalingCenter.GetVector(), scalingRotation.GetQuaternion(), scaling.GetVector(), rotationCenter.GetVector(),
      rotation.GetQuaternion(), translation.GetVector());
  }

  /**
   * IPythonMethods::Destroy (IPythonMethods.h:14): there is no Python wrapper to release.
   *
   * @notSupported
   */
  Destroy()
  {
  }

  /**
   * IPythonMethods::GetAttr (IPythonMethods.h:17): there is no Python host, so no attribute is handled.
   *
   * @notSupported
   * @param {string} name The attribute name.
   * @returns {null} Not handled.
   */
  GetAttr(name)
  {
    return null;
  }

  /**
   * IPythonMethods::SetAttr (IPythonMethods.h:22): there is no Python host, so no assignment is handled.
   *
   * @notSupported
   * @param {string} name The attribute name.
   * @param {*} value The value.
   * @returns {boolean} False: not handled.
   */
  SetAttr(name, value)
  {
    return false;
  }

  /**
   * IPythonMethods::Repr (IPythonMethods.h:26): there is no Python host, so no repr is supplied.
   *
   * @notSupported
   * @returns {null} Not handled.
   */
  Repr()
  {
    return null;
  }

  /**
   * Carbon GetMatrix (TriMatrix.cpp:160-163): the matrix storage itself.
   *
   * @implemented
   * @returns {mat4} The stored matrix.
   */

  GetMatrix()
  {
    return this._matrix;
  }

  /**
   * Carbon CopyMatrix (TriMatrix.cpp:165-170).
   *
   * @implemented
   * @param {mat4} out Receives the matrix.
   * @returns {mat4} out
   * Carbon declaration: TriMatrix::CopyMatrix (trinity/trinity/Include/TriMatrix.h:54).
   */
  CopyMatrix(out)
  {
    return mat4.copy(out, this._matrix);
  }

  /**
   * Carbon SetMatrix.
   *
   * @implemented
   * @param {mat4} m The matrix to copy in.
   * Carbon declaration: TriMatrix::SetMatrix (trinity/trinity/Include/TriMatrix.h:49).
   */
  SetMatrix(m)
  {
    mat4.copy(this._matrix, m);
  }

  /**
   * Carbon SetPivots: the sixteen elements in `_11 .. _44` order.
   *
   * @implemented
   * @param {...number} elements The elements.
   * Carbon declaration: TriMatrix::SetPivots (trinity/trinity/Include/TriMatrix.h:31).
   */
  SetPivots(...elements)
  {
    for (let i = 0; i < 16; i++) this._matrix[i] = elements[i];
  }

  /**
   * Carbon Determinant (TriMatrix.cpp:172-175).
   *
   * @implemented
   * @returns {number} The determinant.
   */
  Determinant()
  {
    return mat4.determinant(this._matrix);
  }

  /**
   * Carbon Identity (TriMatrix.cpp:177-180).
   *
   * @implemented
   */
  Identity()
  {
    mat4.identity(this._matrix);
  }

  /**
   * Carbon Inverse (TriMatrix.cpp:182-187): inverts in place and returns the determinant.
   *
   * @implemented
   * @returns {number} The determinant of the matrix before inversion.
   */
  Inverse()
  {
    const determinant = mat4.determinant(this._matrix);
    mat4.invert(this._matrix, this._matrix);
    return determinant;
  }

  /**
   * Carbon LookAtRH (TriMatrix.cpp:189-195, math LookAtMatrix): a right-handed view
   * matrix, element for element gl-matrix's lookAt.
   *
   * @implemented
   * @param {vec3} eye Eye position.
   * @param {vec3} at Target position.
   * @param {vec3} up Up direction.
   */
  LookAtRH(eye, at, up)
  {
    mat4.lookAt(this._matrix, eye, at, up);
  }

  /**
   * Carbon Multiply (TriMatrix.cpp:197-201): `this = this * m`, this applied first.
   *
   * @implemented
   * @param {mat4} m The matrix applied after this one.
   */
  Multiply(m)
  {
    mat4.multiply(this._matrix, m, this._matrix);
  }

  /**
   * Carbon RotationAxis (TriMatrix.cpp:203-208).
   *
   * @implemented
   * @param {vec3} axis Rotation axis; normalized as Carbon does.
   * @param {number} angle Angle in radians.
   */
  RotationAxis(axis, angle)
  {
    mat4.fromRotation(this._matrix, angle, axis);
  }

  /**
   * Carbon RotationQuaternion (TriMatrix.cpp:210-214).
   *
   * @implemented
   * @param {quat} rotation The rotation.
   */
  RotationQuaternion(rotation)
  {
    mat4.fromQuat(this._matrix, rotation);
  }

  /**
   * Carbon RotationX (TriMatrix.cpp:216-220).
   *
   * @implemented
   * @param {number} angle Angle in radians.
   */
  RotationX(angle)
  {
    mat4.fromXRotation(this._matrix, angle);
  }

  /**
   * Carbon RotationY (TriMatrix.cpp:222-226).
   *
   * @implemented
   * @param {number} angle Angle in radians.
   */
  RotationY(angle)
  {
    mat4.fromYRotation(this._matrix, angle);
  }

  /**
   * Carbon RotationYawPitchRoll (TriMatrix.cpp:228-234).
   *
   * @implemented
   * @param {number} yaw Yaw in radians.
   * @param {number} pitch Pitch in radians.
   * @param {number} roll Roll in radians.
   */
  RotationYawPitchRoll(yaw, pitch, roll)
  {
    mat4.fromQuat(this._matrix, quat.fromYawPitchRollCarbon(TriMatrix._rotation, yaw, pitch, roll));
  }

  /**
   * Carbon RotationZ (TriMatrix.cpp:236-240).
   *
   * @implemented
   * @param {number} angle Angle in radians.
   */
  RotationZ(angle)
  {
    mat4.fromZRotation(this._matrix, angle);
  }

  /**
   * Carbon Scaling (TriMatrix.cpp:242-248).
   *
   * @implemented
   * @param {number} sx X scale.
   * @param {number} sy Y scale.
   * @param {number} sz Z scale.
   */
  Scaling(sx, sy, sz)
  {
    mat4.fromScaling(this._matrix, [ sx, sy, sz ]);
  }

  /**
   * Carbon Transformation (TriMatrix.cpp:250-266, math Matrix.cpp:66-143): the product
   * `T(-scalingCenter) * inverse(Rs) * S * Rs * T(scalingCenter - rotationCenter) * R
   * * T(rotationCenter + translation)`, each factor applied before the next.
   *
   * @implemented
   * @param {vec3} scalingCenter Centre of scaling.
   * @param {quat} scalingRotation Orientation of the scaling axes.
   * @param {vec3} scaling Scale.
   * @param {vec3} rotationCenter Centre of rotation.
   * @param {quat} rotation Rotation.
   * @param {vec3} translation Translation.
   */
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
   *
   * @implemented
   * @param {number} x X translation.
   * @param {number} y Y translation.
   * @param {number} z Z translation.
   */
  Translation(x, y, z)
  {
    mat4.fromTranslation(this._matrix, [ x, y, z ]);
  }

  /**
   * Carbon Transpose (TriMatrix.cpp:276-279).
   *
   * @implemented
   */
  Transpose()
  {
    mat4.transpose(this._matrix, this._matrix);
  }

  /** Scratch for RotationYawPitchRoll. */
  static _rotation = quat.create();

  /** Scratch factor for Transformation. */
  static _factor = mat4.create();

  /** Scratch translation for Transformation. */
  static _offset = vec3.create();
}
