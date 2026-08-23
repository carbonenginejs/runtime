import { vec3 } from "./vec3.js";
import { vec4 } from "./vec4.js";
import { mat4 } from "./mat4.js";
import { pln } from "./pln.js";
import { box3 } from "./box3.js";

/**
 * 3D Sphere
 * @typedef {Float32Array} sph3
 */

export const sph3 = {};

// Scratch
let sph3_0 = null;
let box3_0 = null;

/**
 * Allocates a pooled sph3
 * @returns {Float32Array|sph3}
 */
sph3.alloc = vec4.alloc;

/**
 * Unallocates a pooled sph3
 * @param {sph3|Float32Array} a
 */
sph3.unalloc = vec4.unalloc;

/**
 * Returns a subarray containing the position component of the sph3
 * - Why does webpack fail to resolve this if referencing pln.normal?
 *
 * @param {sph3} a
 * @returns {sph3}
 */
sph3.$position = function(a)
{
    return a.subarray(0, 3);
};

/**
 * Clones a sphere
 *
 * @param {sph3} a
 * @returns {sph3}
 */
sph3.clone = vec4.clone;

/**
 * Checks if a sphere contains a point
 *
 * @param {sph3} a
 * @param {vec3} p
 * @returns {boolean}
 */
sph3.containsPoint = function(a, p)
{
    if (sph3.isEmpty(a)) return false;

    let x = p[0] - a[0],
        y = p[1] - a[1],
        z = p[2] - a[2];

    return (x * x + y * y + z * z) <= (a[3] * a[3]);
};

/**
 * Copies a sphere
 *
 * @param {sph3} a
 * @param {sph3} b
 * @returns {sph3}
 */
sph3.copy = vec4.copy;

/**
 * Creates a sphere
 *
 * @returns {sph3}
 */
sph3.create = function()
{
    return new Float32Array([ 0, 0, 0, -1 ]);
};

/**
 * Returns the distance between two spheres
 *
 * @param {sph3} a
 * @param {sph3} b
 * @returns {number}
 */
sph3.distance = function(a, b)
{
    if (sph3.isEmpty(a) || sph3.isEmpty(b)) return Infinity;

    let x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2],
        rii = b[3] + a[3];

    return Math.sqrt(x * x + y * y + z * z) - rii;
};

/**
 * Returns the distance from a sphere to a given point
 *
 * @param {sph3} a
 * @param {vec3} p
 * @returns {number}
 */
sph3.distanceToPoint = function(a, p)
{
    if (sph3.isEmpty(a)) return Infinity;

    let x = p[0] - a[0],
        y = p[1] - a[1],
        z = p[2] - a[2];

    return Math.sqrt(x * x + y * y + z * z) - a[3];
};

/**
 * Empties a sphere
 * @param {sph3} a
 * @returns {sph3} a
 */
sph3.empty = function(a)
{
    a[0] = 0;
    a[1] = 0;
    a[2] = 0;
    a[3] = -1;
    return a;
};

/**
 * Compares two sphere's for equality
 *
 * @param {sph3} a
 * @param {sph3} b
 * @returns {boolean}
 */
sph3.equals = vec4.equals;

/**
 * Compares a sphere to spherical components for equality
 *
 * @param {sph3} a
 * @param {vec3} position
 * @param {number} radius
 * @returns {boolean}
 */
sph3.equalsPositionRadius = pln.equalsNormalConstant;

/**
 * Compares two sphere for exact equality
 *
 * @param {sph3} a
 * @param {sph3} b
 * @returns {boolean}
 */
sph3.exactEquals = vec4.exactEquals;

/**
 * Compares a sphere to spherical components for exact equality
 *
 * @param {sph3} a
 * @param {vec3} position
 * @param {number} radius
 * @returns {boolean}
 */
sph3.exactEqualsPositionRadius = pln.exactEqualsNormalConstant;

/**
 * Extracts a spheres's components
 *
 * @param {sph3} a
 * @param {vec3} outPosition
 * @returns {number}
 */
sph3.extract = pln.extract;

/**
 * Sets a sphere from a box3
 *
 * @param {sph3} out
 * @param {box3} b
 * @return {sph3} out
 */
sph3.fromBox3 = function(out, b)
{
    if (box3.isEmpty(b)) return sph3.empty(out);

    let sX = b[3] - b[0],
        sY = b[4] - b[1],
        sZ = b[5] - b[2];

    out[0] = (b[0] + b[3]) * 0.5;
    out[1] = (b[1] + b[4]) * 0.5;
    out[2] = (b[2] + b[5]) * 0.5;

    out[3] = Math.sqrt(sX * sX + sY * sY + sZ * sZ) * 0.5;
    return out;
};

