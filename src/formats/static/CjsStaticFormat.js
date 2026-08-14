import { CjsPickleFormat } from "../pickle/index.js";

const SQLITE_SIGNATURE = "SQLite format 3\0";
const PICKLE_PREFIX_BYTES = 4;

/** Container families found behind the single `.static` extension. */
export const CJS_STATIC_FAMILIES = Object.freeze({
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
export class CjsStaticFormat
{

  /**
   * Describe one container without decoding it.
   *
   * @param {ArrayBuffer|ArrayBufferView} input Container bytes.
   * @returns {object} Family, payload offset, and whether this package decodes it.
   */
  static detect(input)
  {
    const bytes = Normalize(input);

    if (MatchesSqlite(bytes))
    {
      return Object.freeze({
        family: CJS_STATIC_FAMILIES.SQLITE,
        byteLength: bytes.byteLength,
        payloadOffset: 0,
        prefix: null,
        decodable: false,
        reason: "SQLite containers need a driver, which this package does not ship."
      });
    }

    if (MatchesPickle(bytes))
    {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

      return Object.freeze({
        family: CJS_STATIC_FAMILIES.PICKLE,
        byteLength: bytes.byteLength,
        payloadOffset: PICKLE_PREFIX_BYTES,
        prefix: view.getUint32(0, true),
        decodable: true,
        reason: null
      });
    }

    return Object.freeze({
      family: CJS_STATIC_FAMILIES.UNKNOWN,
      byteLength: bytes.byteLength,
      payloadOffset: 0,
      prefix: null,
      decodable: false,
      reason: "No signature. A schema-bound container needs its .schema companion, "
        + "which is YAML describing the layout."
    });
  }

  /**
   * Return the decodable payload for a container, without its wrapper.
   *
   * @param {ArrayBuffer|ArrayBufferView} input Container bytes.
   * @returns {Uint8Array} Payload bytes.
   */
  static payload(input)
  {
    const bytes = Normalize(input);
    const detected = this.detect(bytes);

    return bytes.subarray(detected.payloadOffset);
  }

  /**
   * Decode a container this package can read, or explain why it cannot.
   *
   * @param {ArrayBuffer|ArrayBufferView} input Container bytes.
   * @param {object} [options] Options forwarded to the underlying format.
   * @returns {*} Decoded value graph.
   */
  static read(input, options = {})
  {
    const bytes = Normalize(input);
    const detected = this.detect(bytes);

    if (detected.family === CJS_STATIC_FAMILIES.PICKLE)
    {
      return CjsPickleFormat.read(bytes.subarray(detected.payloadOffset), options);
    }

    if (detected.family === CJS_STATIC_FAMILIES.SQLITE)
    {
      // SQLite is readable anywhere given a driver: a WASM build opens these
      // bytes in a browser, and Node's own driver opens the file by path. The
      // driver is a dependency this package will not choose for its callers, so
      // it is injected rather than assumed absent.
      if (typeof options.sqlite === "function")
      {
        return options.sqlite(bytes);
      }

      const error = new TypeError(
        "Reading a SQLite .static container needs a driver. Pass options.sqlite "
        + "to open these bytes, or open the file by path with a driver of your own."
      );

      error.code = "CJS_STATIC_DRIVER_REQUIRED";
      error.family = detected.family;
      throw error;
    }

    const error = new TypeError(
      `Cannot read a ${detected.family} .static container: ${detected.reason}`
    );

    error.code = "CJS_STATIC_FAMILY_UNSUPPORTED";
    error.family = detected.family;
    throw error;
  }

}

function MatchesSqlite(bytes)
{
  if (bytes.byteLength < SQLITE_SIGNATURE.length) return false;

  for (let index = 0; index < SQLITE_SIGNATURE.length; index++)
  {
    if (bytes[index] !== SQLITE_SIGNATURE.charCodeAt(index)) return false;
  }

  return true;
}

function MatchesPickle(bytes)
{
  // A protocol-0 pickle opens a container then names it: "(dp1\n" or "(lp1\n".
  if (bytes.byteLength < PICKLE_PREFIX_BYTES + 3) return false;
  if (bytes[PICKLE_PREFIX_BYTES] !== 0x28) return false;

  const kind = bytes[PICKLE_PREFIX_BYTES + 1];

  return kind === 0x64 || kind === 0x6c;
}

function Normalize(input)
{
  if (input instanceof ArrayBuffer) return new Uint8Array(input);

  if (ArrayBuffer.isView(input))
  {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }

  const error = new TypeError("A .static container must be an ArrayBuffer or a view over one.");

  error.code = "CJS_STATIC_INPUT_INVALID";
  throw error;
}
