// Carbon BoundingSphere helpers, ported literally from trinity
// (trinity/trinity/Utilities/BoundingSphere.h, BoundingSphere.cpp).
// BoundingSphere.h is a home for free functions over Vector4 spheres (center xyz,
// radius w), so this module is a camelCase namespace. Carbon's argument order is kept,
// including the output sphere after the inputs (`boundingSphereUpdate__Pos( pos, sphere )`).
// Vector3d/Vector4d are Float64Array; points are arrays of Vector3 (Carbon's
// `Vector3 const**`).
// Overloads are split per rule 11; the bare name routes by an exact argument count,
// length or array type, and engine code calls the specific names.

import { Vector3 } from "./vector3.js";
import { Matrix } from "./matrix.js";
import { triVectorIsIdentical } from "./triMath.js";

const f32 = Math.fround;

/**
 * Carbon: BoundingSphereGetCenter (BoundingSphere.h:8-11)
 * Carbon returns a reference to the sphere's first three floats; this returns that view.
 * @param {Float32Array} sphere
 * @returns {Float32Array} a view of sphere[0..2]
 */
export function boundingSphereGetCenter(sphere)
{
    return sphere.subarray(0, 3);
} // BoundingSphere.h:8

/**
 * Carbon: BoundingSphereInitialize (BoundingSphere.cpp:8-11)
 * @param {Float32Array} sphere - receives (0, 0, 0, 0)
 */
export function boundingSphereInitialize(sphere)
{
    sphere[0] = 0.0;
    sphere[1] = 0.0;
    sphere[2] = 0.0;
    sphere[3] = 0.0;
} // BoundingSphere.cpp:8

/**
 * Carbon: BoundingSphereIsInside (BoundingSphere.cpp:13-19)
 * @param {Float32Array} sphere
 * @param {Float32Array} pos
 * @returns {boolean} |pos - center|^2 <= r^2 + 1e-4
 */
export function boundingSphereIsInside(sphere, pos)
{
    const radiusEpsilon = f32(1e-4);
    const dx = f32(pos[0] - sphere[0]), dy = f32(pos[1] - sphere[1]), dz = f32(pos[2] - sphere[2]);
    return f32(dx * dx + dy * dy + dz * dz) <= f32(f32(sphere[3] * sphere[3]) + radiusEpsilon);
} // BoundingSphere.cpp:13

/**
 * Carbon: BoundingSphereIsSphereInside (BoundingSphere.cpp:21-30)
 * @param {Float32Array} parentSphere
 * @param {Float32Array} testSphere
 * @returns {boolean}
 */
export function boundingSphereIsSphereInside(parentSphere, testSphere)
{
    if (parentSphere[3] < testSphere[3])
    {
        return false;
    }
    const dx = f32(testSphere[0] - parentSphere[0]), dy = f32(testSphere[1] - parentSphere[1]), dz = f32(testSphere[2] - parentSphere[2]);
    const dr = f32(parentSphere[3] - testSphere[3]);
    return f32(dx * dx + dy * dy + dz * dz) <= f32(dr * dr);
} // BoundingSphere.cpp:21

/**
 * Carbon: BoundingSphereUpdate (BoundingSphere.h:16-17)
 * Routes Carbon's two overloads by the first argument's exact length: 3 to
 * boundingSphereUpdate__Pos, 4 to boundingSphereUpdate__AddSphere; any other throws.
 * @param {Float32Array} a - pos, or addSphere
 * @param {Float32Array} sphere - updated in place
 */
export function boundingSphereUpdate(a, sphere)
{
    switch (a.length)
    {
        case 3: return boundingSphereUpdate__Pos(a, sphere);
        case 4: return boundingSphereUpdate__AddSphere(a, sphere);
    }
    throw new TypeError(`boundingSphereUpdate: no Carbon overload takes a ${a.length}-component first argument.`);
}

/**
 * Carbon: BoundingSphereUpdate( const Vector3& pos, Vector4& sphere ) (BoundingSphere.cpp:32-45)
 * Grows the sphere just enough to include pos.
 * @param {Float32Array} pos
 * @param {Float32Array} sphere - updated in place
 */
