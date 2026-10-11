// Source: fsd/FsdDictOffsetLookup.h

/** @typedef {import("./FooterOffsetSize.js").FooterOffsetSize} FooterOffsetSize */

/**
 * Carbon's `OFFSET_LOOKUP_RESULT` enumeration (FsdDictOffsetLookup.h:17-22).
 *
 * @enum {number}
 */
export const OFFSET_LOOKUP_RESULT = Object.freeze({
    OFFSET_LOOKUP_OK: 0,
    OFFSET_LOOKUP_ERROR_KEY_NOT_PRESENT: 1,
    OFFSET_LOOKUP_ERROR_INVALID_KEY: 2,
    OFFSET_LOOKUP_ERROR_NOT_IMPLEMENTED: 3,
});

/**
 * The key-to-offset index of one legacy FSD dict (FsdDictOffsetLookup.h:24-33).
 *
 * Carbon's abstract base; `createFsdDictOffsetLookup` picks the subclass from
 * the key schema type.
 */
export class FsdDictOffsetLookup
{
    /**
     * Find a key's value offset and size.
     *
     * @param {unknown} key Lookup key.
     * @param {FooterOffsetSize} fos Filled on success, as Carbon's out parameter is.
     * @returns {number} One of {@link OFFSET_LOOKUP_RESULT}.
     * @throws {Error} Always here; Carbon declares it pure virtual.
     */
    GetOffsetAndSize(key, fos)
    {
        throw new Error("FsdDictOffsetLookup.GetOffsetAndSize is pure virtual.");
    }

    /**
     * Test whether a key is present.
     *
     * @param {unknown} key Lookup key.
     * @returns {boolean} True when present.
     * @throws {Error} Always here; Carbon declares it pure virtual.
     */
    Contains(key)
    {
        throw new Error("FsdDictOffsetLookup.Contains is pure virtual.");
    }

    /** Registered name; `constructor.name` does not survive minification. */
    static className = "FsdDictOffsetLookup";

    /** Carbon's `OFFSET_LOOKUP_RESULT`, owned by this class. */
    static OFFSET_LOOKUP_RESULT = OFFSET_LOOKUP_RESULT;
}

export default FsdDictOffsetLookup;