/**
 * Sets a sphere from a box's bounds
 *
 * @param {sph3} out
 * @param {vec3} min
 * @param {vec3} max
 * @returns {sph3}
 */
sph3.fromBounds = function(out, min, max)
{
    let sX = max[0] - min[0],
        sY = max[1] - min[1],
        sZ = max[2] - min[2];

    out[0] = (min[0] + max[0]) * 0.5;
    out[1] = (min[1] + max[1]) * 0.5;
    out[2] = (min[2] + max[2]) * 0.5;

    out[3] = Math.sqrt(sX * sX + sY * sY + sZ * sZ) * 0.5;
    return out;
};

/**
 * Sets a sphere from position and radius
 *
 * @param {sph3} out
 * @param {vec3} p
 * @param {number} r
 * @returns {sph3} out
 */
sph3.fromPositionRadius = pln.fromNormalConstant;

sph3.from = sph3.fromPositionRadius;

/**
 * Sets a sphere from a mat4's translation and a given radius
 *
 * @param {sph3} out
 * @param {(mat4|vec3)} a
 * @param {number} radius
 * @returns {sph3} out
 */
sph3.fromTranslationRadius = function(out, a, radius)
{
    const offset = a.length >= 15 ? 12 : 0;
    out[0] = a[offset];
    out[1] = a[offset + 1];
    out[2] = a[offset + 2];
    out[3] = radius;
    return out;
};

/**
 * Gets a sphere from a mat4's translation and max axis scale
 *
 * @param {sph3} out
 * @param {mat4} m
 * @returns {sph3} out
 */
sph3.fromMat4 = function(out, m)
{
    out[0] = m[12];
    out[1] = m[13];
    out[2] = m[14];
    out[3] = mat4.maxScaleOnAxis(m);
    return out;
};

let aPosition,
    bPosition,
    toAPosition,
    toBPosition,
    center;

/**
 * Gets the union of two spheres
 * @param {sph3} out
 * @param {sph3} a
 * @param {sph3} b
 * @returns {sph3} out
 */
sph3.union = function(out, a, b)
{
    if (sph3.isEmpty(a)) return sph3.copy(out, b);
    if (sph3.isEmpty(b)) return sph3.copy(out, a);

    if (!aPosition)
    {
        aPosition = vec3.create();
        bPosition = vec3.create();
        toAPosition = vec3.create();
        toBPosition = vec3.create();
    }

    const
        aRadius = sph3.extract(a, aPosition),
        bRadius = sph3.extract(b, bPosition);

    vec3.subtract(toBPosition, bPosition, aPosition);
    const separation = vec3.length(toBPosition);

    if (aRadius >= separation + bRadius)
    {
        return out === a ? out : sph3.copy(out, a);
    }

    if (bRadius >= separation + aRadius)
    {
        return out === b ? out : sph3.copy(out, b);
    }

    if (!center) center = vec3.create();
    const halfDistance = (aRadius + separation + bRadius) * 0.5;
    vec3.scale(center, toBPosition, (-aRadius + halfDistance) / separation);
    vec3.add(center, aPosition, center);
    return sph3.fromPositionRadius(out, center, halfDistance);
};

/**
 * Gets the union of a sphere and a sphere's components
 * @param {sph3} out
 * @param {sph3} a
 * @param {vec3} position
 * @param {Number} radius
 * @returns {sph3}
 */
sph3.unionPositionRadius = function(out, a, position, radius)
{
    if (!sph3_0) sph3_0 = sph3.create();
    return sph3.union(out, a, sph3.fromPositionRadius(sph3_0, position, radius));
};

/**
 * Gets a point clamped to the sphere
 *
 * @author three.js authors (conversion)
 * @param {vec3} out
 * @param {sph3} a
 * @param {vec3} p
 * @returns {vec3} out
 */
sph3.getClampedPoint = function(out, a, p)
{
    out[0] = p[0];
    out[1] = p[1];
    out[2] = p[2];

    if (sph3.isEmpty(a)) return out;

    let x = a[0] - p[0],
        y = a[1] - p[1],
        z = a[2] - p[2];

    if ((x * x + y * y + z * z) > (a[3] * a[3]))
    {
        out[0] = out[0] - a[0];
        out[1] = out[1] - a[1];
        out[2] = out[2] - a[2];

        vec3.normalize(out, out);

        out[0] = out[0] * a[3] + a[0];
        out[1] = out[1] * a[3] + a[1];
        out[2] = out[2] * a[3] + a[2];
    }

    return out;
};

/**
 * Gets the position of a point on a sphere from longitude and latitude
 *
 * @param {vec3} out
 * @param {sph3} a
 * @param {number} longitude
 * @param {number} latitude
 * @returns {vec3} out
 */