export function boundingSphereUpdate__Pos(pos, sphere)
{
    if (boundingSphereIsInside(sphere, pos))
    {
        return;
    }
    const { vec3_0 } = scratch;
    Vector3.subtract(vec3_0, pos, sphere);
    const deltaLen = f32(Vector3.length(vec3_0));
    const k = f32(0.5 * f32(1.0 - f32(sphere[3] / deltaLen)));
    sphere[0] += f32(k * vec3_0[0]);
    sphere[1] += f32(k * vec3_0[1]);
    sphere[2] += f32(k * vec3_0[2]);
    sphere[3] = 0.5 * f32(sphere[3] + deltaLen);
} // BoundingSphere.cpp:32

/**
 * Carbon: BoundingSphereUpdate( const Vector4& addSphere, Vector4& resultSphere ) (BoundingSphere.cpp:47-66)
 * @param {Float32Array} addSphere
 * @param {Float32Array} resultSphere - updated in place
 */
export function boundingSphereUpdate__AddSphere(addSphere, resultSphere)
{
    if (boundingSphereIsSphereInside(resultSphere, addSphere))
    {
        return;
    }
    if (boundingSphereIsSphereInside(addSphere, resultSphere))
    {
        resultSphere.set(addSphere.subarray(0, 4));
        return;
    }
    const { vec3_0 } = scratch;
    Vector3.subtract(vec3_0, addSphere, resultSphere);
    const deltaLen = f32(Vector3.length(vec3_0));
    const k = f32(0.5 * f32(1.0 + f32(f32(addSphere[3] - resultSphere[3]) / deltaLen)));
    resultSphere[0] += f32(k * vec3_0[0]);
    resultSphere[1] += f32(k * vec3_0[1]);
    resultSphere[2] += f32(k * vec3_0[2]);
    resultSphere[3] = 0.5 * f32(f32(resultSphere[3] + addSphere[3]) + deltaLen);
} // BoundingSphere.cpp:47

/**
 * Carbon: BoundingSphereSetOrUpdate (BoundingSphere.h:29-39)
 * @param {Float32Array} addSphere
 * @param {Float32Array} resultSphere
 * @param {boolean} update
 */
export function boundingSphereSetOrUpdate(addSphere, resultSphere, update)
{
    if (update)
    {
        boundingSphereUpdate__AddSphere(addSphere, resultSphere);
    }
    else
    {
        resultSphere.set(addSphere.subarray(0, 4));
    }
} // BoundingSphere.h:29

/**
 * Carbon: BoundingSphereTransform (BoundingSphere.cpp:68-79)
 * Transforms the center and scales the radius by the largest basis-row length.
 * @param {Float32Array} tf
 * @param {Float32Array} sphere - updated in place
 */
export function boundingSphereTransform(tf, sphere)
{
    const { vec3_0 } = scratch;
    vec3_0[0] = sphere[0];
    vec3_0[1] = sphere[1];
    vec3_0[2] = sphere[2];
    Matrix.transformCoord(vec3_0, vec3_0, tf);
    sphere[0] = vec3_0[0];
    sphere[1] = vec3_0[1];
    sphere[2] = vec3_0[2];
    const scaleX = f32(Vector3.length(Matrix.viewX(tf)));
    const scaleY = f32(Vector3.length(Matrix.viewY(tf)));
    const scaleZ = f32(Vector3.length(Matrix.viewZ(tf)));
    // std::max( a, b ) is (a < b) ? b : a
    const yz = (scaleY < scaleZ) ? scaleZ : scaleY;
    const scale = (scaleX < yz) ? yz : scaleX;
    sphere[3] *= scale;
} // BoundingSphere.cpp:68

/**
 * Carbon: BoundingSphereTranslate (BoundingSphere.cpp:81-85)
 * @param {Float32Array} offset
 * @param {Float32Array} sphere - updated in place
 */
export function boundingSphereTranslate(offset, sphere)
{
    sphere[0] += offset[0];
    sphere[1] += offset[1];
    sphere[2] += offset[2];
} // BoundingSphere.cpp:81

/**
 * Carbon: IntersectSphereAxisAlignedBox (BoundingSphere.cpp:87-115)
 * @param {Float32Array} sphere
 * @param {Float32Array} minBounds
 * @param {Float32Array} maxBounds
 * @returns {boolean} true when the squared distance to the box is at most r^2
 */
export function intersectSphereAxisAlignedBox(sphere, minBounds, maxBounds)
{
    let d2 = 0.0;
    for (let i = 0; i < 3; ++i)
    {
        let d = 0.0;
        if (sphere[i] < minBounds[i])
        {
            d = f32(sphere[i] - minBounds[i]);
        }
        if (sphere[i] > maxBounds[i])
        {
            d = f32(sphere[i] - maxBounds[i]);
        }
        // XMVector3Dot sums (x * x + y * y) + z * z in float
        d2 = f32(d2 + f32(d * d));
    }
    return d2 <= f32(sphere[3] * sphere[3]);
} // BoundingSphere.cpp:87

