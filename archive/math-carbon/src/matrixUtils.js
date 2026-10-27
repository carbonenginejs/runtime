// Carbon MatrixUtils, ported literally from trinity
// (trinity/trinity/Utilities/MatrixUtils.h, MatrixUtils.cpp).
// MatrixUtils.h holds free functions and one struct, so this module is a camelCase
// namespace (`matrixUtils.isMirrored`) and Float4x3 is a class, as a Carbon struct.

import { Matrix } from "./matrix.js";

/**
 * Carbon: Float4x3 (Utilities/MatrixUtils.h:9-17)
 * A 3x4 bone matrix: float elements[12], the transpose of a Matrix's first three
 * columns (elements[r * 4 + c] is Matrix _{c+1}{r+1}). Storage is a plain
 * Float32Array(12), as every value in this archive.
 */
export class Float4x3
{
    /**
     * Carbon: Float4x3() = default (MatrixUtils.h:11); elements are uninitialized in C++,
     * zero here.
     * @returns {Float32Array}
     */
    static create()
    {
        return new Float32Array(12);
    }

    /**
     * Carbon: explicit Float4x3( const Matrix& m ) (MatrixUtils.cpp:6-20)
     * @param {Float32Array} m
     * @returns {Float32Array} a new Float4x3
     */
    static create__Matrix(m)
    {
        const out = new Float32Array(12);
        out[0] = m[0];
        out[1] = m[4];
        out[2] = m[8];
        out[3] = m[12];
        out[4] = m[1];
        out[5] = m[5];
        out[6] = m[9];
        out[7] = m[13];
        out[8] = m[2];
        out[9] = m[6];
        out[10] = m[10];
        out[11] = m[14];
        return out;
    } // MatrixUtils.cpp:6

    /**
     * Carbon: Float4x3::operator Matrix() const (MatrixUtils.cpp:22-26)
     * Renamed: JS has no conversion operators. The fourth column is (0, 0, 0, 1).
     * @param {Float32Array} out - receives the Matrix
     * @param {Float32Array} f - Float4x3
     * @returns {Float32Array} out
     */
    static toMatrix(out, f)
    {
        out[0] = f[0];
        out[1] = f[4];
        out[2] = f[8];
        out[3] = 0.0;
        out[4] = f[1];
        out[5] = f[5];
        out[6] = f[9];
        out[7] = 0.0;
        out[8] = f[2];
        out[9] = f[6];
        out[10] = f[10];
        out[11] = 0.0;
        out[12] = f[3];
        out[13] = f[7];
        out[14] = f[11];
        out[15] = 1.0;
        return out;
    } // MatrixUtils.cpp:22
}

/**
 * Carbon: IsMirrored (MatrixUtils.cpp:28-31)
 * @param {Float32Array} m
 * @returns {boolean} true for a negative determinant
 */
export function isMirrored(m)
{
    return Matrix.determinant(m) < 0.0;
} // MatrixUtils.cpp:28

/**
 * Carbon: DecomposeMirrorAware (MatrixUtils.cpp:33-46)
 * Decompose, except that a mirrored matrix has row mirrorAxis negated first and the
 * matching scale component negated after.
 * @param {Float32Array} scale - receives the scale
 * @param {Float32Array} rotation - receives the quaternion
 * @param {Float32Array} translation - receives the translation
 * @param {Float32Array} m
 * @param {number} [mirrorAxis=0] Carbon's default argument (MatrixUtils.h:33)
 */
export function decomposeMirrorAware(scale, rotation, translation, m, mirrorAxis = 0)
{
    if (!isMirrored(m))
    {
        Matrix.decompose(scale, rotation, translation, m);
        return;
    }
    const mirrored = Matrix.copy(scratch.mat4_0, m);
    mirrored[mirrorAxis * 4] = -mirrored[mirrorAxis * 4];
    mirrored[mirrorAxis * 4 + 1] = -mirrored[mirrorAxis * 4 + 1];
    mirrored[mirrorAxis * 4 + 2] = -mirrored[mirrorAxis * 4 + 2];
    Matrix.decompose(scale, rotation, translation, mirrored);
    scale[mirrorAxis] = -scale[mirrorAxis];
} // MatrixUtils.cpp:33

/**
 * Carbon: DeconstructProjectionMatrix (MatrixUtils.cpp:48-63)
 * Aspect ratio, field of view and clip distances of a perspective projection. Carbon's
 * comment derives front = -_43/_33 for a left-handed matrix; the code is _43/_33, which
 * is the near distance for the right-handed projections Carbon builds.
 * Adapted: Carbon writes four `float&` outputs; JS has no float references, so they land
 * in one caller-owned array, out = [asp, fov, frontClip, backClip].
 * @param {Float32Array} out - receives [asp, fov, frontClip, backClip]
 * @param {Float32Array} proj
 * @returns {Float32Array} out
 */
export function deconstructProjectionMatrix(out, proj)
{
    out[0] = proj[0] ? proj[5] / proj[0] : 0.0;
    out[1] = proj[5] ? 2.0 * Math.atan(Math.fround(1.0 / proj[5])) : 0.0;
    out[2] = proj[10] ? proj[14] / proj[10] : 0.0;
    out[3] = out[2] * proj[10] / (proj[10] + 1);
    return out;
} // MatrixUtils.cpp:48

/**
 * Carbon: TriMatrixCopyFrom3x4 (MatrixUtils.h:26-30, two overloads)
 * Both overloads read twelve floats in the same [r][c] order, so the bare name is
 * triMatrixCopyFrom3x4__Float4x3.
 * @param {Float32Array} out
 * @param {Float32Array} input
 * @returns {Float32Array} out
 */
export function triMatrixCopyFrom3x4(out, input)
{
    return triMatrixCopyFrom3x4__Float4x3(out, input);
}

/**
 * Carbon: TriMatrixCopyFrom3x4( Matrix* out, const Float4x3* in ) (MatrixUtils.cpp:98-115)
 * Copies the 3x4 into the first three columns; the fourth column of out is unchanged.
 * @param {Float32Array} out
 * @param {Float32Array} input - Float4x3, Carbon's `in`
 * @returns {Float32Array} out
 */
export function triMatrixCopyFrom3x4__Float4x3(out, input)
{
    out[0] = input[0];
    out[4] = input[1];
    out[8] = input[2];
    out[12] = input[3];
    out[1] = input[4];
    out[5] = input[5];
    out[9] = input[6];
    out[13] = input[7];
    out[2] = input[8];
    out[6] = input[9];
    out[10] = input[10];
    out[14] = input[11];
    return out;
} // MatrixUtils.cpp:98

/**
 * Carbon: TriMatrixCopyFrom3x4( Matrix* out, const granny_matrix_3x4* in ) (MatrixUtils.cpp:66-95, WITH_GRANNY)
 * Indexes (*in)[r][c] exactly as the Float4x3 overload indexes elements[r * 4 + c], so
 * this returns triMatrixCopyFrom3x4__Float4x3's call.
 * @param {Float32Array} out
 * @param {Float32Array} input - twelve floats, [r][c] row-major
 * @returns {Float32Array} out
 */
export function triMatrixCopyFrom3x4__Granny3x4(out, input)
{
    return triMatrixCopyFrom3x4__Float4x3(out, input);
} // MatrixUtils.cpp:66

const scratch = {
    mat4_0: new Float32Array(16)
};
