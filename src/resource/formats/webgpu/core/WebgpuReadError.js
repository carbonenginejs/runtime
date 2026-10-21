import { CjsSchema } from "#schema/CjsSchema";

/**
 * Error raised when a Carbon WebGPU package or WebGPU analysis pass cannot be
 * completed safely.
 */
export class WebgpuReadError extends Error
{
    name = "WebgpuReadError";

    /**
     * Extra reader state; set by the constructor.
     * @type {object}
     */
    details = {};

    /**
   * Creates a read/analysis error with structured location details.
   *
   * @param {string} message Human-readable failure reason.
   * @param {object} [details] Extra reader state such as source or offset.
   */
    constructor(message, details = {})
    {
        super(message);
        this.details = details;
    }
}

CjsSchema.meta.define("WebgpuReadError")(WebgpuReadError);
