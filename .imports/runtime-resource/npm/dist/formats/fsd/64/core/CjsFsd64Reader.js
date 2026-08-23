/**
 * Dispatches caller-supplied bytes to an explicitly registered FSD reader.
 *
 * This class deliberately performs no filesystem, network, provider, build,
 * or resource-index work.
 */
class CjsFsd64Reader {
  #readers = new Map();

  /**
   * Registers one approved file-specific reader by logical path.
   */
  Register(path, reader, options = {}) {
    const key = NormalizeReaderKey(path);
    const implementation = NormalizeReader(reader);
    if (this.#readers.has(key) && options.replace !== true) {
      const error = new Error(`FSD reader is already registered: ${key}`);
      error.code = "CJS_FSD_READER_EXISTS";
      error.path = key;
      throw error;
    }
    this.#readers.set(key, implementation);
    return this;
  }

  /**
   * Removes a reader without affecting any caller-owned bytes or data.
   */
  Remove(path) {
    return this.#readers.delete(NormalizeReaderKey(path));
  }

  /**
   * Reports whether an exact file-specific reader is registered.
   */
  Has(path) {
    return this.#readers.has(NormalizeReaderKey(path));
  }

  /**
   * Lists registered logical paths in deterministic order.
   */
  List() {
    return [...this.#readers.keys()].sort();
  }

  /**
   * Reads caller-supplied bytes with the reader registered for options.path.
   */
  async Read(input, options = {}) {
    const path = NormalizeReaderKey(options.path);
    const reader = this.#readers.get(path);
    if (!reader) {
      const error = new Error(`No FSD reader is registered for: ${path}`);
      error.code = "CJS_FSD_READER_NOT_FOUND";
      error.path = path;
      throw error;
    }
    const bytes = NormalizeBytes(input);
    return reader.Read(bytes, {
      ...options,
      path
    });
  }

  /**
   * Reads caller-supplied bytes as a plain JSON-compatible value through the
   * schema-backed reader registered for options.path.
   */
  async ReadJSON(input, options = {}) {
    const path = NormalizeReaderKey(options.path);
    const reader = this.#readers.get(path);
    if (!reader) {
      const error = new Error(`No FSD reader is registered for: ${path}`);
      error.code = "CJS_FSD_READER_NOT_FOUND";
      error.path = path;
      throw error;
    }
    if (typeof reader.ReadJSON !== "function") {
      const error = new Error(`FSD reader does not expose JSON decoding: ${path}`);
      error.code = "CJS_FSD_JSON_READER_INVALID";
      error.path = path;
      throw error;
    }
    const bytes = NormalizeBytes(input);
    return reader.ReadJSON(bytes, {
      ...options,
      path
    });
  }
}

/**
 * Produces a stable registry key without importing resource-source policy.
 */
function NormalizeReaderKey(value) {
  if (typeof value !== "string" || value.trim() === "") {
    const error = new TypeError("FSD reader path must be a non-empty string.");
    error.code = "CJS_FSD_PATH_INVALID";
    throw error;
  }
  return value.trim().replaceAll("\\", "/").toLowerCase();
}

/**
 * Accepts object readers and function shorthand while storing one contract.
 */
function NormalizeReader(value) {
  if (typeof value === "function") {
    return {
      Read: value
    };
  }
  if (!value || typeof value.Read !== "function") {
    const error = new TypeError("FSD reader must be a function or expose Read(bytes, context).");
    error.code = "CJS_FSD_READER_INVALID";
    throw error;
  }
  return value;
}

/**
 * Creates a byte view over accepted binary inputs without copying or mutation.
 */
function NormalizeBytes(input) {
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  const error = new TypeError("FSD input must be an ArrayBuffer or an ArrayBuffer view.");
  error.code = "CJS_FSD_INPUT_INVALID";
  throw error;
}

export { CjsFsd64Reader };
//# sourceMappingURL=CjsFsd64Reader.js.map
