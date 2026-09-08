/**
 * Carbon AxisAlignedBox — literal port of e:\carbonengine\math\include\AxisAlignedBox.h /
 * AxisAlignedBox_inline.h + src\AxisAlignedBox.cpp
 *
 * Storage: Float32Array(6) = [ minX, minY, minZ, maxX, maxY, maxZ ]
 * A default box is [ FLT_MAX,FLT_MAX,FLT_MAX, -FLT_MAX,-FLT_MAX,-FLT_MAX ] and is "not initialized".
 * Matrix arguments are 16-float arrays in Carbon row-major flat order
 * (element _rc at [(r-1)*4+(c-1)], translation at [12..14]).
 *
 * @typedef {Float32Array} axisAlignedBox
 */

export const axisAlignedBox = {};

const FLT_MAX = 3.4028234663852886e38;

/**
 * Creates a box (Carbon default constructor: min FLT_MAX, max -FLT_MAX = uninitialized)  // AxisAlignedBox_inline.h:12
 * @returns {axisAlignedBox}
 */
axisAlignedBox.create = function ()
{
    const out = new Float32Array(6);
    out[0] = FLT_MAX;
    out[1] = FLT_MAX;
    out[2] = FLT_MAX;
    out[3] = -FLT_MAX;
    out[4] = -FLT_MAX;
    out[5] = -FLT_MAX;
    return out;
};

/**
 * Creates a box from min and max vec3s (AxisAlignedBox(min, max))  // AxisAlignedBox_inline.h:18
 * @param {Float32Array} min - vec3
 * @param {Float32Array} max - vec3
 * @returns {axisAlignedBox}
 */
axisAlignedBox.fromMinMax = function (min, max)
{
    const out = new Float32Array(6);
    out[0] = min[0];
    out[1] = min[1];
    out[2] = min[2];
    out[3] = max[0];
    out[4] = max[1];
    out[5] = max[2];
    return out;
};

/**
 * Sets a box from a packed sphere Vector4 [x,y,z,w=radius] (AxisAlignedBox(const Vector4&))  // AxisAlignedBox_inline.h:24
 * @param {axisAlignedBox} out
 * @param {Float32Array} packedSphere - vec4
 * @returns {axisAlignedBox}
 */
axisAlignedBox.fromVector4Sphere = function (out, packedSphere)
{
    out[0] = packedSphere[0] - packedSphere[3];
    out[1] = packedSphere[1] - packedSphere[3];
    out[2] = packedSphere[2] - packedSphere[3];
    out[3] = packedSphere[0] + packedSphere[3];
    out[4] = packedSphere[1] + packedSphere[3];
    out[5] = packedSphere[2] + packedSphere[3];
    return out;
};

/**
 * Sets a box from a sphere (AxisAlignedBox(const Sphere&))  // AxisAlignedBox_inline.h:30
 * @param {axisAlignedBox} out
 * @param {Float32Array} s - sphere [cx,cy,cz,radius]
 * @returns {axisAlignedBox}
 */
axisAlignedBox.fromSphere = function (out, s)
{
    out[0] = s[0] - s[3];
    out[1] = s[1] - s[3];
    out[2] = s[2] - s[3];
    out[3] = s[0] + s[3];
    out[4] = s[1] + s[3];
    out[5] = s[2] + s[3];
    return out;
};

/**
 * Sets a box from an axis-aligned ellipsoid (AxisAlignedBox(const AxisAlignedEllipsoid&))  // AxisAlignedBox_inline.h:37
 * @param {axisAlignedBox} out
 * @param {Float32Array} e - axisAlignedEllipsoid [radiiX,radiiY,radiiZ,centerX,centerY,centerZ]
 * @returns {axisAlignedBox}
 */
axisAlignedBox.fromEllipsoid = function (out, e)
{
    out[0] = e[3] - e[0];
    out[1] = e[4] - e[1];
    out[2] = e[5] - e[2];
    out[3] = e[3] + e[0];
    out[4] = e[4] + e[1];
    out[5] = e[5] + e[2];
    return out;
};

/**
 * True when the box differs from the default (uninitialized) box  // AxisAlignedBox_inline.h:43
 * @param {axisAlignedBox} box
 * @returns {Boolean}
 */
axisAlignedBox.isInitialized = function (box)
{
    return box[0] !== FLT_MAX || box[1] !== FLT_MAX || box[2] !== FLT_MAX ||
        box[3] !== -FLT_MAX || box[4] !== -FLT_MAX || box[5] !== -FLT_MAX;
};

/**
 * Exact equality (operator ==)  // AxisAlignedBox_inline.h:53
 * @param {axisAlignedBox} a
 * @param {axisAlignedBox} b
 * @returns {Boolean}
 */