/**
 * Carbon: IntersectEllipsoidRay (BoundingSphere.h:23-24)
 * Routes Carbon's two overloads by argument count: 5 to intersectEllipsoidRay__Out,
 * 6 to intersectEllipsoidRay__T.
 * @returns {boolean}
 */
export function intersectEllipsoidRay(out, a, b, c, d, e)
{
    switch (arguments.length)
    {
        case 5: return intersectEllipsoidRay__Out(out, a, b, c, d);
        case 6: return intersectEllipsoidRay__T(out, a, b, c, d, e);
    }
    throw new TypeError(`intersectEllipsoidRay: no Carbon overload takes ${arguments.length} arguments.`);
}

/**
 * Carbon: IntersectEllipsoidRay( Vector3& out, center, radii, rayOrigin, rayDir ) (BoundingSphere.cpp:117-121)
 * Forwards to intersectEllipsoidRay__T with a discarded t, as Carbon does.
 * @param {Float32Array} out - receives the hit point
 * @param {Float32Array} ellipsoidCenter
 * @param {Float32Array} ellipsoidRadii
 * @param {Float32Array} rayOrigin
 * @param {Float32Array} rayDir
 * @returns {boolean}
 */
export function intersectEllipsoidRay__Out(out, ellipsoidCenter, ellipsoidRadii, rayOrigin, rayDir)
{
    return intersectEllipsoidRay__T(out, scratch.t, ellipsoidCenter, ellipsoidRadii, rayOrigin, rayDir);
} // BoundingSphere.cpp:117

/**
 * Carbon: IntersectEllipsoidRay( Vector3& out, float& t, center, radii, rayOrigin, rayDir ) (BoundingSphere.cpp:123-145)
 * The nearer non-negative ray parameter, else the farther one.
 * Adapted: Carbon's `float& t` output is a caller-owned one-float array, since JS has no
 * float references and the return value is already the hit flag.
 * @param {Float32Array} out - receives the hit point
 * @param {Float32Array} t - receives t in t[0]
 * @param {Float32Array} ellipsoidCenter
 * @param {Float32Array} ellipsoidRadii
 * @param {Float32Array} rayOrigin
 * @param {Float32Array} rayDir
 * @returns {boolean} false when the ray's line misses (out and t untouched)
 */
export function intersectEllipsoidRay__T(out, t, ellipsoidCenter, ellipsoidRadii, rayOrigin, rayDir)
{
    const { vs } = scratch;
    if (!ellipsoidRoots(vs, ellipsoidCenter, ellipsoidRadii, rayOrigin, rayDir))
    {
        return false;
    }
    const pq = vs[0], vsvv = vs[1];
    let tValue = f32(-pq - vsvv);
    if (tValue < 0)
    {
        tValue = f32(pq - vsvv);
    }
    t[0] = tValue;
    rayPoint(out, f32(tValue), rayOrigin, rayDir);
    return true;
} // BoundingSphere.cpp:123

/**
 * Carbon: IntersectEllipsoidRayClosest (BoundingSphere.cpp:147-170)
 * The ray parameter of smaller magnitude, which may be behind the origin.
 * @param {Float32Array} out - receives the hit point
 * @param {Float32Array} ellipsoidCenter
 * @param {Float32Array} ellipsoidRadii
 * @param {Float32Array} rayOrigin
 * @param {Float32Array} rayDir
 * @returns {boolean} false when the ray's line misses (out untouched)
 */
export function intersectEllipsoidRayClosest(out, ellipsoidCenter, ellipsoidRadii, rayOrigin, rayDir)
{
    const { vs } = scratch;
    if (!ellipsoidRoots(vs, ellipsoidCenter, ellipsoidRadii, rayOrigin, rayDir))
    {
        return false;
    }
    const pq = vs[0], vsvv = vs[1];
    const t1 = f32(-pq - vsvv);
    const t2 = f32(pq - vsvv);
    const minT = Math.abs(t1) < Math.abs(t2) ? t1 : t2;
    rayPoint(out, minT, rayOrigin, rayDir);
    return true;
} // BoundingSphere.cpp:147

