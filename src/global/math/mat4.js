import * as glMat4 from "gl-matrix/esm/mat4.js";
import {
    cross as crossVec3,
    dot as dotVec3,
    normalize as normalizeVec3,
    squaredLength as squaredLengthVec3,
    subtract as subtractVec3
} from "gl-matrix/esm/vec3.js";
import { pool } from "./pool.js";

const mat4 = { ...glMat4 };

export { mat4 };

/**
 *
 * @param {mat4} m
 * @param {quat} rotation
 * @param {vec3} translation
 * @param {vec3} scaling
 * @returns {mat4} m
 */
mat4.decompose = function (m, rotation, translation, scaling)
{
    let
        scaleX = Math.hypot(m[0], m[1], m[2]),
        scaleY = Math.hypot(m[4], m[5], m[6]),
        scaleZ = Math.hypot(m[8], m[9], m[10]);

    if (mat4.determinant(m) < 0) scaleX = -scaleX;

    translation[0] = m[12];
    translation[1] = m[13];
    translation[2] = m[14];
    scaling[0] = scaleX;
    scaling[1] = scaleY;
    scaling[2] = scaleZ;

    const nonZeroScaleCount = Number(scaleX !== 0) + Number(scaleY !== 0) + Number(scaleZ !== 0);
    if (nonZeroScaleCount > 0)
    {
        const normalized = pool.allocF32(16);
        mat4.copy(normalized, m);

        if (scaleX !== 0)
        {
            normalized[0] /= scaleX;
            normalized[1] /= scaleX;
            normalized[2] /= scaleX;
        }
        if (scaleY !== 0)
        {
            normalized[4] /= scaleY;
            normalized[5] /= scaleY;
            normalized[6] /= scaleY;
        }
        if (scaleZ !== 0)
        {
            normalized[8] /= scaleZ;
            normalized[9] /= scaleZ;
            normalized[10] /= scaleZ;
        }

        if (nonZeroScaleCount >= 2 && scaleX === 0)
        {
            normalized[0] = normalized[5] * normalized[10] - normalized[6] * normalized[9];
            normalized[1] = normalized[6] * normalized[8] - normalized[4] * normalized[10];
            normalized[2] = normalized[4] * normalized[9] - normalized[5] * normalized[8];
        }
        else if (nonZeroScaleCount >= 2 && scaleY === 0)
        {
            normalized[4] = normalized[9] * normalized[2] - normalized[10] * normalized[1];
            normalized[5] = normalized[10] * normalized[0] - normalized[8] * normalized[2];
            normalized[6] = normalized[8] * normalized[1] - normalized[9] * normalized[0];
        }
        else if (nonZeroScaleCount >= 2 && scaleZ === 0)
        {
            normalized[8] = normalized[1] * normalized[6] - normalized[2] * normalized[5];
            normalized[9] = normalized[2] * normalized[4] - normalized[0] * normalized[6];
            normalized[10] = normalized[0] * normalized[5] - normalized[1] * normalized[4];
        }
        else if (nonZeroScaleCount === 1)
        {
            const
                x = normalized.subarray(0, 3),
                y = normalized.subarray(4, 7),
                z = normalized.subarray(8, 11);

            if (scaleX !== 0)
            {
                const helper = Math.abs(x[1]) < 0.9 ? [ 0, 1, 0 ] : [ 0, 0, 1 ];
                normalizeVec3(z, crossVec3(z, x, helper));
                crossVec3(y, z, x);
            }
            else if (scaleY !== 0)
            {
                const helper = Math.abs(y[2]) < 0.9 ? [ 0, 0, 1 ] : [ 1, 0, 0 ];
                normalizeVec3(x, crossVec3(x, y, helper));
                crossVec3(z, x, y);
            }
            else
            {
                const helper = Math.abs(z[1]) < 0.9 ? [ 0, 1, 0 ] : [ 1, 0, 0 ];
                normalizeVec3(x, crossVec3(x, helper, z));
                crossVec3(y, z, x);
            }
        }

        mat4.getRotation(rotation, normalized);
        pool.freeType(normalized);
    }
    else
    {
        rotation[0] = 0;
        rotation[1] = 0;
        rotation[2] = 0;
        rotation[3] = 1;
    }

    return m;
};

/**
 * Allocates a pooled mat4
 * @returns {Float32Array|mat4}
 */
mat4.alloc = function ()
{
    return pool.allocF32(16);
};

/**
 * Unallocates a pooled mat4
 * @param {mat4|Float32Array} a
 */
mat4.unalloc = function (a)
{
    pool.freeType(a);
};

/**
 * Sets a mat4 from a bone joint mat
 * @param {mat4} out
 * @param {Float32Array} jointMat
 * @param {Number} index
 * @return {mat4}
 */