sph3.getPointFromLongLat = function(out, a, longitude, latitude)
{
    out[0] = a[0] + a[3] * Math.sin(latitude) * Math.cos(longitude);
    out[1] = a[1] + a[3] * Math.sin(latitude) * Math.sin(longitude);
    out[2] = a[2] + a[3] * Math.cos(latitude);
    return out;
};

/**
 * Gets the position component of a sph3
 *
 * @param {vec3} out
 * @param {sph3} a
 * @returns {vec3} out
 */
sph3.getPosition = pln.getNormal;

/**
 * Checks for intersection between two sph3s
 *
 * @param {sph3} a
 * @param {sph3} b
 * @returns {boolean}
 */
sph3.intersectsSph3 = function(a, b)
{
    if (sph3.isEmpty(a) || sph3.isEmpty(b)) return false;

    let x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2];
    let radii = a[3] + b[3];

    return (x * x + y * y + z * z) <= (radii * radii);
};

/**
 * Checks for intersection with a box3
 *
 * @param {sph3} a
 * @param {box3} b
 * @returns {boolean}
 */
sph3.intersectsBox3 = function(a, b)
{
    return !sph3.isEmpty(a) && !box3.isEmpty(b) && box3.intersectsSph3(b, a);
};

/**
 * Checks sph for intersection with a boxes' bounds
 *
 * @param {sph3} a
 * @param {vec3} min
 * @param {vec3} max
 * @returns {boolean}
 */
sph3.intersectsBounds = function(a, min, max)
{
    if (sph3.isEmpty(a) || box3.bounds.isEmpty(min, max)) return false;

    let x = Math.max(min[0], Math.min(max[0], a[0])) - a[0],
        y = Math.max(min[1], Math.min(max[1], a[1])) - a[1],
        z = Math.max(min[2], Math.min(max[2], a[2])) - a[2];

    return (x * x + y * y + z * z) <= a[3] * a[3];
};

/**
 * Checks sph for intersection with a sphere's components
 *
 * @param {sph3} a
 * @param {vec3} p
 * @param {number} r
 * @returns {boolean}
 */
sph3.intersectsPositionRadius = function(a, p, r)
{
    if (sph3.isEmpty(a) || r < 0) return false;

    let x = p[0] - a[0],
        y = p[1] - a[1],
        z = p[2] - a[2];

    let radii = a[3] + r;
    return (x * x + y * y + z * z) <= (radii * radii);
};

/**
 * Checks for intersection with a Float32Array(4) plane
 *
 * @param {sph3} a
 * @param {pln} p
 * @returns {boolean}
 */
sph3.intersectsPln = function(a, p)
{
    return pln.intersectsSph3(p, a);
};

/**
 * Checks for intersection with a plane's components
 *
 * @param {sph3} a   - sphere to intersect
 * @param {vec3} n   - plane normal
 * @param {number} c - plane constant
 * @returns {boolean}
 */
sph3.intersectsNormalConstant = function(a, n, c)
{
    if (sph3.isEmpty(a)) return false;

    const
        distance = a[0] * n[0] + a[1] * n[1] + a[2] * n[2] + c,
        normalLength = Math.hypot(n[0], n[1], n[2]);
    return Math.abs(distance) <= a[3] * normalLength;
};

/**
 * Checks if a sph3 is empty
 *
 * @param {sph3} a
 * @returns {boolean}
 */
sph3.isEmpty = function(a)
{
    return a[3] < 0;
};

/**
 * Returns the radius component of the sph3
 *
 * @param {sph3} a
 * @returns {number}
 */
sph3.radius = pln.constant;

/**
 * Sets a sph3 from values
 *
 * @param {sph3} out
 * @param {number} px
 * @param {number} py
 * @param {number} pz
 * @param {number} r
 * @returns {sph3}
 */
sph3.set = vec4.set;

/**
 * Sets a sph3 from an array at an optional offset
 *
 * @param {sph3} out
 * @param {Array} arr
 * @param {number} [index=0]
 * @returns {sph3} out
 */
sph3.setArray = vec4.setArray;

/**
 * Sets a sphere from points, at an optional position vector
 *
 * @param {sph3} out        - the receiving sphere
 * @param {Array} points    - The points to create the sphere from
 * @param {vec3} [position] - An optional center position
 * @returns {sph3} out      - the receiving sphere
 */
sph3.setPoints = function(out, points, position)
{
    if (!points.length) return sph3.empty(out);

    if (!box3_0) box3_0 = box3.create();

    if (position)
    {
        out[0] = position[0];
        out[1] = position[1];
        out[2] = position[2];
    }
    else
    {
        box3.setPoints(box3_0, points);
        out[0] = (box3_0[0] + box3_0[3]) * 0.5;
        out[1] = (box3_0[1] + box3_0[4]) * 0.5;
        out[2] = (box3_0[2] + box3_0[5]) * 0.5;
    }

    let maxSquaredRadius = 0;

    for (let i = 0; i < points.length; i++)
    {
        let x = out[0] - points[i][0],
            y = out[1] - points[i][1],
            z = out[2] - points[i][2];

        maxSquaredRadius = Math.max(maxSquaredRadius, x * x + y * y + z * z);
    }

    out[3] = Math.sqrt(maxSquaredRadius);
    return out;
};