/**
 * The shared quadratic of BoundingSphere.cpp:125-136 and 149-160, in Carbon's float steps:
 * writes out = [ sqrt(pq), v_s / v_v ].
 * @returns {boolean} false when pq < 0
 */
function ellipsoidRoots(out, center, radii, origin, dir)
{
    const vx = f32(dir[0] / radii[0]), vy = f32(dir[1] / radii[1]), vz = f32(dir[2] / radii[2]);
    const sx = f32(f32(origin[0] - center[0]) / radii[0]);
    const sy = f32(f32(origin[1] - center[1]) / radii[1]);
    const sz = f32(f32(origin[2] - center[2]) / radii[2]);
    const v_v = f32(vx * vx + vy * vy + vz * vz);
    const v_s = f32(vx * sx + vy * sy + vz * sz);
    const s_s = f32(sx * sx + sy * sy + sz * sz);
    const vsvv = f32(v_s / v_v);
    const pq = f32(f32(vsvv * vsvv) - f32(s_s / v_v) + f32(1.0 / v_v));
    if (pq < 0.0)
    {
        return false;
    }
    out[0] = f32(Math.sqrt(pq));
    out[1] = vsvv;
    return true;
}

/** out = t * rayDir + rayOrigin */
function rayPoint(out, t, rayOrigin, rayDir)
{
    const ox = rayOrigin[0], oy = rayOrigin[1], oz = rayOrigin[2];
    out[0] = f32(t * rayDir[0]) + ox;
    out[1] = f32(t * rayDir[1]) + oy;
    out[2] = f32(t * rayDir[2]) + oz;
}

/**
 * Carbon: IsPointInsideEllipsoid (BoundingSphere.cpp:173-180)
 * @param {Float32Array} ellipsoidCenter
 * @param {Float32Array} ellipsoidRadii
 * @param {Float32Array} point
 * @returns {boolean}
 */
export function isPointInsideEllipsoid(ellipsoidCenter, ellipsoidRadii, point)
{
    const dx = f32(f32(point[0] - ellipsoidCenter[0]) / ellipsoidRadii[0]);
    const dy = f32(f32(point[1] - ellipsoidCenter[1]) / ellipsoidRadii[1]);
    const dz = f32(f32(point[2] - ellipsoidCenter[2]) / ellipsoidRadii[2]);
    return f32(dx * dx + dy * dy + dz * dz) <= 1;
} // BoundingSphere.cpp:173

/**
 * Carbon: BoundingSphereFromBox (BoundingSphere.cpp:182-197)
 * The sphere through min and max (optionally transformed by tf first).
 * @param {Float32Array} sphere - receives the sphere
 * @param {Float32Array} minBounds
 * @param {Float32Array} maxBounds
 * @param {Float32Array|null} [tf=null] Carbon's default argument (BoundingSphere.h:20)
 */
export function boundingSphereFromBox(sphere, minBounds, maxBounds, tf = null)
{
    const { vec3_0, vec3_1 } = scratch;
    Vector3.copy(vec3_0, minBounds);
    Vector3.copy(vec3_1, maxBounds);
    if (tf)
    {
        Matrix.transformCoord(vec3_0, minBounds, tf);
        Matrix.transformCoord(vec3_1, maxBounds, tf);
    }
    sphere[0] = vec3_0[0] + vec3_1[0];
    sphere[1] = vec3_0[1] + vec3_1[1];
    sphere[2] = vec3_0[2] + vec3_1[2];
    Vector3.subtract(vec3_0, vec3_0, vec3_1);
    sphere[3] = Vector3.length(vec3_0);
    sphere[0] *= 0.5;
    sphere[1] *= 0.5;
    sphere[2] *= 0.5;
    sphere[3] *= 0.5;
} // BoundingSphere.cpp:182

/**
 * Carbon: BoundingSphereFromPoints (BoundingSphere.h:21-23, three overloads)
 * Routes by an exact check: a Vector3 third argument to
 * boundingSphereFromPoints__Point1Point2; a count with a Float64Array sphere to
 * boundingSphereFromPoints__Vector4d, otherwise to boundingSphereFromPoints__Vector4.
 */
export function boundingSphereFromPoints(sphere, a, b)
{
    if (typeof b !== "number")
    {
        return boundingSphereFromPoints__Point1Point2(sphere, a, b);
    }
    return sphere instanceof Float64Array
        ? boundingSphereFromPoints__Vector4d(sphere, a, b)
        : boundingSphereFromPoints__Vector4(sphere, a, b);
}

