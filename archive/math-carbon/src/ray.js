/**
 * Carbon Ray — literal port of e:\carbonengine\math\include\Ray.h / Ray_inline.h
 *
 * Storage: Float32Array(6) = [ originX, originY, originZ, directionX, directionY, directionZ ]
 * Carbon's Ray is a plain aggregate (origin, direction) with no methods beyond construction.
 *
 * @typedef {Float32Array} ray
 */

export const ray = {};

/**
 * Creates a ray (Carbon default constructor: zero origin and direction)  // Ray.h:12
 * @returns {ray}
 */
ray.create = function ()
{
    return new Float32Array(6);
};

/**
 * Creates a ray from components (Ray(origin, direction))  // Ray_inline.h:7
 * @param {Number} ox
 * @param {Number} oy
 * @param {Number} oz
 * @param {Number} dx
 * @param {Number} dy
 * @param {Number} dz
 * @returns {ray}
 */
ray.fromValues = function (ox, oy, oz, dx, dy, dz)
{
    const out = new Float32Array(6);
    out[0] = ox;
    out[1] = oy;
    out[2] = oz;
    out[3] = dx;
    out[4] = dy;
    out[5] = dz;
    return out;
};

/**
 * Sets a ray from origin and direction vec3s (Ray(origin, direction))  // Ray_inline.h:7
 * @param {ray} out
 * @param {Float32Array} origin - vec3
 * @param {Float32Array} direction - vec3
 * @returns {ray}
 */
ray.fromOriginDirection = function (out, origin, direction)
{
    out[0] = origin[0];
    out[1] = origin[1];
    out[2] = origin[2];
    out[3] = direction[0];
    out[4] = direction[1];
    out[5] = direction[2];
    return out;
};

/**
 * Copies a ray
 * @param {ray} out
 * @param {ray} r
 * @returns {ray}
 */
ray.copy = function (out, r)
{
    out[0] = r[0];
    out[1] = r[1];
    out[2] = r[2];
    out[3] = r[3];
    out[4] = r[4];
    out[5] = r[5];
    return out;
};