mat4.fromJointMatIndex = function (out, jointMat, index)
{
    if (index >= 0)
    {
        const offset = index * 12;
        out[0] = jointMat[offset];
        out[1] = jointMat[offset + 4];
        out[2] = jointMat[offset + 8];
        out[3] = 0;
        out[4] = jointMat[offset + 1];
        out[5] = jointMat[offset + 5];
        out[6] = jointMat[offset + 9];
        out[7] = 0;
        out[8] = jointMat[offset + 2];
        out[9] = jointMat[offset + 6];
        out[10] = jointMat[offset + 10];
        out[11] = 0;
        out[12] = jointMat[offset + 3];
        out[13] = jointMat[offset + 7];
        out[14] = jointMat[offset + 11];
        out[15] = 1;
        return out;
    }

    return mat4.identity(out);
};

/**
 * arcFromForward
 * @param {mat4} out
 * @param {vec3} v
 * @return {mat4} out
 */
mat4.arcFromForward = function (out, v)
{
    const norm = normalizeVec3(pool.allocF32(3), v);

    mat4.identity(out);

    if (squaredLengthVec3(v) === 0)
    {
        pool.freeType(norm);
        return out;
    }

    if (norm[2] < -0.99999)
    {
        pool.freeType(norm);
        return out;
    }

    if (norm[2] > 0.99999)
    {
        out[5] = -1.0;
        out[10] = -1.0;
        pool.freeType(norm);
        return out;
    }

    const h = (1 + norm[2]) / (norm[0] * norm[0] + norm[1] * norm[1]);

    out[0] = h * norm[1] * norm[1] - norm[2];
    out[1] = -h * norm[0] * norm[1];
    out[2] = norm[0];

    out[4] = out[1];
    out[5] = h * norm[0] * norm[0] - norm[2];
    out[6] = norm[1];

    out[8] = -norm[0];
    out[9] = -norm[1];
    out[10] = -norm[2];

    pool.freeType(norm);
    return out;
};

/**
 * Copies the translation component from one mat4 to another
 * @param {mat4} out
 * @param {mat4} a
 * @returns {mat4} out
 */
mat4.copyTranslation = function (out, a)
{
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    return out;
};

/**
 * Sets a mat4 from a mat4
 * @param {mat4} out
 * @param {mat3} m
 * @returns {mat4} out
 */
mat4.fromMat3 = function (out, m)
{
    out[0] = m[0];
    out[1] = m[1];
    out[2] = m[2];
    out[4] = m[3];
    out[5] = m[4];
    out[6] = m[5];
    out[8] = m[6];
    out[9] = m[7];
    out[10] = m[8];
    out[3] = out[7] = out[11] = out[12] = out[13] = out[14] = 0;
    out[15] = 1;
    return out;
};

// D3D ortho, depth maps to [0..1]
mat4.orthoD3D = function(out, l, r, b, t, n, f)
{
    const
        lr = 1 / (r - l),
        bt = 1 / (t - b),
        nf = 1 / (f - n);

    out[0] = 2 * lr;
    out[4] = 0;
    out[8] = 0;
    out[12] = -(r + l) * lr;
    out[1] = 0;
    out[5] = 2 * bt;
    out[9] = 0;
    out[13] = -(t + b) * bt;
    out[2] = 0;
    out[6] = 0;
    out[10] = nf;
    out[14] = -n * nf;
    out[3] = 0;
    out[7] = 0;
    out[11] = 0;
    out[15] = 1;
    return out;
};

/**
 * Left-handed look-at (D3D-style): +Z forward
 * Column-major (gl-matrix style)
 */
mat4.lookAtD3D = function (out, eye, center, up)
{
    const x = pool.allocF32(3);
    const y = pool.allocF32(3);
    const z = pool.allocF32(3);

    // z = forward = normalize(center - eye)   (LH)
    subtractVec3(z, center, eye);

    if (squaredLengthVec3(z) === 0)
    {
        z[2] = 1;
    }

    normalizeVec3(z, z);

    // x = normalize(cross(up, z))
    crossVec3(x, up, z);

    if (squaredLengthVec3(x) === 0)
    {
        if (Math.abs(z[1]) < 0.999)
        {
            x[0] = z[2];
            x[1] = 0;
            x[2] = -z[0];
        }
        else
        {
            x[0] = 0;
            x[1] = -z[2];
            x[2] = z[1];
        }
    }

    normalizeVec3(x, x);

    // y = cross(z, x)
    crossVec3(y, z, x);

    // View rotation (camera axes in rows)
    out[0] = x[0]; out[1] = y[0]; out[2]  = z[0];  out[3]  = 0;
    out[4] = x[1]; out[5] = y[1]; out[6]  = z[1];  out[7]  = 0;
    out[8] = x[2]; out[9] = y[2]; out[10] = z[2];  out[11] = 0;

    // Translation
    out[12] = -dotVec3(x, eye);
    out[13] = -dotVec3(y, eye);
    out[14] = -dotVec3(z, eye);
    out[15] = 1;

    pool.freeType(x);
    pool.freeType(y);
    pool.freeType(z);

    return out;

    // After calling lookAtD3D(out, eye, center, up):
    // Transform center by out and it should land on +Z axis (x≈0, y≈0, z>0).
    // Transform eye by out and it should land at the origin (0,0,0).
};

