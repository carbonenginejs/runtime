const PRINTABLE_ASCII_TAG = /^[\x20-\x7e]{4}$/u;

/**
 * Validate one four-byte printable ASCII CEWGPU chunk tag.
 *
 * @param {string} tag Candidate chunk tag.
 * @returns {string} The validated tag.
 */
export function validateCewgpuChunkTag(tag)
{
    if (typeof tag !== "string" || !PRINTABLE_ASCII_TAG.test(tag))
    {
        throw new Error(`CEWGPU chunk tag must be four printable ASCII characters: ${tag}`);
    }

    return tag;
}
