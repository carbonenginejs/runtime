/**
 * Error raised when shared binary format bytes cannot be decoded safely.
 *
 * Format-specific readers substitute their own error class through the
 * `ReadError` static on `CjsByteReader`, so this type is the fallback for
 * readers that do not need a distinguishable name.
 */
export class CjsFormatReadError extends Error
{
    /**
     * Creates a read error with structured reader-state details.
     *
     * @param {string} message Human-readable failure reason.
     * @param {object} [details] Extra reader state such as source, offset, or size.
     */
    constructor(message, details = {})
    {
        super(message);
        this.name = "CjsFormatReadError";
        this.code = "CJS_FORMAT_READ_ERROR";
        this.details = details;
    }
}

/**
 * Error raised when a read would run past the end of its source.
 *
 * SEPARATE FROM `CjsFormatReadError`, AND THE REASON IS ITS BASE CLASS. Running
 * off the end of a buffer is a `RangeError` — the platform already has a name
 * for it, `DataView` already throws it, and a format reader that hand-rolls its
 * bounds check should not lose that identity by throwing a plain `Error`.
 *
 * The distinction is not decorative. A container reader answers a truncated
 * OBJECT by returning null and letting its caller skip that object, while a
 * genuinely semantic failure — "this block declares a type it was not parsed as"
 * — must propagate. Several BNK parsers already sort those two apart with
 * `error instanceof RangeError` (`bnk/core/eventAction.js:320`,
 * `bnk/core/globalSettings.js:59`), which is why their cursors could not simply
 * be rebased onto the shared one: it threw the wrong lineage and a malformed
 * object would have escaped as an exception instead of being skipped.
 *
 * So: bounds violations are this type. `CjsFormatReadError` keeps everything
 * that is wrong about the CONTENT rather than about the extent.
 */
export class CjsFormatRangeError extends RangeError
{
    /**
     * Creates a bounds error with structured reader-state details.
     *
     * @param {string} message Human-readable failure reason.
     * @param {object} [details] Extra reader state such as source, offset, or size.
     */
    constructor(message, details = {})
    {
        super(message);
        this.name = "CjsFormatRangeError";
        this.code = "CJS_FORMAT_RANGE_ERROR";
        this.details = details;
    }
}

/**
 * Error raised when shared binary format bytes cannot be encoded safely.
 */
export class CjsFormatWriteError extends Error
{
    /**
     * Creates a write error with structured writer-state details.
     *
     * @param {string} message Human-readable failure reason.
     * @param {object} [details] Extra writer state such as offset or value.
     */
    constructor(message, details = {})
    {
        super(message);
        this.name = "CjsFormatWriteError";
        this.code = "CJS_FORMAT_WRITE_ERROR";
        this.details = details;
    }
}

export default CjsFormatReadError;
