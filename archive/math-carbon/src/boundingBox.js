// Carbon BoundingBox helpers, ported literally from trinity
// (trinity/trinity/Utilities/BoundingBox.h, BoundingBox.cpp).
// BoundingBox.h is a home for free functions over min/max Vector3 pairs, so this module
// is a camelCase namespace (`boundingBox.boundingBoxUpdate__Pos`). Left out: the Python
// conversions BlueExtractArgumentImpl/BlueWrapReturnValueImpl (BoundingBox.cpp:48-116),
// which are Blue's script binding, not maths.
// DirectXMath vector code is ported per lane: XMVectorMin/Max are SSE minps/maxps
// (`a < b ? a : b`, `a > b ? a : b`), and the unqualified min/max are std::min/std::max
// (trinity/trinity/StdAfx.h:45-46), whose NaN behaviour differs.
// Overloads are split per rule 11; the bare name routes by an exact argument count or
// length, and engine code calls the specific names.

import { Vector3 } from "./vector3.js";
import { Quaternion } from "./quaternion.js";
import { Matrix } from "./matrix.js";
import { AxisAlignedBox } from "./axisAlignedBox.js";
import { triMatrixCopyFrom3x4__Float4x3 } from "./matrixUtils.js";

const f32 = Math.fround;
const FLT_MAX = 3.4028234663852886e38;

/** std::min( a, b ): b when b < a, otherwise a */
const stdMin = (a, b) => (b < a) ? b : a;
/** std::max( a, b ): b when a < b, otherwise a */
const stdMax = (a, b) => (a < b) ? b : a;
/** SSE minps lane: a when a < b, otherwise b */
const xmMin = (a, b) => (a < b) ? a : b;
/** SSE maxps lane: a when a > b, otherwise b */
const xmMax = (a, b) => (a > b) ? a : b;

/**
 * Carbon: BoundingBoxInitialize (BoundingBox.h:17-18)
 * Routes Carbon's two overloads by argument count: 2 to boundingBoxInitialize__MinMax,
 * 3 to boundingBoxInitialize__Sphere.
 */
export function boundingBoxInitialize(a, b, c)
{
    switch (arguments.length)
    {
        case 2: return boundingBoxInitialize__MinMax(a, b);
        case 3: return boundingBoxInitialize__Sphere(a, b, c);
    }
    throw new TypeError(`boundingBoxInitialize: no Carbon overload takes ${arguments.length} arguments.`);
}

/**
 * Carbon: BoundingBoxInitialize( Vector3& min, Vector3& max ) (BoundingBox.cpp:118-127)
 * Sets the empty box: min FLT_MAX, max -FLT_MAX.
 * @param {Float32Array} min - receives FLT_MAX
 * @param {Float32Array} max - receives -FLT_MAX
 */
export function boundingBoxInitialize__MinMax(min, max)
{
    min[0] = FLT_MAX;
    min[1] = FLT_MAX;
    min[2] = FLT_MAX;
    max[0] = -FLT_MAX;
    max[1] = -FLT_MAX;
    max[2] = -FLT_MAX;
} // BoundingBox.cpp:118

/**
 * Carbon: BoundingBoxInitialize( const Vector4& sphere, Vector3& min, Vector3& max ) (BoundingBox.cpp:129-133)
 * The box around a sphere (center xyz, radius w).
 * @param {Float32Array} sphere
 * @param {Float32Array} min - receives the minimum
 * @param {Float32Array} max - receives the maximum
 */
export function boundingBoxInitialize__Sphere(sphere, min, max)
{
    const x = sphere[0], y = sphere[1], z = sphere[2], w = sphere[3];
    min[0] = x - w;
    min[1] = y - w;
    min[2] = z - w;
    max[0] = x + w;
    max[1] = y + w;
    max[2] = z + w;
} // BoundingBox.cpp:129

/**
 * Carbon: BoundingBoxIsInside (BoundingBox.h:20-21)
 * Routes Carbon's two overloads by argument count: 3 to boundingBoxIsInside__Pos,
 * 4 to boundingBoxIsInside__PosEpsilon.
 * @returns {boolean}
 */
export function boundingBoxIsInside(min, max, pos, epsilon)
{
    switch (arguments.length)
    {
        case 3: return boundingBoxIsInside__Pos(min, max, pos);
        case 4: return boundingBoxIsInside__PosEpsilon(min, max, pos, epsilon);
    }
    throw new TypeError(`boundingBoxIsInside: no Carbon overload takes ${arguments.length} arguments.`);
}

