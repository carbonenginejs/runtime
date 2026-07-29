/**
 * Error raised when a CEWG package or a DXBC-to-GLSL emission cannot be
 * completed safely.
 *
 * This package has no dependency on `@carbonenginejs/format-dxbc`'s internal
 * `DxbcReadError` class (that package only exports its public `CjsDxbcFormat`
 * boundary). Emitter/package failures raised from this package's own code
 * use this class instead, while thrown messages that document a specific
 * failure mode (see README/tests) are kept identical to their origin in
 * `hlslreader`.
 */
class WebglReadError extends Error {
  /**
  * Creates a read/emit error with structured location details.
  *
  * @param {string} message Human-readable failure reason.
  * @param {object} [details] Extra reader state such as source, offset, or opcode.
  */
  constructor(message, details = {}) {
    super(message);
    this.name = "WebglReadError";
    this.details = details;
  }
}

export { WebglReadError };
//# sourceMappingURL=errors.js.map