/**
 * Carbon: BoundingSphereFromPoints( Vector4& sphere, point1, point2 ) (BoundingSphere.cpp:254-260)
 * @param {Float32Array} sphere - receives the sphere
 * @param {Float32Array} point1
 * @param {Float32Array} point2
 */
export function boundingSphereFromPoints__Point1Point2(sphere, point1, point2)
{
    const radiusEpsilon = f32(1e-4);
    const { vec3_0 } = scratch;
    Vector3.subtract(vec3_0, point2, point1);
    Vector3.scale(vec3_0, vec3_0, 0.5);
    const length = f32(Vector3.length(vec3_0));
    sphere[0] = vec3_0[0] + point1[0];
    sphere[1] = vec3_0[1] + point1[1];
    sphere[2] = vec3_0[2] + point1[2];
    sphere[3] = length + radiusEpsilon;
} // BoundingSphere.cpp:254

/**
 * Carbon: BoundingSphereFromPoints( Vector4& sphere, Vector3 const** points, pointsCount ) (BoundingSphere.cpp:266-271)
 * The double-precision overload, stored back as floats.
 * @param {Float32Array} sphere - receives the sphere
 * @param {Array<Float32Array>} points - reordered in place for more than four points, as Carbon's
 * @param {number} pointsCount
 */
export function boundingSphereFromPoints__Vector4(sphere, points, pointsCount)
{
    const { sphere4d } = scratch;
    sphere4d.set(sphere.subarray(0, 4));
    boundingSphereFromPoints__Vector4d(sphere4d, points, pointsCount);
    sphere.set(sphere4d);
} // BoundingSphere.cpp:266

/**
 * Carbon: BoundingSphereFromPoints( Vector4d& sphere, Vector3 const** points, pointsCount ) (BoundingSphere.cpp:276-354)
 * Exact spheres for up to four points (with fallbacks on a zero denominator, where Carbon
 * logs a warning), Welzl-style recursion beyond.
 * Carbon quirk, reproduced: the recursion reorders the caller's point array.
 * @param {Float64Array} sphere - receives the sphere
 * @param {Array<Float32Array>} points
 * @param {number} pointsCount
 */
export function boundingSphereFromPoints__Vector4d(sphere, points, pointsCount)
{
    fromPointsAt(sphere, points, 0, pointsCount);
}

/** BoundingSphereFromPoints( Vector4d&, ... ) over points[base .. base + count) */
function fromPointsAt(sphere, points, base, pointsCount)
{
    const radiusEpsilon = 1e-4;
    switch (pointsCount)
    {
        case 0:
            sphere[0] = sphere[1] = sphere[2] = sphere[3] = 0.0;
            break;
        case 1: {
            const p = points[base];
            sphere[0] = p[0];
            sphere[1] = p[1];
            sphere[2] = p[2];
            sphere[3] = f32(radiusEpsilon);
            break;
        }
        case 2: {
            const p0 = points[base], p1 = points[base + 1];
            const ax = 0.5 * (p1[0] - p0[0]), ay = 0.5 * (p1[1] - p0[1]), az = 0.5 * (p1[2] - p0[2]);
            sphere[0] = ax + p0[0];
            sphere[1] = ay + p0[1];
            sphere[2] = az + p0[2];
            sphere[3] = Math.sqrt(ax * ax + ay * ay + az * az) + radiusEpsilon;
            break;
        }
        case 3: {
            const p0 = points[base], p1 = points[base + 1], p2 = points[base + 2];
            const { a, b, axb, axbxa, bxaxb } = scratch;
            sub3(a, p1, p0);
            sub3(b, p2, p0);
            cross3(axb, a, b);
            cross3(axbxa, axb, a);
            cross3(bxaxb, b, axb);
            const denom = 2.0 * dot3(axb, axb);
            if (denom === 0.0)
            {
                // Carbon: CCP_LOGWARN "BoundingSphereFromPoints: failed because denominator is zero! Using fallback..."
                fromPointsAt(sphere, points, base, 2);
                return;
            }
            const a2 = dot3(a, a), b2 = dot3(b, b);
            const ox = (b2 * axbxa[0] + a2 * bxaxb[0]) / denom;
            const oy = (b2 * axbxa[1] + a2 * bxaxb[1]) / denom;
            const oz = (b2 * axbxa[2] + a2 * bxaxb[2]) / denom;
            sphere[0] = ox + p0[0];
            sphere[1] = oy + p0[1];
            sphere[2] = oz + p0[2];
            sphere[3] = Math.sqrt(ox * ox + oy * oy + oz * oz) + radiusEpsilon;
            break;
        }
        case 4: {
            const p0 = points[base], p1 = points[base + 1], p2 = points[base + 2], p3 = points[base + 3];
            const { a, b, c, axb, cxa, bxc } = scratch;
            sub3(a, p1, p0);
            sub3(b, p2, p0);
            sub3(c, p3, p0);
            const denom = 2.0 * (a[0] * (b[1] * c[2] - c[1] * b[2]) - b[0] * (a[1] * c[2] - c[1] * a[2]) + c[0] * (a[1] * b[2] - b[1] * a[2]));
            if (denom === 0.0)
            {
                // Carbon: CCP_LOGWARN "BoundingSphereFromPoints: failed because denominator is zero! Using fallback..."
                fromPointsAt(sphere, points, base, 3);
                return;
            }
            const a2 = dot3(a, a), b2 = dot3(b, b), c2 = dot3(c, c);
            cross3(axb, a, b);
            cross3(cxa, c, a);
            cross3(bxc, b, c);
            const ox = (c2 * axb[0] + b2 * cxa[0] + a2 * bxc[0]) / denom;
            const oy = (c2 * axb[1] + b2 * cxa[1] + a2 * bxc[1]) / denom;
            const oz = (c2 * axb[2] + b2 * cxa[2] + a2 * bxc[2]) / denom;
            sphere[0] = ox + p0[0];
            sphere[1] = oy + p0[1];
            sphere[2] = oz + p0[2];
            sphere[3] = Math.sqrt(ox * ox + oy * oy + oz * oz) + radiusEpsilon;
            break;
        }
        default:
            recurBoundingSphereCreate(sphere, points, base, pointsCount, 0);
            break;
    }
}