/**
 * Carbon: BoundingBoxIsInside( min, max, pos ) (BoundingBox.cpp:135-150)
 * @param {Float32Array} min
 * @param {Float32Array} max
 * @param {Float32Array} pos
 * @returns {boolean} true when pos lies in the box, faces included
 */
export function boundingBoxIsInside__Pos(min, max, pos)
{
    if ((min[0] > pos[0]) || (max[0] < pos[0]))
    {
        return false;
    }
    if ((min[1] > pos[1]) || (max[1] < pos[1]))
    {
        return false;
    }
    if ((min[2] > pos[2]) || (max[2] < pos[2]))
    {
        return false;
    }
    return true;
} // BoundingBox.cpp:135

/**
 * Carbon: BoundingBoxIsInside( min, max, pos, epsilon ) (BoundingBox.cpp:152-167)
 * @param {Float32Array} min
 * @param {Float32Array} max
 * @param {Float32Array} pos
 * @param {number} epsilon - grows the box on every side
 * @returns {boolean}
 */
export function boundingBoxIsInside__PosEpsilon(min, max, pos, epsilon)
{
    if ((min[0] > f32(pos[0] + epsilon)) || (max[0] < f32(pos[0] - epsilon)))
    {
        return false;
    }
    if ((min[1] > f32(pos[1] + epsilon)) || (max[1] < f32(pos[1] - epsilon)))
    {
        return false;
    }
    if ((min[2] > f32(pos[2] + epsilon)) || (max[2] < f32(pos[2] - epsilon)))
    {
        return false;
    }
    return true;
} // BoundingBox.cpp:152

/**
 * Carbon: BoundingBoxUpdate (BoundingBox.h:23-25)
 * Routes Carbon's three overloads: 4 arguments to boundingBoxUpdate__OtherMinOtherMax;
 * 3 by the third argument's exact length, 3 to boundingBoxUpdate__Pos and 4 to
 * boundingBoxUpdate__Sphere; anything else throws.
 */
export function boundingBoxUpdate(min, max, a, b)
{
    if (arguments.length === 4)
    {
        return boundingBoxUpdate__OtherMinOtherMax(min, max, a, b);
    }
    if (arguments.length === 3)
    {
        switch (a.length)
        {
            case 3: return boundingBoxUpdate__Pos(min, max, a);
            case 4: return boundingBoxUpdate__Sphere(min, max, a);
        }
    }
    throw new TypeError("boundingBoxUpdate: no Carbon overload matches these arguments.");
}

/**
 * Carbon: BoundingBoxUpdate( min, max, pos ) (BoundingBox.cpp:175-203)
 * Grows min/max to include pos.
 * @param {Float32Array} min
 * @param {Float32Array} max
 * @param {Float32Array} pos
 */
export function boundingBoxUpdate__Pos(min, max, pos)
{
    for (let i = 0; i < 3; ++i)
    {
        if (pos[i] < min[i])
        {
            min[i] = pos[i];
        }
        if (pos[i] > max[i])
        {
            max[i] = pos[i];
        }
    }
} // BoundingBox.cpp:175

/**
 * Carbon: BoundingBoxUpdate( min, max, otherMin, otherMax ) (BoundingBox.cpp:169-173)
 * @param {Float32Array} min
 * @param {Float32Array} max
 * @param {Float32Array} otherMin
 * @param {Float32Array} otherMax
 */
export function boundingBoxUpdate__OtherMinOtherMax(min, max, otherMin, otherMax)
{
    boundingBoxUpdate__Pos(min, max, otherMin);
    boundingBoxUpdate__Pos(min, max, otherMax);
} // BoundingBox.cpp:169

/**
 * Carbon: BoundingBoxUpdate( min, max, const Vector4& sphere ) (BoundingBox.cpp:205-209)
 * @param {Float32Array} min
 * @param {Float32Array} max
 * @param {Float32Array} sphere
 */
export function boundingBoxUpdate__Sphere(min, max, sphere)
{
    const { vec3_0 } = scratch;
    const x = sphere[0], y = sphere[1], z = sphere[2], w = sphere[3];
    vec3_0[0] = x - w;
    vec3_0[1] = y - w;
    vec3_0[2] = z - w;
    boundingBoxUpdate__Pos(min, max, vec3_0);
    vec3_0[0] = x + w;
    vec3_0[1] = y + w;
    vec3_0[2] = z + w;
    boundingBoxUpdate__Pos(min, max, vec3_0);
} // BoundingBox.cpp:205