axisAlignedBox.equals = function (a, b)
{
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] &&
        a[3] === b[3] && a[4] === b[4] && a[5] === b[5];
};

/**
 * Exact inequality (operator !=)  // AxisAlignedBox_inline.h:58
 * @param {axisAlignedBox} a
 * @param {axisAlignedBox} b
 * @returns {Boolean}
 */
axisAlignedBox.notEquals = function (a, b)
{
    return a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2] ||
        a[3] !== b[3] || a[4] !== b[4] || a[5] !== b[5];
};

/**
 * Writes the box size (max - min) into a vec3  // AxisAlignedBox_inline.h:63
 * @param {Float32Array} outVec3
 * @param {axisAlignedBox} box
 * @returns {Float32Array}
 */
axisAlignedBox.getSize = function (outVec3, box)
{
    outVec3[0] = box[3] - box[0];
    outVec3[1] = box[4] - box[1];
    outVec3[2] = box[5] - box[2];
    return outVec3;
};

/**
 * Writes the box center into a vec3  // AxisAlignedBox_inline.h:68
 * @param {Float32Array} outVec3
 * @param {axisAlignedBox} box
 * @returns {Float32Array}
 */
axisAlignedBox.getCenter = function (outVec3, box)
{
    outVec3[0] = (box[0] + box[3]) * 0.5;
    outVec3[1] = (box[1] + box[4]) * 0.5;
    outVec3[2] = (box[2] + box[5]) * 0.5;
    return outVec3;
};

/**
 * Grows the box in place to include a point (mutates box, as Carbon mutates the receiver)  // AxisAlignedBox_inline.h:73
 * @param {axisAlignedBox} box
 * @param {Float32Array} pos - vec3
 * @returns {axisAlignedBox}
 */
axisAlignedBox.includePoint = function (box, pos)
{
    box[0] = Math.min(box[0], pos[0]);
    box[1] = Math.min(box[1], pos[1]);
    box[2] = Math.min(box[2], pos[2]);
    box[3] = Math.max(box[3], pos[0]);
    box[4] = Math.max(box[4], pos[1]);
    box[5] = Math.max(box[5], pos[2]);
    return box;
};

/**
 * Grows the box in place to include another box (mutates box)  // AxisAlignedBox_inline.h:79
 * @param {axisAlignedBox} box
 * @param {axisAlignedBox} other
 * @returns {axisAlignedBox}
 */
axisAlignedBox.includeBox = function (box, other)
{
    box[0] = Math.min(box[0], other[0]);
    box[1] = Math.min(box[1], other[1]);
    box[2] = Math.min(box[2], other[2]);
    box[3] = Math.max(box[3], other[0]);
    box[4] = Math.max(box[4], other[1]);
    box[5] = Math.max(box[5], other[2]);
    // IncludePoint(other.m_max)
    box[0] = Math.min(box[0], other[3]);
    box[1] = Math.min(box[1], other[4]);
    box[2] = Math.min(box[2], other[5]);
    box[3] = Math.max(box[3], other[3]);
    box[4] = Math.max(box[4], other[4]);
    box[5] = Math.max(box[5], other[5]);
    return box;
};

const scratchBox = new Float32Array(6);

/**
 * Grows the box in place to include a sphere (mutates box)  // AxisAlignedBox_inline.h:85
 * @param {axisAlignedBox} box
 * @param {Float32Array} s - sphere [cx,cy,cz,radius]
 * @returns {axisAlignedBox}
 */
axisAlignedBox.includeSphere = function (box, s)
{
    return axisAlignedBox.includeBox(box, axisAlignedBox.fromSphere(scratchBox, s));
};

/**
 * True when a point is inside the box (inclusive bounds)  // AxisAlignedBox_inline.h:105
 * @param {axisAlignedBox} box
 * @param {Float32Array} pos - vec3
 * @returns {Boolean}
 */
axisAlignedBox.isPointInside = function (box, pos)
{
    if (box[0] > pos[0] || box[3] < pos[0])
    {
        return false;
    }
    if (box[1] > pos[1] || box[4] < pos[1])
    {
        return false;
    }
    if (box[2] > pos[2] || box[5] < pos[2])
    {
        return false;
    }
    return true;
};

/**
 * Box-box intersection test, ported literally  // AxisAlignedBox_inline.h:122
 * NOTE: Carbon's expression is `!( m_max > other.m_min || ... || m_min < other.m_max ... )`,
 * which returns FALSE for ordinary overlapping boxes (comparisons appear inverted upstream).
 * The branch structure is preserved exactly; see also Intersection() at inline.h:184 which
 * consumes this literally.
 * @param {axisAlignedBox} a
 * @param {axisAlignedBox} b
 * @returns {Boolean}
 */
