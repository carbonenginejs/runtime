import { AxisAlignedBox } from "./axisAlignedBox.js";

/**
 * Carbon AxisAlignedEllipsoid — literal port of math\include\AxisAlignedEllipsoid.h /
 * AxisAlignedEllipsoid_inline.h
 *
 * Storage: Float32Array(6) = [ radiiX, radiiY, radiiZ, centerX, centerY, centerZ ]
 * — matching Carbon's member declaration order (Vector3 radii; Vector3 center;)  // AxisAlignedEllipsoid.h:38
 * A default ellipsoid is all zeros and is "not initialized".
 *
 * @typedef {Float32Array} axisAlignedEllipsoid
 */

export class AxisAlignedEllipsoid
{
    /**
     * Creates an ellipsoid (Carbon default constructor: center 0, radii 0 = uninitialized)  // AxisAlignedEllipsoid_inline.h:12
     * @returns {axisAlignedEllipsoid}
     */
    static create()
    {
        return new Float32Array(6);
    }

    /**
     * Creates an ellipsoid from center and radii vec3s (AxisAlignedEllipsoid(center, radius))  // AxisAlignedEllipsoid_inline.h:18
     * @param {Float32Array} center - vec3
     * @param {Float32Array} radii - vec3
     * @returns {axisAlignedEllipsoid}
     */
    static fromCenterRadii(center, radii)
    {
        const out = new Float32Array(6);
        out[0] = radii[0];
        out[1] = radii[1];
        out[2] = radii[2];
        out[3] = center[0];
        out[4] = center[1];
        out[5] = center[2];
        return out;
    }

    /**
     * Sets an ellipsoid from a box (AxisAlignedEllipsoid(box, inner))  // AxisAlignedEllipsoid_inline.h:29
     * inner=true: the box is the maximum box fitting inside the ellipsoid (radii scaled by sqrt(3));
     * inner=false: the box is the minimum box that fits the ellipsoid.
     * @param {axisAlignedEllipsoid} out
     * @param {Float32Array} box - axisAlignedBox [minX,minY,minZ,maxX,maxY,maxZ]
     * @param {Boolean} inner
     * @returns {axisAlignedEllipsoid}
     */
    static fromBox(out, box, inner)
    {
        out[3] = (box[0] + box[3]) * 0.5;
        out[4] = (box[1] + box[4]) * 0.5;
        out[5] = (box[2] + box[5]) * 0.5;
        out[0] = 0.5 * (box[3] - box[0]);
        out[1] = 0.5 * (box[4] - box[1]);
        out[2] = 0.5 * (box[5] - box[2]);
        if (inner)
        {
            out[0] *= SQRT_THREE;
            out[1] *= SQRT_THREE;
            out[2] *= SQRT_THREE;
        }
        return out;
    }

    /**
     * True when the ellipsoid differs from the default (all-zero) ellipsoid  // AxisAlignedEllipsoid_inline.h:39
     * @param {axisAlignedEllipsoid} e
     * @returns {Boolean}
     */
    static isInitialized(e)
    {
        return e[0] !== 0 || e[1] !== 0 || e[2] !== 0 || e[3] !== 0 || e[4] !== 0 || e[5] !== 0;
    }