/**
 * Carbon: BoundingBoxTransform (BoundingBox.cpp:211-266)
 * Replaces min/max with the box around the eight transformed corners.
 * @param {Float32Array} min
 * @param {Float32Array} max
 * @param {Float32Array} tf
 */
export function boundingBoxTransform(min, max, tf)
{
    const { corners } = scratch;
    const minX = min[0], minY = min[1], minZ = min[2];
    const maxX = max[0], maxY = max[1], maxZ = max[2];
    corners.set([
        minX, minY, minZ,
        minX, minY, maxZ,
        maxX, minY, minZ,
        maxX, minY, maxZ,
        maxX, maxY, maxZ,
        maxX, maxY, minZ,
        minX, maxY, maxZ,
        minX, maxY, minZ
    ]);
    // TransformCoords( corners, tf ), the fixed-array overload; its rule-11 split waits for a
    // ruling, so this calls the archive's strided form
    Matrix.transformCoords(corners, 0, 3, corners, 0, 3, 8, tf);

    min[0] = max[0] = corners[0];
    min[1] = max[1] = corners[1];
    min[2] = max[2] = corners[2];
    for (let i = 1; i < 8; ++i)
    {
        for (let component = 0; component < 3; ++component)
        {
            const value = corners[i * 3 + component];
            if (value < min[component])
            {
                min[component] = value;
            }
            if (value > max[component])
            {
                max[component] = value;
            }
        }
    }
} // BoundingBox.cpp:211

/**
 * Carbon: IntersectAxisAlignedBoxAxisAlignedBox (BoundingBox.cpp:268-280)
 * @param {Float32Array} minBoundsA
 * @param {Float32Array} maxBoundsA
 * @param {Float32Array} minBoundsB
 * @param {Float32Array} maxBoundsB
 * @returns {boolean} false when the boxes are disjoint on any axis
 */
export function intersectAxisAlignedBoxAxisAlignedBox(minBoundsA, maxBoundsA, minBoundsB, maxBoundsB)
{
    for (let i = 0; i < 3; ++i)
    {
        if (minBoundsA[i] > maxBoundsB[i] || minBoundsB[i] > maxBoundsA[i])
        {
            return false;
        }
    }
    return true;
} // BoundingBox.cpp:268

/**
 * Carbon: IntersectAxisAlignedBoxRay (BoundingBox.cpp:294-319)
 * Slab test; intersection receives the entry point rayOrigin + minT * rayDir even on a miss.
 * Carbon quirk, reproduced: for a degenerate box (min == max) the test is
 * `LengthSq( Normalize( min - rayOrigin ) - rayDir ) < 1e10`; both vectors are unit
 * length, so the left side is at most 4 and the point case reports a hit for any ray
 * (only NaN fails).
 * @param {Float32Array} minBounds
 * @param {Float32Array} maxBounds
 * @param {Float32Array} rayOrigin
 * @param {Float32Array} rayDir - normalized
 * @param {Float32Array} intersection - receives the entry point
 * @returns {boolean} true when the ray may intersect the box
 */
export function intersectAxisAlignedBoxRay(minBounds, maxBounds, rayOrigin, rayDir, intersection)
{
    if (Vector3.exactEquals(minBounds, maxBounds))
    {
        const { vec3_0 } = scratch;
        Vector3.subtract(vec3_0, minBounds, rayOrigin);
        Vector3.normalize(vec3_0, vec3_0);
        Vector3.subtract(vec3_0, vec3_0, rayDir);
        Vector3.copy(intersection, minBounds);
        return Vector3.lengthSq(vec3_0) < 1e10;
    }

    const { smaller, bigger } = scratch;
    for (let i = 0; i < 3; ++i)
    {
        const invRayDir = f32(1.0 / rayDir[i]);
        const t0 = f32(f32(minBounds[i] - rayOrigin[i]) * invRayDir);
        const t1 = f32(f32(maxBounds[i] - rayOrigin[i]) * invRayDir);
        smaller[i] = xmMin(t0, t1);
        bigger[i] = xmMax(t0, t1);
    }
    const minT = stdMax(smaller[0], stdMax(smaller[1], smaller[2]));
    const maxT = stdMin(bigger[0], stdMin(bigger[1], bigger[2]));

    const ox = rayOrigin[0], oy = rayOrigin[1], oz = rayOrigin[2];
    const dx = rayDir[0], dy = rayDir[1], dz = rayDir[2];
    intersection[0] = ox + f32(minT * dx);
    intersection[1] = oy + f32(minT * dy);
    intersection[2] = oz + f32(minT * dz);
    return minT < maxT;
} // BoundingBox.cpp:294

