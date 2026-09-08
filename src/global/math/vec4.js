import * as glVec4 from "gl-matrix/esm/vec4.js";
import { pool } from "./pool.js";

const vec4 = { ...glVec4 };

/**
 * Vector 4
 * @typedef {Float32Array} vec4
 */


/**
 * Allocates a pooled vec4
 * @returns {Float32Array|vec4}
 */
vec4.alloc = function()
{
    return pool.allocF32(4);
};

/**
 * Unallocates a pooled vec4
 * @param {vec4|Float32Array} a
 */
vec4.unalloc = function(a)
{
    pool.freeType(a);
};

vec4.ZERO = vec4.fromValues(0, 0, 0, 0);

/**
 * Adds a scalar to a vec4
 *
 * @param {vec4} out
 * @param {vec4} a
 * @param {Number} s
 * @returns {vec4} out
 */
vec4.addScalar = function(out, a, s)
{
    out[0] = a[0] + s;
    out[1] = a[1] + s;
    out[2] = a[2] + s;
    out[3] = a[3] + s;
    return out;
};

/**
 * Checks if all elements are 0
 * @param {vec4} a
 * @returns {boolean}
 */
vec4.isEmpty = function(a)
{
    return a[0] === 0 && a[1] === 0 && a[2] === 0 && a[3] === 0;
};

/**
 * Divides a vec4 by a scalar
 *
 * @param {vec4} out
 * @param {vec4} a
 * @param {Number} s
 * @returns {vec4} out
 */
vec4.divideScalar = function(out, a, s)
{
    return vec4.multiplyScalar(out, a, 1 / s);
};


/**
 * Multiplies a vec4 by a scalar
 *
 * @param {vec4} out
 * @param {vec4} a
 * @param {Number} s
 * @returns {vec4} out
 */
vec4.multiplyScalar = function(out, a, s)
{
    out[0] = a[0] * s;
    out[1] = a[1] * s;
    out[2] = a[2] * s;
    out[3] = a[3] * s;
    return out;
};

/**
 * Sets a vec4 from a scalar
 *
 * @param {vec4} out
 * @param {Number} s
 * @returns {vec4} out
 */
vec4.setScalar = function(out, s)
{
    out[0] = s;
    out[1] = s;
    out[2] = s;
    out[3] = s;
    return out;
};

/**
 * Subtracts a scalar from a vec4
 *
 * @param {vec4} out
 * @param {vec4} a
 * @param {Number} s
 * @returns {vec4} out
 */
vec4.subtractScalar = function(out, a, s)
{
    out[0] = a[0] - s;
    out[1] = a[1] - s;
    out[2] = a[2] - s;
    out[3] = a[3] - s;
    return out;
};

/**
 * Sets a vec4 from an array with an optional offset
 * @param {vec3} out
 * @param {TypedArray|Array} array
 * @param {Number} [offset=0]
 * @returns {vec3} out
 */
vec4.fromArray = function(out, array, offset=0)
{
    out[0] = array[offset];
    out[1] = array[offset + 1];
    out[2] = array[offset + 2];
    out[3] = array[offset + 3];
    return out;
};

vec4.setArray = vec4.fromArray;

/**
 * Writes a vec4 to an array at an optional offset.
 * @param {vec4} a
 * @param {TypedArray|Array} array
 * @param {Number} [offset=0]
 * @returns {vec4} a
 */
vec4.toArray = function(a, array, offset=0)
{
    array[offset] = a[0];
    array[offset + 1] = a[1];
    array[offset + 2] = a[2];
    array[offset + 3] = a[3];
    return a;
};


export { vec4 };

export const {
    add,
    ceil,
    clone,
    copy,
    create,
    cross,
    dist,
    distance,
    div,
    divide,
    dot,
    equals,
    exactEquals,
    floor,
    forEach,
    fromValues,
    inverse,
    len,
    length,
    lerp,
    max,
    min,
    mul,
    multiply,
    negate,
    normalize,
    random,
    round,
    scale,
    scaleAndAdd,
    set,
    sqrDist,
    sqrLen,
    squaredDistance,
    squaredLength,
    str,
    sub,
    subtract,
    transformMat4,
    transformQuat,
    zero,
    alloc,
    unalloc,
    ZERO,
    addScalar,
    isEmpty,
    divideScalar,
    multiplyScalar,
    setScalar,
    subtractScalar,
    fromArray,
    setArray,
    toArray
} = vec4;