axisAlignedBox.intersectsBox = function (a, b)
{
    return !(a[3] > b[0] || a[4] > b[1] || a[5] > b[2] ||
        a[0] < b[3] || a[1] < b[4] || a[2] < b[5]);
};

/**
 * Offsets the box in place by a vector (mutates box)  // AxisAlignedBox_inline.h:128
 * @param {axisAlignedBox} box
 * @param {Float32Array} by - vec3
 * @returns {axisAlignedBox}
 */
axisAlignedBox.offset = function (box, by)
{
    box[0] += by[0];
    box[1] += by[1];
    box[2] += by[2];
    box[3] += by[0];
    box[4] += by[1];
    box[5] += by[2];
    return box;
};

/**
 * Grows the box in place by a vector on each side; no-op when uninitialized (mutates box)  // AxisAlignedBox_inline.h:134
 * @param {axisAlignedBox} box
 * @param {Float32Array} by - vec3
 * @returns {axisAlignedBox}
 */
axisAlignedBox.growVector = function (box, by)
{
    if (!axisAlignedBox.isInitialized(box))
    {
        return box;
    }
    box[0] -= by[0];
    box[1] -= by[1];
    box[2] -= by[2];
    box[3] += by[0];
    box[4] += by[1];
    box[5] += by[2];
    return box;
};

/**
 * Grows the box in place by a scalar on each side; no-op when uninitialized (mutates box)  // AxisAlignedBox_inline.h:144
 * @param {axisAlignedBox} box
 * @param {Number} by
 * @returns {axisAlignedBox}
 */
axisAlignedBox.growScalar = function (box, by)
{
    if (!axisAlignedBox.isInitialized(box))
    {
        return box;
    }
    box[0] -= by;
    box[1] -= by;
    box[2] -= by;
    box[3] += by;
    box[4] += by;
    box[5] += by;
    return box;
};

/**
 * Scales min and max in place by a scalar; no-op when uninitialized (mutates box)  // AxisAlignedBox_inline.h:154
 * @param {axisAlignedBox} box
 * @param {Number} scale
 * @returns {axisAlignedBox}
 */
axisAlignedBox.scale = function (box, scale)
{
    if (!axisAlignedBox.isInitialized(box))
    {
        return box;
    }
    box[0] *= scale;
    box[1] *= scale;
    box[2] *= scale;
    box[3] *= scale;
    box[4] *= scale;
    box[5] *= scale;
    return box;
};

/**
 * Writes the 8 box corners in Carbon's EnumerateVertices order into a flat Float32Array(24)  // AxisAlignedBox_inline.h:164
 * Order: (min,min,min) (min,min,max) (min,max,min) (min,max,max)
 *        (max,min,min) (max,min,max) (max,max,min) (max,max,max)
 * @param {Float32Array} outFlat24
 * @param {axisAlignedBox} box
 * @returns {Float32Array}
 */