/**
 * Carbon: IntersectOrientedBoxAxisAlignedBox (BoundingBox.cpp:321-328)
 * @param {Float32Array} centerA
 * @param {Float32Array} extentsA
 * @param {Float32Array} orientationA - unit quaternion
 * @param {Float32Array} minBounds
 * @param {Float32Array} maxBounds
 * @returns {boolean}
 */
export function intersectOrientedBoxAxisAlignedBox(centerA, extentsA, orientationA, minBounds, maxBounds)
{
    const { centerB, extentsB, orientationB } = scratch;
    for (let i = 0; i < 3; ++i)
    {
        centerB[i] = 0.5 * f32(maxBounds[i] + minBounds[i]);
        extentsB[i] = maxBounds[i] - centerB[i];
    }
    orientationB[0] = 0.0;
    orientationB[1] = 0.0;
    orientationB[2] = 0.0;
    orientationB[3] = 1.0;
    return intersectOrientedBoxOrientedBox(centerA, extentsA, orientationA, centerB, extentsB, orientationB);
} // BoundingBox.cpp:321

/**
 * Carbon: IntersectOrientedBoxOrientedBox (BoundingBox.cpp:330-535)
 * Separating-axis test over the 15 candidate axes, DirectXMath's oriented-box test.
 * Lanes are ported one per float; XMVectorPermute indices 0-3 pick from the first
 * vector, 4-7 from the second. Not ported: the debug asserts that both orientations are
 * unit quaternions (BoundingBox.cpp:343-344), compiled out of release builds.
 * @param {Float32Array} centerA
 * @param {Float32Array} extentsA
 * @param {Float32Array} orientationA - unit quaternion
 * @param {Float32Array} centerB
 * @param {Float32Array} extentsB
 * @param {Float32Array} orientationB - unit quaternion
 * @returns {boolean} true unless a separating axis exists
 */
export function intersectOrientedBoxOrientedBox(centerA, extentsA, orientationA, centerB, extentsB, orientationB)
{
    const s = scratch;

    // Rotation of B relative to A: Q = A * conjugate(B), as XMQuaternionMultiply( A, conj( B ) )
    Quaternion.conjugate(s.quat_0, orientationB);
    Quaternion.multiply(s.quat_0, orientationA, s.quat_0);
    // XMMatrixRotationQuaternion builds the rows RotationMatrix( q ) builds (Matrix_inline.h:365);
    // last-bit rounding may differ
    Matrix.rotationMatrix__Quaternion(s.mat4_0, s.quat_0);

    // t = XMVector3InverseRotate( B - A, A ) = A * (B - A, 0) * conjugate( A )
    s.quat_1[0] = centerB[0] - centerA[0];
    s.quat_1[1] = centerB[1] - centerA[1];
    s.quat_1[2] = centerB[2] - centerA[2];
    s.quat_1[3] = 0.0;
    Quaternion.multiply(s.quat_1, orientationA, s.quat_1);
    Quaternion.conjugate(s.quat_2, orientationA);
    Quaternion.multiply(s.quat_1, s.quat_1, s.quat_2);
    const t = s.t;
    t[0] = s.quat_1[0];
    t[1] = s.quat_1[1];
    t[2] = s.quat_1[2];
    t[3] = 0.0;

    const hA = s.hA, hB = s.hB;
    hA.set(extentsA.subarray(0, 3));
    hA[3] = 0.0;
    hB.set(extentsB.subarray(0, 3));
    hB[3] = 0.0;

    // Rows R0X..R2X and columns RX0..RX2 of R (w lanes are 0), and their absolute values
    const R = s.mat4_0;
    const rows = s.rows, cols = s.cols, absRows = s.absRows, absCols = s.absCols;
    for (let r = 0; r < 3; ++r)
    {
        for (let c = 0; c < 4; ++c)
        {
            rows[r][c] = R[r * 4 + c];
            cols[r][c] = R[c * 4 + r];
        }
        for (let c = 0; c < 4; ++c)
        {
            absRows[r][c] = Math.abs(rows[r][c]);
            absCols[r][c] = Math.abs(cols[r][c]);
        }
    }

    // Carbon ORs all 15 lane results without an early out; the answer is the same
    let noIntersection = false;

    // l = a(u), a(v), a(w)
    for (let i = 0; i < 3; ++i)
    {
        noIntersection = separates(t[i], hA[i], dot3(hB, absRows[i])) || noIntersection;
    }
    // l = b(u), b(v), b(w)
    for (let i = 0; i < 3; ++i)
    {
        noIntersection = separates(dot3(t, cols[i]), dot3(hA, absCols[i]), hB[i]) || noIntersection;
    }
    // l = a(u|v|w) x b(u|v|w)
    for (const [ col, crossPermute, absColPermute, absRow, absRowPermute ] of CROSS_AXES)
    {
        noIntersection = crossAxisSeparates(col, crossPermute, absColPermute, absRow, absRowPermute) || noIntersection;
    }

    // No separating axis found, boxes must intersect.
    return !noIntersection;
} // BoundingBox.cpp:330