/**
 * Returns the squared distance between two sph3s
 *
 * @param {sph3} a
 * @param {sph3} b
 * @returns {number}
 */
sph3.squaredDistance = function(a, b)
{
    if (sph3.isEmpty(a) || sph3.isEmpty(b)) return Infinity;

    let x = b[0] - a[0],
        y = b[1] - a[1],
        z = b[2] - a[2],
        distance = Math.sqrt(x * x + y * y + z * z) - (b[3] + a[3]);

    return distance * distance;
};

/**
 * Returns the square distance from a sphere to a given point
 *
 * @param {sph3} a
 * @param {vec3} p
 * @returns {number}
 */
sph3.squaredDistanceToPoint = function(a, p)
{
    if (sph3.isEmpty(a)) return Infinity;

    let x = p[0] - a[0],
        y = p[1] - a[1],
        z = p[2] - a[2],
        distance = Math.sqrt(x * x + y * y + z * z) - a[3];

    return distance * distance;
};

/**
 * Sets an array at an optional offset, with the values of a sph3
 *
 * @param {sph3} a
 * @param {Array} arr
 * @param {number} [offset = 0]
 * @returns {sph3} a
 */
sph3.toArray = vec4.toArray;

/**
 * Converts a sphere to bounds
 *
 * @param {sph3} a
 * @param {vec3} minBounds
 * @param {vec3} maxBounds
 */
sph3.toBounds = function(a, minBounds, maxBounds)
{
    if (!box3_0) box3_0 = box3.create();
    box3.fromSph3(box3_0, a);
    box3.toBounds(box3_0, minBounds, maxBounds);
};

/**
 *
 * @param a
 * @param position
 * @returns {*}
 */
sph3.toPositionRadius = function(a, position)
{
    position[0] = a[0];
    position[1] = a[1];
    position[2] = a[2];
    return a[3];
};

/**
 * Transforms a sphere with a mat4
 *
 * @author three.js authors (conversion)
 * @param {sph3} out - the receiving sphere
 * @param {sph3} a   - the sphere to transform
 * @param {mat4} m   - the matrix to transform by
 * @returns {sph3}
 */
sph3.transformMat4 = function(out, a, m)
{
    if (sph3.isEmpty(a)) return sph3.empty(out);

    let x = a[0],
        y = a[1],
        z = a[2];

    let sX = m[0] * m[0] + m[1] * m[1] + m[2] * m[2],
        sY = m[4] * m[4] + m[5] * m[5] + m[6] * m[6],
        sZ = m[8] * m[8] + m[9] * m[9] + m[10] * m[10];

    out[0] = m[0] * x + m[4] * y + m[8] * z + m[12];
    out[1] = m[1] * x + m[5] * y + m[9] * z + m[13];
    out[2] = m[2] * x + m[6] * y + m[10] * z + m[14];

    out[3] = a[3] * Math.sqrt(Math.max(sX, sY, sZ));
    return out;
};

/**
 * Returns the result of a sphere translated by a given vector
 *
 * @param {sph3} out - the receiving sphere
 * @param {sph3} a   - the sphere to translate
 * @param {vec3} v   - the vector to translate with
 * @returns {sph3}
 */
sph3.translate = function(out, a, v)
{
    out[0] = a[0] + v[0];
    out[1] = a[1] + v[1];
    out[2] = a[2] + v[2];
    out[3] = a[3];
    return out;
};

export const {
    alloc,
    unalloc,
    $position,
    clone,
    containsPoint,
    copy,
    create,
    distance,
    distanceToPoint,
    empty,
    equals,
    equalsPositionRadius,
    exactEquals,
    exactEqualsPositionRadius,
    extract,
    fromBox3,
    fromBounds,
    fromPositionRadius,
    from,
    fromTranslationRadius,
    fromMat4,
    union,
    unionPositionRadius,
    getClampedPoint,
    getPointFromLongLat,
    getPosition,
    intersectsSph3,
    intersectsBox3,
    intersectsBounds,
    intersectsPositionRadius,
    intersectsPln,
    intersectsNormalConstant,
    isEmpty,
    radius,
    set,
    setArray,
    setPoints,
    squaredDistance,
    squaredDistanceToPoint,
    toArray,
    toBounds,
    toPositionRadius,
    transformMat4,
    translate
} = sph3;
