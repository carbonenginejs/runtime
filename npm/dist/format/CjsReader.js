/**
 * Internal base for construction-bound readers.
 *
 * A reader instance is created for one source and normally used and dropped.
 * JavaScript garbage collection reclaims its parser and graph state, so readers
 * do not require `dispose()` or `clear()` for correctness. This differs from
 * native Blue readers such as `BlackReader`, whose cleanup releases manually
 * allocated buffers and refcounted maps. Subclasses retain ownership of their
 * source-specific state and reset behavior.
 */
class CjsReader {
  constructor(options = {}) {
    this.options = options;
  }
}

export { CjsReader };
//# sourceMappingURL=CjsReader.js.map