/** XMVectorGreater( XMVectorAbs( d ), d_A + d_B ) for one axis */
function separates(d, dA, dB)
{
    return Math.abs(d) > f32(dA + dB);
}

/** One edge-cross axis, BoundingBox.cpp:452-531, reading the rows/columns in scratch */
function crossAxisSeparates(col, crossPermute, absColPermute, absRow, absRowPermute)
{
    const { cols, absCols, absRows, neg, p0, p1, p2, t, hA, hB } = scratch;
    for (let c = 0; c < 4; ++c)
    {
        neg[c] = -cols[col][c];
    }
    permute(p0, cols[col], neg, crossPermute);
    permute(p1, absCols[col], absCols[col], absColPermute);
    permute(p2, absRows[absRow], absRows[absRow], absRowPermute);
    return separates(dot3(t, p0), dot3(hA, p1), dot3(hB, p2));
}

// XMVectorPermute selectors from BoundingBox.cpp:332-337 (XM_PERMUTE_0X = 0 .. XM_PERMUTE_1W = 7)
const PERMUTE_0W1Z0Y0X = [ 3, 6, 1, 0 ];
const PERMUTE_0Z0W1X0Y = [ 2, 3, 4, 1 ];
const PERMUTE_1Y0X0W0Z = [ 5, 0, 3, 2 ];
const PERMUTE_WZYX = [ 3, 2, 1, 0 ];
const PERMUTE_ZWXY = [ 2, 3, 0, 1 ];
const PERMUTE_YXWZ = [ 1, 0, 3, 2 ];

/** The nine a(i) x b(j) axes in Carbon's order: [ column j, cross, |column| and |row i| selectors ] */
const CROSS_AXES = [
    [ 0, PERMUTE_0W1Z0Y0X, PERMUTE_WZYX, 0, PERMUTE_WZYX ],
    [ 1, PERMUTE_0W1Z0Y0X, PERMUTE_WZYX, 0, PERMUTE_ZWXY ],
    [ 2, PERMUTE_0W1Z0Y0X, PERMUTE_WZYX, 0, PERMUTE_YXWZ ],
    [ 0, PERMUTE_0Z0W1X0Y, PERMUTE_ZWXY, 1, PERMUTE_WZYX ],
    [ 1, PERMUTE_0Z0W1X0Y, PERMUTE_ZWXY, 1, PERMUTE_ZWXY ],
    [ 2, PERMUTE_0Z0W1X0Y, PERMUTE_ZWXY, 1, PERMUTE_YXWZ ],
    [ 0, PERMUTE_1Y0X0W0Z, PERMUTE_YXWZ, 2, PERMUTE_WZYX ],
    [ 1, PERMUTE_1Y0X0W0Z, PERMUTE_YXWZ, 2, PERMUTE_ZWXY ],
    [ 2, PERMUTE_1Y0X0W0Z, PERMUTE_YXWZ, 2, PERMUTE_YXWZ ]
];

/** XMVectorPermute( v1, v2, selector ): lane i takes v1[s] for s < 4, else v2[s - 4] */
function permute(out, v1, v2, selector)
{
    for (let i = 0; i < 4; ++i)
    {
        const index = selector[i];
        out[i] = index < 4 ? v1[index] : v2[index - 4];
    }
    return out;
}

