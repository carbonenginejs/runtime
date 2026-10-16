import { CjsSchema } from "#schema/CjsSchema";

// Source: fsd/FsdDictOffsetLookup.h
// Source: fsd/FsdDictOffsetLookup.cpp
import { BinaryLoaderHelper } from "../BinaryLoaderHelper.js";
import { PyLong_AsLong } from "../pyErr.js";
import { FooterOffsetSize } from "./FooterOffsetSize.js";
import { FsdDictOffsetLookup, OFFSET_LOOKUP_RESULT } from "./FsdDictOffsetLookup.js";

/**
 * Hash index for a dict keyed by `uint32_t` or `int32_t`
 * (FsdDictOffsetLookup.h:38-50, FsdDictOffsetLookup.cpp:8-98).
 *
 * Footer layout: a `uint32_t` count, then per entry the key, a `uint32_t`
 * offset and, when the footer records sizes, a `uint32_t` size
 * (`KeyedFooterOffset` / `KeyedFooterOffsetWithSize`, 8 or 12 bytes).
 *
 * Adapted: Carbon is a template over the key type and also stores the
 * `struct` format character "I" or "i" it is given, without reading it. JS
 * has no templates, so that character selects the key type here.
 */
export class FastLoadingHashedOffsetLookup extends FsdDictOffsetLookup
{
    /** @type {Map<number, FooterOffsetSize>} Offset and size by key. */
    _hash = new Map();

    /** @type {string} "I" for `uint32_t` keys, "i" for `int32_t`. */
    _keyConverter = "I";

    /**
     * Index every footer entry.
     *
     * @param {Uint8Array} footerData The dict's key footer.
     * @param {string} keyConverter "I" for `uint32_t` keys, "i" for `int32_t`.
     * @param {boolean} hasSize True when entries carry a size.
     */
    constructor(footerData, keyConverter, hasSize)
    {
        super();
        this._keyConverter = keyConverter;

        const view = BinaryLoaderHelper.getDataView(footerData);
        const dictLength = BinaryLoaderHelper.getUnsignedIntFromData(footerData, 0);
        const stride = hasSize ? 12 : 8;
        const signed = keyConverter === "i";

        for (let i = 0; i < dictLength; i++)
        {
            const position = footerData.byteOffset + i * stride + 4;
            const key = signed ? view.getInt32(position, true) : view.getUint32(position, true);
            const fos = new FooterOffsetSize();

            fos.offset = view.getUint32(position + 4, true);
            fos.size = hasSize ? view.getUint32(position + 8, true) | 0 : -1;
            this._hash.set(key, fos);
        }
    }

    /**
     * Find a key's value offset and size (FsdDictOffsetLookup.cpp:61-77).
     *
     * The key converts as `PyLong_AsLong` and is then cast to the key type.
     *
     * @param {number|bigint|boolean} key Lookup key.
     * @param {FooterOffsetSize} fos Filled on success.
     * @returns {number} One of {@link OFFSET_LOOKUP_RESULT}.
     */
    GetOffsetAndSize(key, fos)
    {
        const convertedKey = this._ConvertKey(key);
        if (convertedKey === undefined) return OFFSET_LOOKUP_RESULT.OFFSET_LOOKUP_ERROR_INVALID_KEY;

        const findResult = this._hash.get(convertedKey);
        if (findResult === undefined) return OFFSET_LOOKUP_RESULT.OFFSET_LOOKUP_ERROR_KEY_NOT_PRESENT;

        fos.offset = findResult.offset;
        fos.size = findResult.size;
        return OFFSET_LOOKUP_RESULT.OFFSET_LOOKUP_OK;
    }

    /**
     * Test whether a key is present (FsdDictOffsetLookup.cpp:79-98).
     *
     * @param {unknown} key Lookup key.
     * @returns {boolean} True when present; false for a key that is not an integer.
     */
    Contains(key)
    {
        const convertedKey = this._ConvertKey(key);
        if (convertedKey === undefined) return false;

        return this._hash.has(convertedKey);
    }

    /**
     * Convert a key as `KEY_TYPE convertedKey(PyLong_AsLong(key))` does.
     *
     * Adapted: Carbon detects a failed conversion with `PyErr_Occurred`; this
     * returns undefined.
     *
     * @param {unknown} key Lookup key.
     * @returns {number|undefined} The key as `uint32_t` or `int32_t`, or undefined when it does not convert.
     */
    _ConvertKey(key)
    {
        let value;
        try
        {
            value = PyLong_AsLong(key);
        }
        catch
        {
            return undefined;
        }

        if (typeof value === "bigint")
        {
            return this._keyConverter === "i" ? Number(BigInt.asIntN(32, value)) : Number(BigInt.asUintN(32, value));
        }

        return this._keyConverter === "i" ? value | 0 : value >>> 0;
    }

    /** Registered name; `constructor.name` does not survive minification. */
    static className = "FastLoadingHashedOffsetLookup";
}

export default FastLoadingHashedOffsetLookup;

CjsSchema.blue.define(FastLoadingHashedOffsetLookup, { className: "FastLoadingHashedOffsetLookup" });
