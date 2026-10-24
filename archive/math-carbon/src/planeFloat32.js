// Source: math/include/Plane_inline.h
import { vector3Float32 } from "./vector3Float32.js";

/** Internal float32 Plane kernels, pending complete precision-table selection. */
export const planeFloat32 = { multiplyScalar, divideScalar, intersectLine, normalize, dotCoord, dotNormal };

/**
 * Carbon: Plane::operator* (math/include/Plane_inline.h:57-60)
 * Multiplies components by a float32 scalar.
 * @param {Float32Array} out Receiving plane; may overlap p.
 * @param {Float32Array} p Plane.
 * @param {number} scale Scalar, converted to native float.
 * @returns {Float32Array} out
 */
function multiplyScalar(out, p, scale)
{
    const f = Math.fround;
    const a = p[0], b = p[1], c = p[2], d = p[3];
    scale = f(scale);
    out[0] = f(a * scale);
    out[1] = f(b * scale);
    out[2] = f(c * scale);
    out[3] = f(d * scale);
    return out;
}

/**
 * Carbon: Plane::operator/= (math/include/Plane_inline.h:34-42)
 * Rounds the reciprocal before component multiplication.
 * @param {Float32Array} out Receiving plane; may overlap p.
 * @param {Float32Array} p Plane.
 * @param {number} div Divisor, converted to native float.
 * @returns {Float32Array} out
 */
function divideScalar(out, p, div)
{
    return multiplyScalar(out, p, Math.fround(1 / Math.fround(div)));
}

/**
 * Carbon: DotNormal (math/include/Plane_inline.h:129-132)
 * Returns the float32 dot product excluding the plane offset.
 * @param {Float32Array} p Plane.
 * @param {Float32Array} v Vector.
 * @returns {number} Dot product.
 */
function dotNormal(p, v)
{
    return vector3Float32.dot(p, v);
}

/**
 * Carbon: DotCoord (math/include/Plane_inline.h:123-126)
 * Adds the plane offset after the rounded normal dot product.
 * @param {Float32Array} p Plane.
 * @param {Float32Array} v Coordinate.
 * @returns {number} Dot product plus offset.
 */
function dotCoord(p, v)
{
    return Math.fround(dotNormal(p, v) + p[3]);
}

/**
 * Carbon: IntersectLine (math/include/Plane_inline.h:88-109)
 * Writes positive zeros and returns false only when the rounded denominator is zero.
 * @param {Float32Array} outPoint Receiving intersection; may overlap any input.
 * @param {Float32Array} p Plane.
 * @param {Float32Array} v1 Line start.
 * @param {Float32Array} v2 Line end.
 * @returns {boolean} Native intersection result.
 */
function intersectLine(outPoint, p, v1, v2)
{
    const f = Math.fround;
    const x = v1[0], y = v1[1], z = v1[2];
    const dx = f(v2[0] - x), dy = f(v2[1] - y), dz = f(v2[2] - z);
    const denominator = f(f(f(p[0] * dx) + f(p[1] * dy)) + f(p[2] * dz));
    if (denominator === 0)
    {
        outPoint[0] = 0;
        outPoint[1] = 0;
        outPoint[2] = 0;
        return false;
    }
    const t = f(f(p[3] + dotNormal(p, v1)) / denominator);
    outPoint[0] = f(x - f(t * dx));
    outPoint[1] = f(y - f(t * dy));
    outPoint[2] = f(z - f(t * dz));
    return true;
}

/**
 * Carbon: Normalize (math/include/Plane_inline.h:112-120)
 * Uses the unguarded normal length and scales all four components.
 * @param {Float32Array} out Receiving plane; may overlap p.
 * @param {Float32Array} p Plane.
 * @returns {Float32Array} out
 */
function normalize(out, p)
{
    return multiplyScalar(out, p, Math.fround(1 / vector3Float32.length(p)));
}

// Operation tables are immutable; numeric results and caller-owned outputs stay writable.
Object.freeze(planeFloat32);
