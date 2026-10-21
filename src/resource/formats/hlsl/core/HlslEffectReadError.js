import { CjsSchema } from "#schema/CjsSchema";

/**
 * Error raised when a Carbon/Trinity effect payload cannot be decoded safely.
 */
export class HlslEffectReadError extends Error
{
    name = "HlslEffectReadError";

    /**
     * Extra reader state; set by the constructor.
     * @type {object}
     */
    details = {};

    /**
   * Creates an effect-read error with structured location details.
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

CjsSchema.meta.define("HlslEffectReadError")(HlslEffectReadError);
