/**
 * Error raised when DirectX shader bytecode cannot be decoded safely.
 */
export class DxbcReadError extends Error
{
    /** Stable name independent of minification; no registry is required. */
    static className = "DxbcReadError";

    name = "DxbcReadError";

    /**
     * Extra reader state; set by the constructor.
     * @type {object}
     */
    details = {};

    /**
   * Creates a bytecode-read error with structured location details.
   *
   * @param {string} message Human-readable failure reason.
   * @param {object} [details] Extra reader state such as source, offset, or size.
   */
    constructor(message, details = {})
    {
        super(message);
        this.details = details;
    }
}
