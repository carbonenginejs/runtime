/**
 * Carbon Plane — literal port of e:\carbonengine\math\include\Plane.h / Plane_inline.h
 *
 * Storage: Float32Array(4) = [ a, b, c, d ]
 *
 * @typedef {Float32Array} plane
 */

export const plane = {};

/**
 * Creates a plane (Carbon default constructor: a=b=c=d=0)  // Plane_inline.h:6
 * @returns {plane}
 */
plane.create = function ()
{
    return new Float32Array(4);
};

/**
 * Creates a plane from components  // Plane_inline.h:15
 * @param {Number} a
 * @param {Number} b
 * @param {Number} c
 * @param {Number} d
 * @returns {plane}
 */
plane.fromValues = function (a, b, c, d)
{
    const out = new Float32Array(4);
    out[0] = a;
    out[1] = b;
    out[2] = c;
    out[3] = d;
    return out;
};

/**
 * Copies a plane (Carbon copy construction / unary operator +)  // Plane_inline.h:45
 * @param {plane} out
 * @param {plane} p
 * @returns {plane}
 */
plane.copy = function (out, p)
{
    out[0] = p[0];
    out[1] = p[1];
    out[2] = p[2];
    out[3] = p[3];
    return out;
};

/**
 * Multiplies a plane by a scalar (operator *=, operator *, scale * plane)  // Plane_inline.h:24,57,82
 * @param {plane} out
 * @param {plane} p
 * @param {Number} scale
 * @returns {plane}
 */
plane.multiplyScalar = function (out, p, scale)
{
    out[0] = p[0] * scale;
    out[1] = p[1] * scale;
    out[2] = p[2] * scale;
    out[3] = p[3] * scale;
    return out;
};

/**
 * Divides a plane by a scalar via reciprocal multiply (operator /=, operator /)  // Plane_inline.h:34,63
 * @param {plane} out
 * @param {plane} p
 * @param {Number} div
 * @returns {plane}
 */
plane.divideScalar = function (out, p, div)
{
    const scale = 1.0 / div;
    out[0] = p[0] * scale;
    out[1] = p[1] * scale;
    out[2] = p[2] * scale;
    out[3] = p[3] * scale;
    return out;
};

/**
 * Negates a plane (unary operator -)  // Plane_inline.h:51
 * @param {plane} out
 * @param {plane} p
 * @returns {plane}
 */
plane.negate = function (out, p)
{
    out[0] = -p[0];
    out[1] = -p[1];
    out[2] = -p[2];
    out[3] = -p[3];
    return out;
};

/**
 * Exact equality (operator ==)  // Plane_inline.h:69
 * @param {plane} a
 * @param {plane} b
 * @returns {Boolean}
 */
plane.equals = function (a, b)
{
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
};

/**
 * Exact inequality (operator !=)  // Plane_inline.h:75
 * @param {plane} a
 * @param {plane} b
 * @returns {Boolean}
 */
plane.notEquals = function (a, b)
{
    return a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2] || a[3] !== b[3];
};

/**
 * Intersects a line (v1,v2) with the plane; returns Carbon's pair.first, writes pair.second to outPoint  // Plane_inline.h:88
 * On a parallel line returns false and writes (0,0,0), exactly as Carbon does.
 * @param {Float32Array} outPoint - vec3 receiving the intersection point
 * @param {plane} p
 * @param {Float32Array} v1 - vec3 line start
 * @param {Float32Array} v2 - vec3 line end
 * @returns {Boolean}
 */
plane.intersectLine = function (outPoint, p, v1, v2)
{
    const dirX = v2[0] - v1[0],
        dirY = v2[1] - v1[1],
        dirZ = v2[2] - v1[2];

    const dot = p[0] * dirX + p[1] * dirY + p[2] * dirZ;
    if (dot === 0.0)
    {
        outPoint[0] = 0;
        outPoint[1] = 0;
        outPoint[2] = 0;
        return false;
    }
    const temp = (p[3] + (p[0] * v1[0] + p[1] * v1[1] + p[2] * v1[2])) / dot;
    outPoint[0] = v1[0] - temp * dirX;
    outPoint[1] = v1[1] - temp * dirY;
    outPoint[2] = v1[2] - temp * dirZ;
    return true;
};

/**
 * Normalizes a plane by the length of its (a,b,c) normal  // Plane_inline.h:112
 * @param {plane} out
 * @param {plane} p
 * @returns {plane}
 */
plane.normalize = function (out, p)
{
    const l = 1.0 / Math.sqrt(p[0] * p[0] + p[1] * p[1] + p[2] * p[2]);
    out[0] = p[0] * l;
    out[1] = p[1] * l;
    out[2] = p[2] * l;
    out[3] = p[3] * l;
    return out;
};

/**
 * Dot of the plane with a coordinate (includes d)  // Plane_inline.h:123
 * @param {plane} p
 * @param {Float32Array} v - vec3
 * @returns {Number}
 */
plane.dotCoord = function (p, v)
{
    return p[0] * v[0] + p[1] * v[1] + p[2] * v[2] + p[3];
};

/**
 * Dot of the plane normal with a vector (excludes d)  // Plane_inline.h:129
 * @param {plane} p
 * @param {Float32Array} v - vec3
 * @returns {Number}
 */
plane.dotNormal = function (p, v)
{
    return p[0] * v[0] + p[1] * v[1] + p[2] * v[2];
};
