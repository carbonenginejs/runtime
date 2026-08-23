/**
 * Error raised when DirectX shader bytecode cannot be decoded safely.
 */
export class DxbcReadError extends Error
{
    /**
   * Creates a bytecode-read error with structured location details.
   *
   * @param {string} message Human-readable failure reason.
   * @param {object} [details] Extra reader state such as source, offset, or size.
   */
    constructor(message, details = {})
    {
        super(message);
        this.name = "DxbcReadError";
        this.details = details;
    }
}