axisAlignedBox.getVertices = function (outFlat24, box)
{
    let o = 0;
    for (let ix = 0; ix < 2; ++ix)
    {
        for (let iy = 0; iy < 2; ++iy)
        {
            for (let iz = 0; iz < 2; ++iz)
            {
                outFlat24[o++] = box[ix * 3];
                outFlat24[o++] = box[1 + iy * 3];
                outFlat24[o++] = box[2 + iz * 3];
            }
        }
    }
    return outFlat24;
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

const scratchCorners = new Float32Array(24);
const scratchPos = new Float32Array(3);

/**
 * Transforms the box by a matrix and re-bounds the 8 transformed corners  // AxisAlignedBox.cpp:9
 * (also covers the free function Transform(aabb, m) at AxisAlignedBox_inline.h:177)
 * No-op copy when uninitialized. `out` may alias `box`.
 * @param {axisAlignedBox} out
 * @param {axisAlignedBox} box
 * @param {Float32Array} m - 16-float Carbon row-major matrix
 * @returns {axisAlignedBox}
 */
axisAlignedBox.transform = function (out, box, m)
{
    if (!axisAlignedBox.isInitialized(box))
    {
        if (out !== box)
        {
            for (let i = 0; i < 6; ++i) out[i] = box[i];
        }
        return out;
    }
    let minX = FLT_MAX, minY = FLT_MAX, minZ = FLT_MAX;
    let maxX = -FLT_MAX, maxY = -FLT_MAX, maxZ = -FLT_MAX;

    const corners = axisAlignedBox.getVertices(scratchCorners, box);
    for (let i = 0; i < 8; ++i)
    {
        const pos = transformCoord(scratchPos, corners[i * 3], corners[i * 3 + 1], corners[i * 3 + 2], m);
        if (pos[0] < minX) minX = pos[0];
        if (pos[0] > maxX) maxX = pos[0];
        if (pos[1] < minY) minY = pos[1];
        if (pos[1] > maxY) maxY = pos[1];
        if (pos[2] < minZ) minZ = pos[2];
        if (pos[2] > maxZ) maxZ = pos[2];
    }
    out[0] = minX;
    out[1] = minY;
    out[2] = minZ;
    out[3] = maxX;
    out[4] = maxY;
    out[5] = maxZ;
    return out;
};

// Normalize(Vector3) with Carbon's overflow guard  // Vector3_inline.h:181
function normalize3(outX3, x, y, z)
{
    const max = Math.max(Math.max(Math.abs(x), Math.abs(y)), Math.abs(z));
    const inv = 1 / (max ? max : 1);
    const mx = x * inv, my = y * inv, mz = z * inv;
    let length = Math.sqrt(mx * mx + my * my + mz * mz);
    if (length)
    {
        length = 1 / length;
    }
    outX3[0] = mx * length;
    outX3[1] = my * length;
    outX3[2] = mz * length;
    return outX3;
}

/**
 * Box-ray intersection (slab test); writes the entry point to outIntersection and returns hit  // AxisAlignedBox.cpp:36
 * Ported literally: uninitialized box returns false without writing outIntersection;
 * a degenerate point box writes m_min and compares the normalized direction with
 * Carbon's `< 1e10` threshold; the slab path scales by the scalar 1/Length(direction)
 * exactly as Carbon does.
 * @param {Float32Array} outIntersection - vec3
 * @param {axisAlignedBox} box
 * @param {Float32Array} ray - [originX,originY,originZ,directionX,directionY,directionZ]
 * @returns {Boolean}
 */
axisAlignedBox.intersectsRay = function (outIntersection, box, ray)
{
    if (!axisAlignedBox.isInitialized(box))
    {
        return false;
    }
    if (box[0] === box[3] && box[1] === box[4] && box[2] === box[5])
    {
        // we are actually dealing with a point but not a box
        outIntersection[0] = box[0];
        outIntersection[1] = box[1];
        outIntersection[2] = box[2];
        const n = normalize3(scratchPos, box[0] - ray[0], box[1] - ray[1], box[2] - ray[2]);
        const dx = n[0] - ray[3],
            dy = n[1] - ray[4],
            dz = n[2] - ray[5];
        return dx * dx + dy * dy + dz * dz < 1e10;
    }

    const rd = 1.0 / Math.sqrt(ray[3] * ray[3] + ray[4] * ray[4] + ray[5] * ray[5]);
    const t0x = (box[0] - ray[0]) * rd,
        t0y = (box[1] - ray[1]) * rd,
        t0z = (box[2] - ray[2]) * rd;
    const t1x = (box[3] - ray[0]) * rd,
        t1y = (box[4] - ray[1]) * rd,
        t1z = (box[5] - ray[2]) * rd;

    const sx = Math.min(t0x, t1x),
        sy = Math.min(t0y, t1y),
        sz = Math.min(t0z, t1z);
    const bx = Math.max(t0x, t1x),
        by = Math.max(t0y, t1y),
        bz = Math.max(t0z, t1z);

    const minT = Math.max(sx, Math.max(sy, sz));
    const maxT = Math.min(bx, Math.min(by, bz));

    outIntersection[0] = ray[0] + minT * ray[3];
    outIntersection[1] = ray[1] + minT * ray[4];
    outIntersection[2] = ray[2] + minT * ray[5];
    return minT < maxT;
};

/**
 * Intersection of two boxes; returns the default (uninitialized) box when intersectsBox says no  // AxisAlignedBox_inline.h:184
 * NOTE: consumes the literally-ported intersectsBox above, so it inherits Carbon's inverted compare.
 * @param {axisAlignedBox} out
 * @param {axisAlignedBox} a
 * @param {axisAlignedBox} b
 * @returns {axisAlignedBox}
 */
axisAlignedBox.intersection = function (out, a, b)
{
    if (!axisAlignedBox.intersectsBox(a, b))
    {
        out[0] = FLT_MAX;
        out[1] = FLT_MAX;
        out[2] = FLT_MAX;
        out[3] = -FLT_MAX;
        out[4] = -FLT_MAX;
        out[5] = -FLT_MAX;
        return out;
    }
    const minX = Math.max(a[0], b[0]),
        minY = Math.max(a[1], b[1]),
        minZ = Math.max(a[2], b[2]);
    const maxX = Math.min(a[3], b[3]),
        maxY = Math.min(a[4], b[4]),
        maxZ = Math.min(a[5], b[5]);
    out[0] = minX;
    out[1] = minY;
    out[2] = minZ;
    out[3] = maxX;
    out[4] = maxY;
    out[5] = maxZ;
    return out;
};
