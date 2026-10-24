// Source: math/include/AxisAlignedEllipsoid_inline.h
import { axisAlignedBox } from "./axisAlignedBox.js";
import { axisAlignedBoxFloat32 } from "./axisAlignedBoxFloat32.js";
import { axisAlignedEllipsoid } from "./axisAlignedEllipsoid.js";

/** Internal float32 ellipsoid kernels, pending complete precision-table selection. */
export const axisAlignedEllipsoidFloat32 = { fromBox, isPointInside, includePoint, includeBox, includeSphere, scaleScalar };

// Carbon: float constants (math/include/NumConst.h:9-10).
const SQRT_THREE = Math.fround(Math.sqrt(3));
const ONE_OVER_SQRT_THREE = Math.fround(1 / SQRT_THREE);

/**
 * Carbon: AxisAlignedEllipsoid::AxisAlignedEllipsoid (math/include/AxisAlignedEllipsoid_inline.h:29-37)
 * Preserves rounded center, size, half-size and optional native sqrt-three multiplication.
 * @param {Float32Array} out Receiving radii/center; may overlap box.
 * @param {Float32Array} box Box.
 * @param {boolean} inner Whether the box must fit inside the ellipsoid.
 * @returns {Float32Array} out
 */
function fromBox(out, box, inner)
{
    const f = Math.fround;
    const x = f(f(box[0] + box[3]) * 0.5), y = f(f(box[1] + box[4]) * 0.5), z = f(f(box[2] + box[5]) * 0.5);
    let rx = f(0.5 * f(box[3] - box[0])), ry = f(0.5 * f(box[4] - box[1])), rz = f(0.5 * f(box[5] - box[2]));
    if (inner)
    {
        rx = f(rx * SQRT_THREE); ry = f(ry * SQRT_THREE); rz = f(rz * SQRT_THREE);
    }
    out[0] = rx; out[1] = ry; out[2] = rz;
    out[3] = x; out[4] = y; out[5] = z;
    return out;
}

/**
 * Carbon: AxisAlignedEllipsoid::IsPointInside (math/include/AxisAlignedEllipsoid_inline.h:101-108)
 * Rounds displacement before component division and the squared-length comparison.
 * @param {Float32Array} e Ellipsoid.
 * @param {number} x Float32 point X.
 * @param {number} y Float32 point Y.
 * @param {number} z Float32 point Z.
 * @returns {boolean} Native containment result.
 */
function containsPoint(e, x, y, z)
{
    const f = Math.fround;
    const dx = f(f(x - e[3]) / e[0]), dy = f(f(y - e[4]) / e[1]), dz = f(f(z - e[5]) / e[2]);
    return f(f(f(dx * dx) + f(dy * dy)) + f(dz * dz)) <= 1;
}

/**
 * Carbon: AxisAlignedEllipsoid::IsPointInside (math/include/AxisAlignedEllipsoid_inline.h:101-108)
 * Applies native component-wise radius division, without an initialization guard.
 * @param {Float32Array} e Ellipsoid.
 * @param {Float32Array} point Point.
 * @returns {boolean} Native containment result.
 */
function isPointInside(e, point)
{
    return containsPoint(e, point[0], point[1], point[2]);
}

/**
 * Carbon: AxisAlignedEllipsoid::IncludePoint (math/include/AxisAlignedEllipsoid_inline.h:59-75)
 * Rebuilds the native containing box, including origin-based box scaling.
 * @param {Float32Array} e Mutable ellipsoid.
 * @param {Float32Array} point Point.
 * @returns {Float32Array} e
 */
function includePoint(e, point)
{
    if (isPointInside(e, point)) return e;
    const box = scratch.box_0;
    axisAlignedBox.fromEllipsoid(box, e);
    axisAlignedBoxFloat32.scale(box, ONE_OVER_SQRT_THREE);
    axisAlignedBox.includePoint(box, point);
    return fromBox(e, box, true);
}

/**
 * Carbon: AxisAlignedEllipsoid::IncludeBox (math/include/AxisAlignedEllipsoid_inline.h:77-93)
 * Keeps native containment order and rounded box reconstruction.
 * @param {Float32Array} e Mutable ellipsoid.
 * @param {Float32Array} box Included box.
 * @returns {Float32Array} e
 */
function includeBox(e, box)
{
    if (containsPoint(e, box[3], box[4], box[5]) && containsPoint(e, box[0], box[1], box[2])) return e;
    const bounds = scratch.box_0;
    axisAlignedBox.fromEllipsoid(bounds, e);
    axisAlignedBoxFloat32.scale(bounds, ONE_OVER_SQRT_THREE);
    axisAlignedBox.includeBox(bounds, box);
    return fromBox(e, bounds, true);
}

/**
 * Carbon: AxisAlignedEllipsoid::IncludeSphere (math/include/AxisAlignedEllipsoid_inline.h:95-99)
 * Builds the sphere's box before the native IncludeBox path.
 * @param {Float32Array} e Mutable ellipsoid.
 * @param {Float32Array} s Sphere.
 * @returns {Float32Array} e
 */
function includeSphere(e, s)
{
    axisAlignedBox.fromSphere(scratch.box_1, s);
    return includeBox(e, scratch.box_1);
}

/**
 * Carbon: AxisAlignedEllipsoid::Scale (math/include/AxisAlignedEllipsoid_inline.h:115-122)
 * Rounds the scalar and each updated radius, preserving the initialized guard.
 * @param {Float32Array} e Mutable ellipsoid.
 * @param {number} scale Native float scale.
 * @returns {Float32Array} e
 */
function scaleScalar(e, scale)
{
    if (!axisAlignedEllipsoid.isInitialized(e)) return e;
    const f = Math.fround;
    scale = f(scale);
    e[0] = f(e[0] * scale); e[1] = f(e[1] * scale); e[2] = f(e[2] * scale);
    return e;
}

/**
 * Private dirty scratch, fully written before read and never returned.
 * IncludeSphere owns box_1 while nested IncludeBox owns box_0; no callback re-entry.
 */
const scratch = { box_0: new Float32Array(6), box_1: new Float32Array(6) };