/** XMVector3Dot lane: (x * x' + y * y') + z * z' in float */
function dot3(a, b)
{
    return f32(f32(f32(a[0] * b[0]) + f32(a[1] * b[1])) + f32(a[2] * b[2]));
}

/**
 * Carbon: IntersectTriangleOrientedBox (BoundingBox.h:39-44)
 * Routes Carbon's two overloads by argument count: 2 to
 * intersectTriangleOrientedBox__TriangleVertices, 4 to intersectTriangleOrientedBox__V0V1V2.
 * The two are different tests: the first checks only the box faces.
 * @returns {boolean}
 */
export function intersectTriangleOrientedBox(a, b, c, d)
{
    switch (arguments.length)
    {
        case 2: return intersectTriangleOrientedBox__TriangleVertices(a, b);
        case 4: return intersectTriangleOrientedBox__V0V1V2(a, b, c, d);
    }
    throw new TypeError(`intersectTriangleOrientedBox: no Carbon overload takes ${arguments.length} arguments.`);
}

/**
 * Carbon: IntersectTriangleOrientedBox( const Vector3* triangleVertices, invOrientedBox ) (BoundingBox.cpp:537-557)
 * Quick test against the box faces only; can report false positives.
 * @param {Float32Array} triangleVertices - three contiguous Vector3s (9 floats)
 * @param {Float32Array} invOrientedBox - inverse transform of the box (-1, -1, -1) - (1, 1, 1)
 * @returns {boolean}
 */
export function intersectTriangleOrientedBox__TriangleVertices(triangleVertices, invOrientedBox)
{
    const { triangle } = scratch;
    // TransformCoords( v, first, first + 3, tf ), the iterator overload, through the
    // archive's strided form until its rule-11 split is ruled
    Matrix.transformCoords(triangle, 0, 3, triangleVertices, 0, 3, 3, invOrientedBox);
    return !separatedByBoxFace(triangle);
} // BoundingBox.cpp:537

/** BoundingBox.cpp:543-554 / 638-649: all three vertices beyond one face of the unit box */
function separatedByBoxFace(v)
{
    for (let axis = 0; axis < 3; ++axis)
    {
        if ((v[axis] < -1.0) && (v[3 + axis] < -1.0) && (v[6 + axis] < -1.0))
        {
            return true;
        }
        if ((v[axis] > 1.0) && (v[3 + axis] > 1.0) && (v[6 + axis] > 1.0))
        {
            return true;
        }
    }
    return false;
}

/**
 * Carbon: AxisTest (BoundingBox.cpp:602-612, anonymous namespace)
 * @returns {boolean} false if a separating plane was found
 */
function axisTest(a, b, fa, fb, v, i0, i1, axis0, axis1)
{
    let p0 = f32(a * v[i0 * 3 + axis0] + b * v[i0 * 3 + axis1]);
    let p2 = f32(a * v[i1 * 3 + axis0] + b * v[i1 * 3 + axis1]);
    if (p2 < p0)
    {
        const swap = p0;
        p0 = p2;
        p2 = swap;
    }
    const rad = f32(fa + fb);
    return !(p0 > rad || p2 < -rad);
}

/**
 * Carbon: IntersectTriangleOrientedBox( v0, v1, v2, invOrientedBox ) (BoundingBox.cpp:626-734)
 * Full test: box faces, the triangle plane, and the nine edge-by-face-axis planes.
 * @param {Float32Array} v0
 * @param {Float32Array} v1
 * @param {Float32Array} v2
 * @param {Float32Array} invOrientedBox - inverse transform of the box (-1, -1, -1) - (1, 1, 1)
 * @returns {boolean}
 */
