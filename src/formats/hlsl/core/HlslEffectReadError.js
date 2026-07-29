/**
 * Error raised when a Carbon/Trinity effect payload cannot be decoded safely.
 */
export class HlslEffectReadError extends Error
{
    /**
   * Creates an effect-read error with structured location details.
   *
   * @param {string} message Human-readable failure reason.
   * @param {object} [details] Extra reader state such as source, offset, or size.
   */
    constructor(message, details = {})
    {
        super(message);
        this.name = "HlslEffectReadError";
        this.details = details;
    }
}
