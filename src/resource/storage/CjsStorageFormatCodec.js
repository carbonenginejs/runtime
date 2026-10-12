import { asUint8Array } from "../../global/utils/bytes.js";
import { decompressGzip } from "../../global/utils/compression.js";

/**
 * Our storage codec around an existing format. The format is injected, so no
 * reader is imported eagerly. Configure graph formats with `readOptions` that
 * emit values and `writeOptions` that take values as input.
 *
 * The codec identity covers compression: register previous identities to keep
 * reading older records. Graph reads unwrap `{ root, reports }` and refuse any
 * reported error, so a partly invalid graph never reads back as a saved value.
 */
export class CjsStorageFormatCodec
{
    static className = "CjsStorageFormatCodec";

    /** @type {string} Codec id, stored with each record. */
    id = "";

    /** @type {number} Codec revision. */
    version = 0;

    /** @type {{read: Function, write: Function}|null} The format doing the encoding. */
    format = null;

    /** @type {object|null} Options passed to `format.read`. */
    readOptions = null;

    /** @type {object|null} Options passed to `format.write`. */
    writeOptions = null;

    /** @type {boolean} Whether reads return `{ root, reports }` to unwrap. */
    graph = false;

    /** @type {"gzip"|null} Compression applied after encoding. */
    compression = null;

    /**
     * Wrap a format.
     *
     * @param {object} options Codec options.
     * @param {string} options.id Codec id.
     * @param {number} [options.version] Codec revision; defaults to 1.
     * @param {{read: Function, write: Function}} options.format A format with `read(bytes, options)` and `write(value, options)`.
     * @param {object} [options.readOptions] Options for `format.read`.
     * @param {object} [options.writeOptions] Options for `format.write`.
     * @param {boolean} [options.graph] Unwrap a graph read result.
     * @param {"gzip"|null} [options.compression] Optional compression.
     * @throws {TypeError} When no format is given, or the compression is unknown.
     */
    constructor({ id, version = 1, format, readOptions = {}, writeOptions = {}, graph = false, compression = null })
    {
        if (!format) throw new TypeError("Storage format codec requires a format");
        if (compression !== null && compression !== "gzip") throw new TypeError("Unsupported storage compression");

        this.id = id;
        this.version = version;
        this.format = format;
        this.readOptions = readOptions;
        this.writeOptions = writeOptions;
        this.graph = graph;
        this.compression = compression;
    }

    /**
     * Encode with the format, then optionally compress the bytes.
     *
     * @param {*} value The value to encode.
     * @returns {Promise<Uint8Array|*>} The encoded bytes.
     */
    async Encode(value)
    {
        const bytes = await this.format.write(value, this.writeOptions);
        if (this.compression !== "gzip") return bytes;

        return transform(bytes, new CompressionStream("gzip"));
    }

    /**
     * Decompress if needed, decode with the format, then unwrap a graph result.
     *
     * @param {Uint8Array|*} value The stored bytes.
     * @returns {Promise<*>} The decoded value.
     * @throws {Error} When a graph read reports invalid members.
     */
    async Decode(value)
    {
        const bytes = this.compression === "gzip" ? await decompressGzip(value) : value;
        const result = await this.format.read(bytes, this.readOptions);
        if (!this.graph) return result;

        if (result.reports.length) throw new Error(`Stored graph has ${result.reports.length} invalid members`);
        return result.root;
    }
}

/**
 * Pipe bytes through a transform stream. Browser-standard streams also run in
 * Node and workers; no DOM is needed.
 *
 * @param {Uint8Array} bytes Input bytes.
 * @param {TransformStream} stream The transform.
 * @returns {Promise<Uint8Array>} Output bytes.
 */
async function transform(bytes, stream)
{
    const response = new Response(new Blob([bytes]).stream().pipeThrough(stream));
    return asUint8Array(await response.arrayBuffer());
}
