import {
    GL_BYTE,
    GL_UNSIGNED_BYTE,
    GL_SHORT,
    GL_UNSIGNED_SHORT,
    GL_INT,
    GL_UNSIGNED_INT,
    GL_FLOAT
} from "../consts/constants.js";

// A LIVE ESM binding, deliberately. gl-matrix reassigns this when a consumer
// calls `setMatrixArrayType`, and an ESM import reflects that reassignment,
// so the pool keeps following it rather than capturing the type at load.
import { ARRAY_TYPE } from "gl-matrix/esm/common.js";


function loop(n, f)
{
    const result = Array(n);
    for (let i = 0; i < n; ++i) result[i] = f(i);
    return result;
}

function nextPow16(v)
{
    for (let i = 16; i <= (1 << 28); i *= 16)
    {
        if (v <= i) return i;
    }
    return 0;
}

function log2(v)
{
    let r, shift;
    r = (v > 0xFFFF) << 4;
    v >>>= r;
    shift = (v > 0xFF) << 3;
    v >>>= shift;
    r |= shift;
    shift = (v > 0xF) << 2;
    v >>>= shift;
    r |= shift;
    shift = (v > 0x3) << 1;
    v >>>= shift;
    r |= shift;
    return r | (v >> 1);
}

/** Creates a reusable typed-array pool for a supported graphics scalar type. */
export function createPool()
{

    const bufferPool = loop(8, function ()
    {
        return [];
    });

    function free(buf)
    {
        bufferPool[log2(buf.byteLength) >> 2].push(buf);
    }

    function alloc(n)
    {
        let sz = nextPow16(n),
            bin = bufferPool[log2(sz) >> 2];

        if (bin.length > 0) return bin.pop();

        return new ArrayBuffer(sz);
    }

    /**
     * Shortcut to allocating an array of gl-matrix's own scalar type.
     *
     * The name says F32 and in every environment we ship it IS Float32Array,
     * because that is what `glMatrix.ARRAY_TYPE` defaults to. But gl-matrix owns
     * that choice and exposes `setMatrixArrayType` to change it, so hardcoding
     * the type here is a real defect: `vec3.alloc()` would hand back a narrower
     * array than `vec3.create()` the moment anything overrode it, and every
     * pooled temporary in the math tree would silently round. Following
     * `ARRAY_TYPE` is what makes a pooled vector interchangeable with a created
     * one. Inherited from ccpwgl, where the same hardcoding is still present.
     *
     * @param {Number} length
     * @returns {Float32Array|Float64Array} gl-matrix's scalar type.
     */
    function allocF32(length)
    {
        // gl-matrix falls back to plain `Array` only where Float32Array does not
        // exist, which cannot happen anywhere this runs; the pool hands out views
        // over a shared ArrayBuffer, so it needs a real typed array either way.
        const
            ScalarArray = ARRAY_TYPE.BYTES_PER_ELEMENT ? ARRAY_TYPE : Float32Array,
            result = new ScalarArray(alloc(ScalarArray.BYTES_PER_ELEMENT * length), 0, length);

        return result.length !== length ? result.subarray(0, length) : result;
    }

    /**
     * Allocated a typed array of a given size
     * @param {Number|Function}type
     * @param {Number} n
     * @returns {Int8Array|Uint8Array|Int16Array|Uint16Array|Int32Array|Uint32Array|Float32Array|null}
     */
    function allocType(type, n)
    {
        let result = null;
        switch (type)
        {
            case GL_BYTE:
            case Int8Array:
                result = new Int8Array(alloc(n), 0, n);
                break;

            case GL_UNSIGNED_BYTE:
            case Uint8Array:
                result = new Uint8Array(alloc(n), 0, n);
                break;

            case GL_SHORT:
            case Int16Array:
                result = new Int16Array(alloc(2 * n), 0, n);
                break;

            case GL_UNSIGNED_SHORT:
            case Uint16Array:
                result = new Uint16Array(alloc(2 * n), 0, n);
                break;

            case GL_INT:
            case Int32Array:
                result = new Int32Array(alloc(4 * n), 0, n);
                break;

            case GL_UNSIGNED_INT:
            case Uint32Array:
                result = new Uint32Array(alloc(4 * n), 0, n);
                break;

            case GL_FLOAT:
            case Float32Array:
                result = new Float32Array(alloc(4 * n), 0, n);
                break;

            default:
                return null;
        }

        if (result.length !== n)
        {
            return result.subarray(0, n);
        }

        return result;
    }

    function freeType(array)
    {
        free(array.buffer);
    }

    return {
        allocF32,
        allocType,
        unalloc: freeType,
        freeType,
        free
    };

}

export const pool = createPool();

export const {
    allocF32,
    allocType,
    unalloc,
    freeType,
    free
} = pool;
