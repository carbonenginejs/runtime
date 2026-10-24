// Source: math/include/Sphere_inline.h and math/src/Sphere.cpp
import { matrixFloat32 } from "./matrixFloat32.js";

/** Internal float32 Sphere kernels, pending complete precision-table selection. */
export const sphereFloat32 = { fromBox, fromBoxTransformed, includePoint, includeSphere, isPointInside, isSphereInside, transform };

/**
 * Carbon: LengthSq (math/include/Vector3_inline.h:169-172)
 * Rounds the three products and left-associated sum.
 * @param {number} x X component.
 * @param {number} y Y component.
 * @param {number} z Z component.
 * @returns {number} Float32 squared length.
 */
function lengthSq3(x, y, z)
{
    const f = Math.fround;
    return f(f(f(x * x) + f(y * y)) + f(z * z));
}

/**
 * Carbon: Sphere::Sphere (math/include/Sphere_inline.h:27-31)
 * Retains rounded center sums and displacement before length.
 * @param {Float32Array} out Receiving sphere; may overlap box.
 * @param {Float32Array} box Minimum/maximum corners.
 * @returns {Float32Array} out
 */
function fromBox(out, box)
{
    const f = Math.fround;
    const x = f(f(box[0] + box[3]) * 0.5);
    const y = f(f(box[1] + box[4]) * 0.5);
    const z = f(f(box[2] + box[5]) * 0.5);
    const dx = f(box[3] - box[0]), dy = f(box[4] - box[1]), dz = f(box[5] - box[2]);
    const radius = f(f(Math.sqrt(lengthSq3(dx, dy, dz))) * 0.5);
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = radius;
    return out;
}

/**
 * Carbon: Sphere::Sphere (math/src/Sphere.cpp:10-17)
 * Transforms only min/max corners, preserving the donor construction.
 * @param {Float32Array} out Receiving sphere; may overlap box or m.
 * @param {Float32Array} box Minimum/maximum corners.
 * @param {Float32Array} m Carbon row-major matrix.
 * @returns {Float32Array} out
 */
function fromBoxTransformed(out, box, m)
{
    const min = scratch.vec3_0, max = scratch.vec3_1, bounds = scratch.box_0;
    min[0] = box[0]; min[1] = box[1]; min[2] = box[2];
    max[0] = box[3]; max[1] = box[4]; max[2] = box[5];
    matrixFloat32.transformCoord(min, min, m);
    matrixFloat32.transformCoord(max, max, m);
    bounds[0] = min[0]; bounds[1] = min[1]; bounds[2] = min[2];
    bounds[3] = max[0]; bounds[4] = max[1]; bounds[5] = max[2];
    return fromBox(out, bounds);
}

/**
 * Carbon: Sphere::IsPointInside (math/include/Sphere_inline.h:107-117)
 * Applies the rounded squared-radius epsilon after the initialized check.
 * @param {Float32Array} s Sphere.
 * @param {Float32Array} pos Point.
 * @returns {boolean} Native containment result.
 */
function isPointInside(s, pos)
{
    if (!(s[3] >= 0)) return false;
    const f = Math.fround;
    const dx = f(pos[0] - s[0]), dy = f(pos[1] - s[1]), dz = f(pos[2] - s[2]);
    return lengthSq3(dx, dy, dz) <= f(f(s[3] * s[3]) + f(1e-4));
}

/**
 * Carbon: Sphere::IsSphereInside (math/include/Sphere_inline.h:119-132)
 * Preserves initialization, radius pre-check and rounded squared displacement.
 * @param {Float32Array} s Receiving sphere.
 * @param {Float32Array} other Tested sphere.
 * @returns {boolean} Native containment result.
 */
function isSphereInside(s, other)
{
    if (!(s[3] >= 0) || !(other[3] >= 0) || s[3] < other[3]) return false;
    const f = Math.fround;
    const dx = f(other[0] - s[0]), dy = f(other[1] - s[1]), dz = f(other[2] - s[2]);
    const radius = f(s[3] - other[3]);
    return lengthSq3(dx, dy, dz) <= f(radius * radius);
}