    /**
     * Exact equality (operator ==)  // AxisAlignedEllipsoid_inline.h:49
     * @param {axisAlignedEllipsoid} a
     * @param {axisAlignedEllipsoid} b
     * @returns {Boolean}
     */
    static equals(a, b)
    {
        return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] &&
            a[3] === b[3] && a[4] === b[4] && a[5] === b[5];
    }

    /**
     * Exact inequality (operator !=)  // AxisAlignedEllipsoid_inline.h:54
     * @param {axisAlignedEllipsoid} a
     * @param {axisAlignedEllipsoid} b
     * @returns {Boolean}
     */
    static notEquals(a, b)
    {
        return a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2] ||
            a[3] !== b[3] || a[4] !== b[4] || a[5] !== b[5];
    }

    /**
     * Grows the ellipsoid in place to include a point (mutates e, as Carbon mutates the receiver)  // AxisAlignedEllipsoid_inline.h:59
     * @param {axisAlignedEllipsoid} e
     * @param {Float32Array} point - vec3
     * @returns {axisAlignedEllipsoid}
     */
    static includePoint(e, point)
    {
        if (AxisAlignedEllipsoid.isPointInside(e, point))
        {
            return e;
        }

        const box = AxisAlignedBox.fromEllipsoid(scratchBox, e);
        // scale it down so it is the biggest box that can be fitted within the ellipsoid
        AxisAlignedBox.scale(box, ONE_OVER_SQRT_THREE);
        AxisAlignedBox.includePoint(box, point);

        // Scale up the box dimensions with sqrt(3) (because the ratio of box volume to ellipsoid
        // volume is sqrt(3)) so we get the smallest ellipsoid to fit the box which now includes the point
        fromContainingBox(e, box);
        return e;
    }

    /**
     * Grows the ellipsoid in place to include a box (mutates e)  // AxisAlignedEllipsoid_inline.h:77
     * @param {axisAlignedEllipsoid} e
     * @param {Float32Array} box - axisAlignedBox [minX,minY,minZ,maxX,maxY,maxZ]
     * @returns {axisAlignedEllipsoid}
     */
    static includeBox(e, box)
    {
        scratchMax[0] = box[3];
        scratchMax[1] = box[4];
        scratchMax[2] = box[5];
        scratchMin[0] = box[0];
        scratchMin[1] = box[1];
        scratchMin[2] = box[2];
        if (AxisAlignedEllipsoid.isPointInside(e, scratchMax) && AxisAlignedEllipsoid.isPointInside(e, scratchMin))
        {
            return e;
        }

        const containingBox = AxisAlignedBox.fromEllipsoid(scratchBox, e);
        // scale it down so it is the biggest box that can be fitted within the ellipsoid
        AxisAlignedBox.scale(containingBox, ONE_OVER_SQRT_THREE);
        AxisAlignedBox.includeBox(containingBox, box);

        fromContainingBox(e, containingBox);
        return e;
    }

    /**
     * Grows the ellipsoid in place to include a sphere (mutates e)  // AxisAlignedEllipsoid_inline.h:95
     * @param {axisAlignedEllipsoid} e
     * @param {Float32Array} s - sphere [cx,cy,cz,radius]
     * @returns {axisAlignedEllipsoid}
     */
    static includeSphere(e, s)
    {
        // include a box that encapsulates the sphere
        return AxisAlignedEllipsoid.includeBox(e, AxisAlignedBox.fromSphere(scratchSphereBox, s));
    }

    /**
     * True when a point is inside the ellipsoid (unit-sphere test in radii-scaled space)  // AxisAlignedEllipsoid_inline.h:101
     * @param {axisAlignedEllipsoid} e
     * @param {Float32Array} point - vec3
     * @returns {Boolean}
     */
    static isPointInside(e, point)
    {
        const dx = (point[0] - e[3]) / e[0],
            dy = (point[1] - e[4]) / e[1],
            dz = (point[2] - e[5]) / e[2];
        return dx * dx + dy * dy + dz * dz <= 1;
    }

    /**
     * Offsets the ellipsoid center in place (mutates e)  // AxisAlignedEllipsoid_inline.h:110
     * @param {axisAlignedEllipsoid} e
     * @param {Float32Array} by - vec3
     * @returns {axisAlignedEllipsoid}
     */
    static offset(e, by)
    {
        e[3] += by[0];
        e[4] += by[1];
        e[5] += by[2];
        return e;
    }

    /**
     * Scales the radii in place by a scalar; no-op when uninitialized (mutates e)  // AxisAlignedEllipsoid_inline.h:115
     * @param {axisAlignedEllipsoid} e
     * @param {Number} scale
     * @returns {axisAlignedEllipsoid}
     */
    static scaleScalar(e, scale)
    {
        if (!AxisAlignedEllipsoid.isInitialized(e))
        {
            return e;
        }
        e[0] *= scale;
        e[1] *= scale;
        e[2] *= scale;
        return e;
    }

    /**
     * Scales the radii in place component-wise; no-op when uninitialized (mutates e)  // AxisAlignedEllipsoid_inline.h:124
     * @param {axisAlignedEllipsoid} e
     * @param {Float32Array} scale - vec3
     * @returns {axisAlignedEllipsoid}
     */
    static scaleVector(e, scale)
    {
        if (!AxisAlignedEllipsoid.isInitialized(e))
        {
            return e;
        }
        e[0] *= scale[0];
        e[1] *= scale[1];
        e[2] *= scale[2];
        return e;
    }
}

const SQRT_THREE = Math.sqrt(3.0);              // NumConst.h:9
const ONE_OVER_SQRT_THREE = 1.0 / Math.sqrt(3.0); // NumConst.h:10

const scratchBox = new Float32Array(6);

// Rebuild radii/center from a containing box (the shared tail of IncludePoint/IncludeBox)
function fromContainingBox(e, box)
{
    e[0] = (box[3] - box[0]) * 0.5 * SQRT_THREE;
    e[1] = (box[4] - box[1]) * 0.5 * SQRT_THREE;
    e[2] = (box[5] - box[2]) * 0.5 * SQRT_THREE;
    e[3] = (box[0] + box[3]) * 0.5;
    e[4] = (box[1] + box[4]) * 0.5;
    e[5] = (box[2] + box[5]) * 0.5;
}

const scratchMin = new Float32Array(3);
const scratchMax = new Float32Array(3);

const scratchSphereBox = new Float32Array(6);