/**
 * Builds a rotation-only look-at basis
 * OpenGL / RH convention
 * −Z is forward
 * Does NOT touch translation
 * Copies translation (and row 3) from an existing matrix
 * Safe for column-major, gl-matrix layout
 *
 * @param {mat4} out - result
 * @param {mat4} m - source matrix
 * @param {vec3} eye - Position of the viewer
 * @param {vec3} center - Point the viewer is looking at
 * @param {vec3} up - vec3 pointing up
 * @returns {mat4} out
 */
mat4.setLookRotation = function (out, m, eye, center, up)
{
    const
        x = pool.allocF32(3),
        y = pool.allocF32(3),
        z = pool.allocF32(3),
        u = pool.allocF32(3); // safeUp

    // z axis = eye - center  (camera backward); -z is forward
    subtractVec3(z, eye, center);

    if (squaredLengthVec3(z) === 0)
    {
        // arbitrary (back)
        z[2] = 1;
    }
    normalizeVec3(z, z);

    // Pick a stable up if the provided up is too aligned with z
    normalizeVec3(u, up);

    // if |dot(up, z)| is ~1 then up × z is unstable
    const dz = Math.abs(u[0] * z[0] + u[1] * z[1] + u[2] * z[2]);
    if (dz > 0.9995)
    {
        // choose an alternate up axis that is not parallel to z
        // try Z axis first, then X axis if needed
        u[0] = 0; u[1] = 0; u[2] = 1;
        const dz2 = Math.abs(u[0] * z[0] + u[1] * z[1] + u[2] * z[2]);
        if (dz2 > 0.9995)
        {
            u[0] = 1; u[1] = 0; u[2] = 0;
        }
    }

    // x = up × z
    crossVec3(x, u, z);

    // Still degenerate? (can happen if 'up' was zero-length etc.)
    if (squaredLengthVec3(x) === 0)
    {
        // fall back to a guaranteed-not-parallel up using z's dominant axis
        if (Math.abs(z[1]) < 0.999)
        {
            u[0] = 0; u[1] = 1; u[2] = 0;
        }
        else
        {
            u[0] = 1; u[1] = 0; u[2] = 0;
        }
        crossVec3(x, u, z);
    }

    normalizeVec3(x, x);

    // y = z × x
    crossVec3(y, z, x);

    // write rotation (columns)
    out[0]  = x[0]; out[1]  = x[1]; out[2]  = x[2];
    out[4]  = y[0]; out[5]  = y[1]; out[6]  = y[2];
    out[8]  = z[0]; out[9]  = z[1]; out[10] = z[2];

    // copy the rest
    if (out !== m)
    {
        out[3]  = m[3];
        out[7]  = m[7];
        out[11] = m[11];
        out[12] = m[12];
        out[13] = m[13];
        out[14] = m[14];
        out[15] = m[15];
    }

    pool.freeType(x);
    pool.freeType(y);
    pool.freeType(z);
    pool.freeType(u);

    return out;
};

/**
 * Gets a mat4's maximum column axis scale
 *
 * @param {mat4} a   - source mat4
 * @returns {number} - maximum axis scale
 */
mat4.maxScaleOnAxis = function (a)
{
    let x = a[0] * a[0] + a[1] * a[1] + a[2] * a[2],
        y = a[4] * a[4] + a[5] * a[5] + a[6] * a[6],
        z = a[8] * a[8] + a[9] * a[9] + a[10] * a[10];

    return Math.sqrt(Math.max(x, y, z));
};

/**
 * Sets an OpenGL-style right-handed perspective with NDC depth in [-1, 1]
 * @param {mat4} out        - receiving mat4
 * @param {number} fovY     - Vertical field of view in radians
 * @param {number} aspect   - Aspect ratio. typically viewport width/height
 * @param {number} near     - Near bound of the frustum
 * @param {number} far      - Far bound of the frustum
 * @returns {mat4} out      - receiving mat4
 */
mat4.perspectiveGL = function (out, fovY, aspect, near, far)
{
    let fH = Math.tan(fovY * 0.5) * near;
    let fW = fH * aspect;
    mat4.frustum(out, -fW, fW, -fH, fH, near, far);
    return out;
};

