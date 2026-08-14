import { CjsPickleFormat } from '../pickle/CjsPickleFormat.js';

const SQLITE_SIGNATURE = "SQLite format 3\0";
const PICKLE_PREFIX_BYTES = 4;

/** Container families found behind the single `.static` extension. */
const CJS_STATIC_FAMILIES = Object.freeze({
  SQLITE: "sqlite",
  PICKLE: "pickle",
  UNKNOWN: "unknown"
});

/**
 * Identifies which container a client `.static` file actually holds.
 *
 * The extension names a role, not a format. Three unrelated containers ship
 * under it, and each fails in its own way when guessed at:
 *
 * - **SQLite 3** — a `cache(key, value, time)` plus `indexes(key, value)`
 *   database whose values are JSON documents. Readable anywhere given a
 *   driver: a WASM build opens these bytes in a browser and can persist the
 *   result to OPFS or IndexedDB, while Node's own driver opens the file by
 *   path. The driver is injected through `options.sqlite` rather than chosen
 *   here, because a format package should not pick its callers' dependencies.
 * - **Prefixed pickle** — a four-byte little-endian prefix followed by a
 *   protocol-0 pickle. Many of these carry class-construction opcodes, which
 *   the data-only pickle reader refuses by design; that refusal is correct and
 *   is surfaced rather than worked around.
 * - **Schema-bound** — a binary record container whose `.schema` companion is
 *   YAML describing its own layout: attribute sizes and types, optional flags,
 *   lists with a fixed item size, vectors with a precision, and a key footer of
 *   key-to-offset pairs. Nothing needs deriving, because the build ships the
 *   layout. Six datasets are stored this way, the celestial tables among them.
 *   Decoding them is not implemented here yet.
 *
 * Detection is signature-based and never executes or trusts file names.
 */
class CjsStaticFormat {
  /**
   * Report which family a container holds, on the declaration seam.
   *
   * `.static` declares nothing: the extension names a role and every family
   * wears it. The signature is therefore the only claim there is, which is why
   * this format reads it here rather than trusting a name.
   *
   * @param {ArrayBuffer|ArrayBufferView} input Container bytes.
   * @param {object} [options] Probe options.
   * @returns {CjsResourceProbe} Declaration-derived probe.
   */
  static isSupported(input, options = null) {
    return Probe(this.describe(input), false, options);
  }

  /**
   * Alias for canonical naming.
   *
   * @param {ArrayBuffer|ArrayBufferView} input Container bytes.
   * @param {object} [options] Probe options.
   * @returns {CjsResourceProbe} Declaration-derived probe.
   */
  static inspect(input, options = null) {
    return this.isSupported(input, options);
  }

  /**
   * Content-verified family resolution.
   *
   * Contract: docs/concepts/format-type-resolution.md. There is no declared
   * type to disagree with here — the extension is silent — so the signature is
   * both the claim and the evidence, and the resolution is always verified.
   * `preferred` names the decode route: this package's own for the pickle
   * family, a caller-supplied driver for SQLite, and none for a schema-bound
   * container until its companion is read.
   *
   * @param {ArrayBuffer|ArrayBufferView} input Container bytes.
   * @param {object} [options] Probe options.
   * @returns {Promise<CjsResourceProbe>} Verified probe.
   */
  static async resolveType(input, options = null) {
    return Probe(this.describe(input), true, options);
  }