export function intersectTriangleOrientedBox__V0V1V2(v0, v1, v2, invOrientedBox)
{
    const { triangle, vec3_0, e0, e1, e2, normal, vmin, vmax } = scratch;
    Matrix.transformCoord(vec3_0, v0, invOrientedBox);
    triangle.set(vec3_0, 0);
    Matrix.transformCoord(vec3_0, v1, invOrientedBox);
    triangle.set(vec3_0, 3);
    Matrix.transformCoord(vec3_0, v2, invOrientedBox);
    triangle.set(vec3_0, 6);
    const v = triangle;

    if (separatedByBoxFace(v))
    {
        return false;
    }

    for (let i = 0; i < 3; ++i)
    {
        e0[i] = v[3 + i] - v[i];
        e1[i] = v[6 + i] - v[3 + i];
        e2[i] = v[i] - v[6 + i];
    }

    // check triangle plane as a separating plane
    Vector3.cross(normal, e0, e1);
    for (let i = 0; i < 3; ++i)
    {
        if (normal[i] > 0)
        {
            vmin[i] = -1 - v[i];
            vmax[i] = 1 - v[i];
        }
        else
        {
            vmin[i] = 1 - v[i];
            vmax[i] = -1 - v[i];
        }
    }
    if (Vector3.dot(vmin, normal) > 0)
    {
        return false;
    }
    if (Vector3.dot(vmax, normal) < 0)
    {
        return false;
    }

    // 9 more separating plane checks for cross products between triangle edges and box sides
    let fex = Math.abs(e0[0]), fey = Math.abs(e0[1]), fez = Math.abs(e0[2]);
    if (!axisTest(e0[2], -e0[1], fez, fey, v, 0, 2, 1, 2)) return false;
    if (!axisTest(-e0[2], e0[0], fez, fex, v, 0, 2, 0, 2)) return false;
    if (!axisTest(e0[1], -e0[0], fey, fex, v, 1, 2, 0, 1)) return false;

    fex = Math.abs(e1[0]);
    fey = Math.abs(e1[1]);
    fez = Math.abs(e1[2]);
    if (!axisTest(e1[2], -e1[1], fez, fey, v, 0, 2, 1, 2)) return false;
    if (!axisTest(-e1[2], e1[0], fez, fex, v, 0, 2, 0, 2)) return false;
    if (!axisTest(e1[1], -e1[0], fey, fex, v, 0, 1, 0, 1)) return false;

    fex = Math.abs(e2[0]);
    fey = Math.abs(e2[1]);
    fez = Math.abs(e2[2]);
    if (!axisTest(e2[2], -e2[1], fez, fey, v, 0, 1, 1, 2)) return false;
    if (!axisTest(-e2[2], e2[0], fez, fex, v, 0, 1, 0, 2)) return false;
    if (!axisTest(e2[1], -e2[0], fey, fex, v, 1, 2, 0, 1)) return false;

    return true;
} // BoundingBox.cpp:626

/**
 * Carbon: IntersectTriangleAABB (BoundingBox.cpp:569-589)
 * Quick pre-test; can report false positives.
 * @param {Float32Array} v0
 * @param {Float32Array} v1
 * @param {Float32Array} v2
 * @param {Float32Array} min
 * @param {Float32Array} max
 * @returns {boolean}
 */
export function intersectTriangleAABB(v0, v1, v2, min, max)
{
    for (let i = 0; i < 3; ++i)
    {
        if ((v0[i] < min[i]) && (v1[i] < min[i]) && (v2[i] < min[i]))
        {
            return false;
        }
        if ((v0[i] > max[i]) && (v1[i] > max[i]) && (v2[i] > max[i]))
        {
            return false;
        }
    }
    return true;
} // BoundingBox.cpp:569

/**
 * Carbon: IsBoundingBoxEmpty (BoundingBox.cpp:736-747)
 * @param {Float32Array} min
 * @param {Float32Array} max
 * @returns {boolean} true when any extent is zero or negative
 */
export function isBoundingBoxEmpty(min, max)
{
    for (let i = 0; i < 3; ++i)
    {
        if (max[i] <= min[i])
        {
            return true;
        }
    }
    return false;
} // BoundingBox.cpp:736

/**
 * Carbon: ClosestPointToBoundingBox (BoundingBox.cpp:748-751)
 * Minimize( Maximize( point, min ), max ).
 * @param {Float32Array} out - may alias point
 * @param {Float32Array} min
 * @param {Float32Array} max
 * @param {Float32Array} point
 * @returns {Float32Array} out
 */
export function closestPointToBoundingBox(out, min, max, point)
{
    Vector3.maximize(out, point, min);
    return Vector3.minimize(out, out, max);
} // BoundingBox.cpp:748

