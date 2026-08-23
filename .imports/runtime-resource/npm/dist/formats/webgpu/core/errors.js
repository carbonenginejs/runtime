/**
 * Error raised when a Carbon WebGPU package or WebGPU analysis pass cannot be
 * completed safely.
 */
class WebgpuReadError extends Error {
  /**
  * Creates a read/analysis error with structured location details.
  *
  * @param {string} message Human-readable failure reason.
  * @param {object} [details] Extra reader state such as source or offset.
  */
  constructor(message, details = {}) {
    super(message);
    this.name = "WebgpuReadError";
    this.details = details;
  }
}

export { WebgpuReadError };
//# sourceMappingURL=errors.js.map