/**
 * Projects a vector from 3d to 2d space, returning normalized screen space value
 * m should be a projection matrix (or a VP or MVP)
 * @author https://github.com/hughsk/from-3d-to-2d/blob/master/index.js
 * @param {vec3} out   - receiving vec3
 * @param {mat4} m     - Projection / View Projection
 * @param {vec3} a     - the point to project
 * @returns {vec3} out - receiving vec3
 */
mat4.projectVec3 = function (out, m, a)
{
    let
        ix = a[0],
        iy = a[1],
        iz = a[2];

    let ox = m[0] * ix + m[4] * iy + m[8] * iz + m[12],
        oy = m[1] * ix + m[5] * iy + m[9] * iz + m[13],
        oz = m[2] * ix + m[6] * iy + m[10] * iz + m[14],
        ow = m[3] * ix + m[7] * iy + m[11] * iz + m[15];

    out[0] = (ox / ow + 1) / 2;
    out[1] = (oy / ow + 1) / 2;
    out[2] = (oz / ow + 1) / 2;
    return out;
};


/**
 * Sets the translation component of a mat4 from a vec3
 * @param {mat4} out
 * @param {vec3} v
 * @returns {mat4} out
 */
mat4.setTranslation = function (out, v)
{
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    return out;
};

/**
 * Sets the translation component of a mat4 from values
 * @param {mat4} out
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {mat4} out
 */
mat4.setTranslationFromValues = function (out, x, y, z)
{
    out[12] = x;
    out[13] = y;
    out[14] = z;
    return out;
};

/**
 * @author three.js authors
 * @param out
 * @param left
 * @param right
 * @param top
 * @param bottom
 * @param near
 * @param far
 * @returns {*}
 */
mat4.makePerspective = function (out, left, right, top, bottom, near, far)
{
    let x = 2 * near / (right - left),
        y = 2 * near / (top - bottom);

    let a = (right + left) / (right - left),
        b = (top + bottom) / (top - bottom),
        c = -(far + near) / (far - near),
        d = -2 * far * near / (far - near);

    out[0] = x;
    out[4] = 0;
    out[8] = a;
    out[12] = 0;

    out[1] = 0;
    out[5] = y;
    out[9] = b;
    out[13] = 0;

    out[2] = 0;
    out[6] = 0;
    out[10] = c;
    out[14] = d;

    out[3] = 0;
    out[7] = 0;
    out[11] = -1;
    out[15] = 0;

    return out;
};

/**
 * @author three.js authors
 * @param out
 * @param left
 * @param right
 * @param top
 * @param bottom
 * @param near
 * @param far
 * @returns {mat4}
 */
mat4.makeOrthographic = function (out, left, right, top, bottom, near, far)
{
    let w = 1.0 / (right - left),
        h = 1.0 / (top - bottom),
        p = 1.0 / (far - near);

    let x = (right + left) * w,
        y = (top + bottom) * h,
        z = (far + near) * p;

    out[0] = 2 * w;
    out[4] = 0;
    out[8] = 0;
    out[12] = -x;

    out[1] = 0;
    out[5] = 2 * h;
    out[9] = 0;
    out[13] = -y;

    out[2] = 0;
    out[6] = 0;
    out[10] = -2 * p;
    out[14] = -z;

    out[3] = 0;
    out[7] = 0;
    out[11] = 0;
    out[15] = 1;

    return out;
};

export const {
    add,
    adjoint,
    clone,
    copy,
    create,
    decompose,
    determinant,
    equals,
    exactEquals,
    frob,
    fromQuat,
    fromQuat2,
    fromRotation,
    fromRotationTranslation,
    fromRotationTranslationScale,
    fromRotationTranslationScaleOrigin,
    fromScaling,
    fromTranslation,
    fromValues,
    fromXRotation,
    fromYRotation,
    fromZRotation,
    frustum,
    getRotation,
    getScaling,
    getTranslation,
    identity,
    invert,
    lookAt,
    mul,
    multiply,
    multiplyScalar,
    multiplyScalarAndAdd,
    ortho,
    orthoNO,
    orthoZO,
    perspective,
    perspectiveFromFieldOfView,
    perspectiveNO,
    perspectiveZO,
    rotate,
    rotateX,
    rotateY,
    rotateZ,
    scale,
    set,
    str,
    sub,
    subtract,
    targetTo,
    translate,
    transpose,
    alloc,
    unalloc,
    fromJointMatIndex,
    arcFromForward,
    copyTranslation,
    fromMat3,
    orthoD3D,
    lookAtD3D,
    setLookRotation,
    maxScaleOnAxis,
    perspectiveGL,
    projectVec3,
    setTranslation,
    setTranslationFromValues,
    makePerspective,
    makeOrthographic
} = mat4;