/**
 * Carbon: CreateItemSetBoundingBoxes (BoundingBox.h:53-84)
 * Groups item bounds by bone: skinned items with a bone index go to that bone's box,
 * everything else to staticBounds. boneBounds receives [boneIndex, box] pairs in
 * ascending bone order, as Carbon's std::map yields them.
 * Adapted: Carbon takes an iterator pair; JS takes the iterable itself.
 * @param {Float32Array} staticBounds - AxisAlignedBox, reset then filled
 * @param {Array<[number, Float32Array]>} boneBounds - cleared then filled
 * @param {boolean} skinned
 * @param {Iterable<{GetBounds(): Float32Array, GetBoneIndex(): number}>} items
 */
export function createItemSetBoundingBoxes(staticBounds, boneBounds, skinned, items)
{
    boneBounds.length = 0;
    staticBounds.set(AxisAlignedBox.create());

    const boxes = new Map();
    for (const item of items)
    {
        const itemBounds = item.GetBounds();
        const boneIndex = item.GetBoneIndex();
        if (skinned && boneIndex >= 0)
        {
            const found = boxes.get(boneIndex);
            if (found !== undefined)
            {
                AxisAlignedBox.includeBox(found, itemBounds);
            }
            else
            {
                boxes.set(boneIndex, Float32Array.from(itemBounds));
            }
        }
        else
        {
            // Group together all static items not attached to any bone
            AxisAlignedBox.includeBox(staticBounds, itemBounds);
        }
    }
    for (const boneIndex of Array.from(boxes.keys()).sort((a, b) => a - b))
    {
        boneBounds.push([ boneIndex, boxes.get(boneIndex) ]);
    }
} // BoundingBox.h:53

/**
 * Carbon: GetItemSetAabb (BoundingBox.cpp:753-772)
 * The union of staticBounds and each bone box, transformed by its bone when the bone
 * index is below boneCount and included untransformed otherwise.
 * @param {Float32Array} out - receives the AxisAlignedBox; may alias staticBounds
 * @param {Float32Array} staticBounds
 * @param {Array<[number, Float32Array]>} boneBounds
 * @param {Float32Array} bones - boneCount contiguous Float4x3s (12 floats each)
 * @param {number} boneCount
 * @returns {Float32Array} out
 */
export function getItemSetAabb(out, staticBounds, boneBounds, bones, boneCount)
{
    const { boneTF, bone, boxAabb } = scratch;
    out.set(staticBounds.subarray(0, 6));
    for (const [ boneIndex, box ] of boneBounds)
    {
        if (boneIndex < (boneCount | 0))
        {
            Matrix.identityMatrix(boneTF);
            for (let i = 0; i < 12; ++i)
            {
                bone[i] = bones[boneIndex * 12 + i];
            }
            triMatrixCopyFrom3x4__Float4x3(boneTF, bone);
            boxAabb.set(box.subarray(0, 6));
            AxisAlignedBox.transform(boxAabb, boxAabb, boneTF);
            AxisAlignedBox.includeBox(out, boxAabb);
        }
        else
        {
            AxisAlignedBox.includeBox(out, box);
        }
    }
    return out;
} // BoundingBox.cpp:753

const scratch = {
    vec3_0: new Float32Array(3),
    corners: new Float32Array(24),
    smaller: new Float32Array(3),
    bigger: new Float32Array(3),
    centerB: new Float32Array(3),
    extentsB: new Float32Array(3),
    orientationB: new Float32Array(4),
    quat_0: new Float32Array(4),
    quat_1: new Float32Array(4),
    quat_2: new Float32Array(4),
    mat4_0: new Float32Array(16),
    t: new Float32Array(4),
    hA: new Float32Array(4),
    hB: new Float32Array(4),
    rows: [ new Float32Array(4), new Float32Array(4), new Float32Array(4) ],
    cols: [ new Float32Array(4), new Float32Array(4), new Float32Array(4) ],
    absRows: [ new Float32Array(4), new Float32Array(4), new Float32Array(4) ],
    absCols: [ new Float32Array(4), new Float32Array(4), new Float32Array(4) ],
    neg: new Float32Array(4),
    p0: new Float32Array(4),
    p1: new Float32Array(4),
    p2: new Float32Array(4),
    triangle: new Float32Array(9),
    e0: new Float32Array(3),
    e1: new Float32Array(3),
    e2: new Float32Array(3),
    normal: new Float32Array(3),
    vmin: new Float32Array(3),
    vmax: new Float32Array(3),
    boneTF: new Float32Array(16),
    bone: new Float32Array(12),
    boxAabb: new Float32Array(6)
};
