import { CjsSchema } from "#schema/CjsSchema";

// Source: fsd/FsdUnsignedIntegerKeyMap.cpp
import { BinaryLoaderHelper } from "./BinaryLoaderHelper.js";
import { PyErr_SetString, PyExc, PyLong_AsLong } from "./pyErr.js";

/** Bytes per `KeyOffsetSize` record: key, offset and size, each `unsigned`. */
const KEY_OFFSET_SIZE = 12;

/**
 * A `uint32_t`-keyed table of (offset, size) pairs built from packed
 * `KeyOffsetSize` records (FsdUnsignedIntegerKeyMap.cpp).
 *
 * Carbon's Python type exposes `length()`, `Get(key)`, `len()`, indexing and
 * iteration. `length()` and `Get()` are the same methods here; `len(d)` is
 * `length()` and `d[key]` is `Get(key)`. Iteration follows the Python type:
 * the map is its own iterator, sharing one cursor, which rewinds after it is
 * exhausted. Pairs come back as arrays where Python returns tuples.
 */
export class FsdUnsignedIntegerKeyMap
{
    /** @type {Map<number, {offset: number, size: number}>} Offset and size by key. */
    _lookup = new Map();

    /** @type {Iterator<[number, {offset: number, size: number}]>} The shared iteration cursor. */
    _cur = this._lookup.entries();

    /**
     * Index packed records (FsdUnsignedIntegerKeyMap.cpp:28-66).
     *
     * Leading bytes that do not fill a whole record are skipped, which drops
     * a 32-bit length prefix. Without data the map is empty. A key that
     * repeats keeps its last record.
     *
     * @param {ArrayBuffer|ArrayBufferView} [bytes] Packed records.
     * @throws {Error} TypeError when `bytes` is not a bytes-like object.
     */
    constructor(bytes)
    {
        if (bytes === undefined) return;

        if (!(bytes instanceof ArrayBuffer) && !ArrayBuffer.isView(bytes))
        {
            PyErr_SetString(PyExc.TypeError, "a bytes-like object is required");
        }

        const data = bytes instanceof ArrayBuffer
            ? new Uint8Array(bytes)
            : new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const size = Math.floor(data.byteLength / KEY_OFFSET_SIZE);
        const start = data.byteLength % KEY_OFFSET_SIZE;
        const view = BinaryLoaderHelper.getDataView(data);

        for (let i = 0; i < size; i++)
        {
            const position = data.byteOffset + start + i * KEY_OFFSET_SIZE;

            this._lookup.set(view.getUint32(position, true), {
                offset: view.getUint32(position + 4, true),
                size: view.getUint32(position + 8, true),
            });
        }

        this._cur = this._lookup.entries();
    }

    /**
     * Return the entry count (FsdUnsignedIntegerKeyMap.cpp:77-84).
     *
     * @returns {number} The count.
     */
    length()
    {
        return this._lookup.size;
    }

    /**
     * Return a key's (offset, size) (FsdUnsignedIntegerKeyMap.cpp:86-102).
     *
     * The key converts as `PyLong_AS_LONG` and is cast to `unsigned`, so -1
     * finds key 0xFFFFFFFF. Both values come back through `Py_BuildValue("i")`,
     * so values of 2^31 and above read as negative.
     *
     * @param {number|bigint|boolean} key Integer key.
     * @returns {Array<number>} `[offset, size]` as signed 32-bit integers.
     * @throws {Error} IndexError when the key is absent; TypeError when it is not an integer.
     */
    Get(key)
    {
        const index = PyLong_AsLong(key);
        const unsignedKey = typeof index === "bigint" ? Number(BigInt.asUintN(32, index)) : index >>> 0;
        const f = this._lookup.get(unsignedKey);

        if (f === undefined) PyErr_SetString(PyExc.IndexError, "Index out of range");
        return [ f.offset | 0, f.size | 0 ];
    }

    /**
     * Advance the shared cursor (FsdUnsignedIntegerKeyMap.cpp:104-115).
     *
     * At the end the cursor rewinds, so the next iteration starts over.
     *
     * @returns {IteratorResult<[number, Array<number>]>} `[key, [offset, size]]`, all as signed 32-bit integers.
     */
    next()
    {
        const entry = this._cur.next();

        if (entry.done)
        {
            this._cur = this._lookup.entries();
            return { done: true, value: undefined };
        }

        const [ key, value ] = entry.value;
        return { done: false, value: [ key | 0, [ value.offset | 0, value.size | 0 ] ] };
    }

    /**
     * Return this map as its own iterator, as `PyObject_SelfIter` does.
     *
     * @returns {FsdUnsignedIntegerKeyMap} This map.
     */
    [Symbol.iterator]()
    {
        return this;
    }

    /** Registered name; `constructor.name` does not survive minification. */
    static className = "FsdUnsignedIntegerKeyMap";
}

export default FsdUnsignedIntegerKeyMap;

CjsSchema.blue.define(FsdUnsignedIntegerKeyMap, { className: "FsdUnsignedIntegerKeyMap" });
