/**
 * Carbon Sphere — literal port of e:\carbonengine\math\include\Sphere.h / Sphere_inline.h + src\Sphere.cpp
 *
 * Storage: Float32Array(4) = [ centerX, centerY, centerZ, radius ]
 * A default sphere has radius -1 and is "not initialized" (Carbon's sentinel).
 * Matrix arguments are 16-float arrays in Carbon row-major flat order
 * (element _rc at [(r-1)*4+(c-1)], translation at [12..14]).
 *
 * @typedef {Float32Array} sphere
 */

export const sphere = {};

/**
 * Creates a sphere (Carbon default constructor: center 0, radius -1 = uninitialized)  // Sphere_inline.h:9
 * @returns {sphere}
 */
sphere.create = function ()
{
    const out = new Float32Array(4);
    out[3] = -1;
    return out;
};

/**
 * Creates a sphere from center components and radius  // Sphere_inline.h:15
 * @param {Number} cx
 * @param {Number} cy
 * @param {Number} cz
 * @param {Number} radius
 * @returns {sphere}
 */
sphere.fromValues = function (cx, cy, cz, radius)
{
    const out = new Float32Array(4);
    out[0] = cx;
    out[1] = cy;
    out[2] = cz;
    out[3] = radius;
    return out;
};

/**
 * Sets a sphere from a packed Vector4 [x,y,z,w=radius] (Sphere(const Vector4&))  // Sphere_inline.h:21
 * @param {sphere} out
 * @param {Float32Array} packedSphere - vec4
 * @returns {sphere}
 */
sphere.fromVector4 = function (out, packedSphere)
{
    out[0] = packedSphere[0];
    out[1] = packedSphere[1];
    out[2] = packedSphere[2];
    out[3] = packedSphere[3];
    return out;
};

/**
 * Sets a sphere from an axis-aligned box (Sphere(const AxisAlignedBox&))  // Sphere_inline.h:27
 * @param {sphere} out
 * @param {Float32Array} box - axisAlignedBox [minX,minY,minZ,maxX,maxY,maxZ]
 * @returns {sphere}
 */
sphere.fromBox = function (out, box)
{
    const dx = box[3] - box[0],
        dy = box[4] - box[1],
        dz = box[5] - box[2];
    out[0] = (box[0] + box[3]) * 0.5;
    out[1] = (box[1] + box[4]) * 0.5;
    out[2] = (box[2] + box[5]) * 0.5;
    out[3] = Math.sqrt(dx * dx + dy * dy + dz * dz) * 0.5;
    return out;
};

// TransformCoord(v, m) — Carbon row-vector v' = v * M with w-normalization  // Matrix_inline.h:560
function transformCoord(outX3, v0, v1, v2, m)
{
    const norm = m[3] * v0 + m[7] * v1 + m[11] * v2 + m[15];
    if (norm !== 0)
    {
        outX3[0] = (v0 * m[0] + v1 * m[4] + v2 * m[8] + m[12]) / norm;
        outX3[1] = (v0 * m[1] + v1 * m[5] + v2 * m[9] + m[13]) / norm;
        outX3[2] = (v0 * m[2] + v1 * m[6] + v2 * m[10] + m[14]) / norm;
    }
    else
    {
        outX3[0] = 0;
        outX3[1] = 0;
        outX3[2] = 0;
    }
    return outX3;
}

const scratchA = new Float32Array(3);
const scratchB = new Float32Array(3);

/**
 * Sets a sphere from a box transformed by a matrix (Sphere(const AxisAlignedBox&, const Matrix&))  // Sphere.cpp:10
 * Note Carbon transforms only min and max (not all 8 corners) — kept literally.
 * @param {sphere} out
 * @param {Float32Array} box - axisAlignedBox [minX,minY,minZ,maxX,maxY,maxZ]
 * @param {Float32Array} m - 16-float Carbon row-major matrix
 * @returns {sphere}
 */
sphere.fromBoxTransformed = function (out, box, m)
{
    const min = transformCoord(scratchA, box[0], box[1], box[2], m);
    const max = transformCoord(scratchB, box[3], box[4], box[5], m);
    const dx = max[0] - min[0],
        dy = max[1] - min[1],
        dz = max[2] - min[2];
    out[0] = (min[0] + max[0]) * 0.5;
    out[1] = (min[1] + max[1]) * 0.5;
    out[2] = (min[2] + max[2]) * 0.5;
    out[3] = Math.sqrt(dx * dx + dy * dy + dz * dz) * 0.5;
    return out;
};

/**
 * True when the sphere has been given content (radius >= 0)  // Sphere_inline.h:33
 * @param {sphere} s
 * @returns {Boolean}
 */
sphere.isInitialized = function (s)
{
    return s[3] >= 0;
};

/**
 * Exact equality (operator ==)  // Sphere_inline.h:43
 * @param {sphere} a
 * @param {sphere} b
 * @returns {Boolean}
 */
