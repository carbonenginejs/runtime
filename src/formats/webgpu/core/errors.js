/**
 * Error raised when a CEWGPU package or WebGPU analysis pass cannot be
 * completed safely.
 */
export class WebgpuReadError extends Error
{
    /**
   * Creates a read/analysis error with structured location details.
   *
   * @param {string} message Human-readable failure reason.
   * @param {object} [details] Extra reader state such as source or offset.
   */
    constructor(message, details = {})
    {
        super(message);
        this.name = "WebgpuReadError";
        this.details = details;
    }
}
