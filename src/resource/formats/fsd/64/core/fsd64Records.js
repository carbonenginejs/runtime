/** @typedef {import("./CjsFsd64Binary.js").CjsFsd64Binary} CjsFsd64Binary */

/**
 * Reads a required UTF-8 field and reports its logical field identity on failure.
 *
 * @param {CjsFsd64Binary} binary Container view.
 * @param {number} pointerOffset Absolute offset of the string pointer.
 * @param {string} path Logical resource path, for errors.
 * @param {string} field Field label, for errors.
 * @returns {string} The string.
 * @throws {Error} When the string is invalid.
 */
export function ReadRequiredString(binary, pointerOffset, path, field)
{
    const value = binary.Utf8StringAtDataPointer(binary.Uint64(pointerOffset));

    if (value === null)
    {
        const error = new Error(`Invalid FSD string for ${path} field ${field}.`);
        error.code = "CJS_FSD_STRING_INVALID";
        error.field = field;
        error.path = path;
        throw error;
    }

    return value;
}

/**
 * Rejects presence flags outside a reader's supported mask.
 *
 * @param {number} flags Presence flags read from the record.
 * @param {number} mask Supported flag bits.
 * @param {string} path Logical resource path, for errors.
 * @throws {Error} When a flag outside the mask is set.
 */
export function AssertFlags(flags, mask, path)
{
    if ((flags & ~mask) !== 0)
    {
        const error = new Error(`Unsupported FSD presence flags for ${path}: ${flags}`);
        error.code = "CJS_FSD_FLAGS_UNSUPPORTED";
        error.flags = flags;
        error.mask = mask;
        error.path = path;
        throw error;
    }
}