/**
 * Carbon: recurBoundingSphereCreate (BoundingSphere.cpp:202-249)
 * Carbon passes `p`, a pointer into the point array, and reads the b support points
 * before it as p[-1] .. p[-b]; here p is points[base], and p[-k] is points[base - k].
 * Adapted: the returned Vector4d is written to mb instead, as everywhere in this archive.
 * @param {Float64Array} mb - receives the sphere
 */
function recurBoundingSphereCreate(mb, points, base, len, b)
{
    const radiusEpsilon = 1e-4;
    if (b <= 4)
    {
        fromPointsAt(mb, points, base - b, b);
        if (b === 4)
        {
            return;
        }
    }
    for (let i = 0; i < len; ++i)
    {
        const p = points[base + i];
        const dx = p[0] - mb[0], dy = p[1] - mb[1], dz = p[2] - mb[2];
        // outside?
        if (dx * dx + dy * dy + dz * dz > mb[3] * mb[3] + radiusEpsilon)
        {
            // avoid duplicates in the four points
            let isDuplicate = false;
            for (let j = 0; j < b; ++j)
            {
                if (triVectorIsIdentical(p, points[base - j - 1]))
                {
                    isDuplicate = true;
                    break;
                }
            }
            if (!isDuplicate)
            {
                for (let j = i; j > 0; --j)
                {
                    const swap = points[base + j];
                    points[base + j] = points[base + j - 1];
                    points[base + j - 1] = swap;
                }
                recurBoundingSphereCreate(mb, points, base + 1, i, b + 1);
            }
        }
    }
}

/** Vector3d subtraction in doubles */
function sub3(out, a, b)
{
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    return out;
}

/** Vector3d Cross in doubles; out must not alias a or b */
function cross3(out, a, b)
{
    out[0] = a[1] * b[2] - a[2] * b[1];
    out[1] = a[2] * b[0] - a[0] * b[2];
    out[2] = a[0] * b[1] - a[1] * b[0];
    return out;
}

function dot3(a, b)
{
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

const scratch = {
    vec3_0: new Float32Array(3),
    vec3_1: new Float32Array(3),
    vs: new Float32Array(2),
    t: new Float32Array(1),
    sphere4d: new Float64Array(4),
    a: new Float64Array(3),
    b: new Float64Array(3),
    c: new Float64Array(3),
    axb: new Float64Array(3),
    axbxa: new Float64Array(3),
    bxaxb: new Float64Array(3),
    cxa: new Float64Array(3),
    bxc: new Float64Array(3)
};