  /**
   * Describe one container without decoding it or building a probe.
   *
   * @param {ArrayBuffer|ArrayBufferView} input Container bytes.
   * @returns {object} Family, payload offset, and whether this package decodes it.
   */
  static describe(input) {
    const bytes = Normalize(input);
    if (MatchesSqlite(bytes)) {
      return Object.freeze({
        family: CJS_STATIC_FAMILIES.SQLITE,
        byteLength: bytes.byteLength,
        payloadOffset: 0,
        prefix: null,
        // Capability here is not a property of the format. These bytes are
        // decodable given a driver the caller supplies, so `decodable` reports
        // what this package can do alone and `requires` names what closes the
        // gap. A boolean static cannot express that.
        decodable: false,
        requires: "sqlite",
        reason: "SQLite containers need a driver, which this package does not ship."
      });
    }
    if (MatchesPickle(bytes)) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      return Object.freeze({
        family: CJS_STATIC_FAMILIES.PICKLE,
        byteLength: bytes.byteLength,
        payloadOffset: PICKLE_PREFIX_BYTES,
        prefix: view.getUint32(0, true),
        decodable: true,
        requires: null,
        reason: null
      });
    }
    return Object.freeze({
      family: CJS_STATIC_FAMILIES.UNKNOWN,
      byteLength: bytes.byteLength,
      payloadOffset: 0,
      prefix: null,
      decodable: false,
      requires: "schema",
      reason: "No signature. A schema-bound container needs its .schema companion, " + "which is YAML describing the layout."
    });
  }

  /**
   * Return the decodable payload for a container, without its wrapper.
   *
   * @param {ArrayBuffer|ArrayBufferView} input Container bytes.
   * @returns {Uint8Array} Payload bytes.
   */
  static payload(input) {
    const bytes = Normalize(input);
    const detected = this.describe(bytes);
    return bytes.subarray(detected.payloadOffset);
  }

  /**
   * Decode a container this package can read, or explain why it cannot.
   *
   * @param {ArrayBuffer|ArrayBufferView} input Container bytes.
   * @param {object} [options] Options forwarded to the underlying format.
   * @returns {*} Decoded value graph.
   */
  static read(input, options = {}) {
    const bytes = Normalize(input);
    const detected = this.describe(bytes);
    if (detected.family === CJS_STATIC_FAMILIES.PICKLE) {
      return CjsPickleFormat.read(bytes.subarray(detected.payloadOffset), options);
    }
    if (detected.family === CJS_STATIC_FAMILIES.SQLITE) {
      // SQLite is readable anywhere given a driver: a WASM build opens these
      // bytes in a browser, and Node's own driver opens the file by path. The
      // driver is a dependency this package will not choose for its callers, so
      // it is injected rather than assumed absent.
      if (typeof options.sqlite === "function") {
        return options.sqlite(bytes);
      }
      const error = new TypeError("Reading a SQLite .static container needs a driver. Pass options.sqlite " + "to open these bytes, or open the file by path with a driver of your own.");
      error.code = "CJS_STATIC_DRIVER_REQUIRED";
      error.family = detected.family;
      throw error;
    }
    const error = new TypeError(`Cannot read a ${detected.family} .static container: ${detected.reason}`);
    error.code = "CJS_STATIC_FAMILY_UNSUPPORTED";
    error.family = detected.family;
    throw error;
  }
  static id = "static";
  static extensions = Object.freeze([".static"]);
  static type = Object.freeze(["data"]);
  static mediaTypes = Object.freeze(["data"]);

  /**
   * The extension is the only input this format claims.
   *
   * Naming the three families here would be a lie in the other direction: a
   * caller cannot hand this format "a pickle" or "a sqlite" and expect it to
   * route, because the whole point of the class is that `.static` declares
   * nothing and the signature has to be read. The family belongs in
   * `describe()`, which measures it, not in a static that asserts it.
   */
  static inputTypes = Object.freeze(["static"]);
  static outputTypes = Object.freeze(["json", "payload"]);
  static debugOutputTypes = Object.freeze(["raw"]);
}

/**
 * Build the shared probe payload.
 *
 * Formats report a plain probe-shaped object rather than constructing a
 * `CjsResourceProbe`, which keeps this module free of the decorated class and
 * of the build transform it needs.
 */
function Probe(detected, verified, options) {
  return {
    format: "static",
    source: "buffer",
    supported: detected.decodable ? "full" : "partial",
    confidence: detected.family === CJS_STATIC_FAMILIES.UNKNOWN ? 0.5 : 1,
    preferred: detected.family,
    verified,
    reason: detected.reason ?? `Recognized a ${detected.family} container.`,
    variants: [{
      kind: "container",
      codec: detected.family,
      supported: detected.decodable
    }],
    metadata: verified ? {
      ...detected,
      declared: null,
      resolved: detected.family,
      mismatch: false
    } : detected,
    ...(options || {})
  };
}
function MatchesSqlite(bytes) {
  if (bytes.byteLength < SQLITE_SIGNATURE.length) return false;
  for (let index = 0; index < SQLITE_SIGNATURE.length; index++) {
    if (bytes[index] !== SQLITE_SIGNATURE.charCodeAt(index)) return false;
  }
  return true;
}
function MatchesPickle(bytes) {
  // A protocol-0 pickle opens a container then names it: "(dp1\n" or "(lp1\n".
  if (bytes.byteLength < PICKLE_PREFIX_BYTES + 3) return false;
  if (bytes[PICKLE_PREFIX_BYTES] !== 0x28) return false;
  const kind = bytes[PICKLE_PREFIX_BYTES + 1];
  return kind === 0x64 || kind === 0x6c;
}
function Normalize(input) {
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  const error = new TypeError("A .static container must be an ArrayBuffer or a view over one.");
  error.code = "CJS_STATIC_INPUT_INVALID";
  throw error;
}

export { CJS_STATIC_FAMILIES, CjsStaticFormat };
//# sourceMappingURL=CjsStaticFormat.js.map