/**
 * Carbon: Sphere::IncludePoint (math/include/Sphere_inline.h:53-70)
 * Mutates the receiver using the native rounded growth coefficient.
 * @param {Float32Array} s Receiving sphere.
 * @param {Float32Array} pos Point.
 * @returns {Float32Array} s
 */
function includePoint(s, pos)
{
    const px = pos[0], py = pos[1], pz = pos[2];
    if (!(s[3] >= 0))
    {
        s[0] = px; s[1] = py; s[2] = pz; s[3] = 0;
        return s;
    }
    if (isPointInside(s, pos)) return s;
    const f = Math.fround;
    const x = s[0], y = s[1], z = s[2], radius = s[3];
    const dx = f(px - x), dy = f(py - y), dz = f(pz - z);
    const magnitude = f(Math.sqrt(lengthSq3(dx, dy, dz)));
    const t = f(0.5 * f(1 - f(radius / magnitude)));
    s[0] = f(x + f(t * dx));
    s[1] = f(y + f(t * dy));
    s[2] = f(z + f(t * dz));
    s[3] = f(0.5 * f(radius + magnitude));
    return s;
}

/**
 * Carbon: Sphere::IncludeSphere (math/include/Sphere_inline.h:72-95)
 * Preserves the donor no-op when either sphere contains the other.
 * @param {Float32Array} s Receiving sphere.
 * @param {Float32Array} other Included sphere.
 * @returns {Float32Array} s
 */
function includeSphere(s, other)
{
    if (!(other[3] >= 0)) return s;
    const ox = other[0], oy = other[1], oz = other[2], otherRadius = other[3];
    if (!(s[3] >= 0))
    {
        s[0] = ox; s[1] = oy; s[2] = oz; s[3] = otherRadius;
        return s;
    }
    if (isSphereInside(s, other) || isSphereInside(other, s)) return s;
    const f = Math.fround;
    const x = s[0], y = s[1], z = s[2], radius = s[3];
    const dx = f(ox - x), dy = f(oy - y), dz = f(oz - z);
    const magnitude = f(Math.sqrt(lengthSq3(dx, dy, dz)));
    const t = f(0.5 * f(1 + f(f(otherRadius - radius) / magnitude)));
    s[0] = f(x + f(t * dx));
    s[1] = f(y + f(t * dy));
    s[2] = f(z + f(t * dz));
    s[3] = f(0.5 * f(f(radius + otherRadius) + magnitude));
    return s;
}

/**
 * Carbon: Sphere::Transform (math/src/Sphere.cpp:19-33)
 * Transforms the center and scales radius by the maximum rounded basis length.
 * @param {Float32Array} out Receiving sphere; may overlap s or m.
 * @param {Float32Array} s Sphere.
 * @param {Float32Array} m Carbon row-major matrix.
 * @returns {Float32Array} out
 */
function transform(out, s, m)
{
    const x = s[0], y = s[1], z = s[2], radius = s[3];
    if (!(radius >= 0))
    {
        out[0] = x; out[1] = y; out[2] = z; out[3] = radius;
        return out;
    }
    const center = scratch.vec3_0;
    matrixFloat32.transformCoord(center, s, m);
    const sx = lengthSq3(m[0], m[1], m[2]);
    const sy = lengthSq3(m[4], m[5], m[6]);
    const sz = lengthSq3(m[8], m[9], m[10]);
    const yz = sy < sz ? sz : sy;
    const scale = Math.fround(Math.sqrt(sx < yz ? yz : sx));
    out[0] = center[0]; out[1] = center[1]; out[2] = center[2];
    out[3] = Math.fround(radius * scale);
    return out;
}

/**
 * Private typed scratch; dirty on entry, fully written before each read.
 * Never returned or retained. No callback or nested path re-enters these slots;
 * fromBox consumes only its provided bounds, and matrix transforms use scalar locals.
 */
const scratch = {
    vec3_0: new Float32Array(3),
    vec3_1: new Float32Array(3),
    box_0: new Float32Array(6)
};
