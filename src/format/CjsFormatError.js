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