sphere.equals = function (a, b)
{
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
};

/**
 * Exact inequality (operator !=)  // Sphere_inline.h:48
 * @param {sphere} a
 * @param {sphere} b
 * @returns {Boolean}
 */
sphere.notEquals = function (a, b)
{
    return a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2] || a[3] !== b[3];
};

/**
 * Grows the sphere in place to include a point (mutates s, as Carbon mutates the receiver)  // Sphere_inline.h:53
 * @param {sphere} s
 * @param {Float32Array} pos - vec3
 * @returns {sphere}
 */
sphere.includePoint = function (s, pos)
{
    if (!sphere.isInitialized(s))
    {
        s[0] = pos[0];
        s[1] = pos[1];
        s[2] = pos[2];
        s[3] = 0;
        return s;
    }
    if (sphere.isPointInside(s, pos))
    {
        return s;
    }
    const dx = pos[0] - s[0],
        dy = pos[1] - s[1],
        dz = pos[2] - s[2];
    const deltaLen = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const t = 0.5 * (1.0 - s[3] / deltaLen);
    s[0] += t * dx;
    s[1] += t * dy;
    s[2] += t * dz;
    s[3] = 0.5 * (s[3] + deltaLen);
    return s;
};

/**
 * Grows the sphere in place to include another sphere (mutates s)  // Sphere_inline.h:72
 * @param {sphere} s
 * @param {sphere} other
 * @returns {sphere}
 */
sphere.includeSphere = function (s, other)
{
    if (!sphere.isInitialized(other))
    {
        return s;
    }
    if (!sphere.isInitialized(s))
    {
        s[0] = other[0];
        s[1] = other[1];
        s[2] = other[2];
        s[3] = other[3];
        return s;
    }
    // do not update if is inside
    if (sphere.isSphereInside(s, other) || sphere.isSphereInside(other, s))
    {
        return s;
    }

    // extend sphere
    const dx = other[0] - s[0],
        dy = other[1] - s[1],
        dz = other[2] - s[2];
    const deltaLen = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const t = 0.5 * (1.0 + (other[3] - s[3]) / deltaLen);
    s[0] += t * dx;
    s[1] += t * dy;
    s[2] += t * dz;
    s[3] = 0.5 * (s[3] + other[3] + deltaLen);
    return s;
};

/**
 * True when a point is inside the sphere (Carbon radiusEpsilon 1e-4 on the squared compare)  // Sphere_inline.h:107
 * @param {sphere} s
 * @param {Float32Array} pos - vec3
 * @returns {Boolean}
 */
sphere.isPointInside = function (s, pos)
{
    if (!sphere.isInitialized(s))
    {
        return false;
    }
    const radiusEpsilon = 1e-4;
    const dx = pos[0] - s[0],
        dy = pos[1] - s[1],
        dz = pos[2] - s[2];
    return dx * dx + dy * dy + dz * dz <= s[3] * s[3] + radiusEpsilon;
};

/**
 * True when another sphere is entirely inside this one  // Sphere_inline.h:119
 * @param {sphere} s
 * @param {sphere} other
 * @returns {Boolean}
 */
sphere.isSphereInside = function (s, other)
{
    if (!sphere.isInitialized(s) || !sphere.isInitialized(other))
    {
        return false;
    }
    // pre-check radiuses
    if (s[3] < other[3])
    {
        return false;
    }
    const dx = other[0] - s[0],
        dy = other[1] - s[1],
        dz = other[2] - s[2];
    return dx * dx + dy * dy + dz * dz <= (s[3] - other[3]) * (s[3] - other[3]);
};

/**
 * Transforms a sphere by a matrix; radius scales by the largest basis-row scale  // Sphere.cpp:19
 * @param {sphere} out - may alias s
 * @param {sphere} s
 * @param {Float32Array} m - 16-float Carbon row-major matrix
 * @returns {sphere}
 */
sphere.transform = function (out, s, m)
{
    if (!sphere.isInitialized(s))
    {
        if (out !== s)
        {
            out[0] = s[0];
            out[1] = s[1];
            out[2] = s[2];
            out[3] = s[3];
        }
        return out;
    }
    // translate center
    const c = transformCoord(scratchA, s[0], s[1], s[2], m);
    // scale with highest scale factor (GetX/GetY/GetZ basis rows)
    const scaleX = m[0] * m[0] + m[1] * m[1] + m[2] * m[2];
    const scaleY = m[4] * m[4] + m[5] * m[5] + m[6] * m[6];
    const scaleZ = m[8] * m[8] + m[9] * m[9] + m[10] * m[10];
    const scale = Math.sqrt(Math.max(scaleX, Math.max(scaleY, scaleZ)));
    out[0] = c[0];
    out[1] = c[1];
    out[2] = c[2];
    out[3] = s[3] * scale;
    return out;
};
