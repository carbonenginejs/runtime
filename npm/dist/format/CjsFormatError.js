/**
 * Error raised when shared binary format bytes cannot be decoded safely.
 *
 * Format-specific readers substitute their own error class through the
 * `ReadError` static on `CjsByteReader`, so this type is the fallback for
 * readers that do not need a distinguishable name.
 */
class CjsFormatReadError extends Error {
  /**
   * Creates a read error with structured reader-state details.
   *
   * @param {string} message Human-readable failure reason.
   * @param {object} [details] Extra reader state such as source, offset, or size.
   */
  constructor(message, details = {}) {
    super(message);
    this.name = "CjsFormatReadError";
    this.details = details;
  }
}

export { CjsFormatReadError };
//# sourceMappingURL=CjsFormatError.js.map
