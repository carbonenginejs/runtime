import { asUint8Array } from "../../global/utils/bytes.js";
import { decompressGzip } from "../../global/utils/compression.js";

/**
 * Our storage adapter around an existing format. No formats are imported eagerly.
 * Configure graph read options with emit: values and write options with input: values.
 */
export class CjsStorageFormatCodec
{
    static className = "CjsStorageFormatCodec";
    id = "";
    version = 0;
    format = null;
    readOptions = null;
    writeOptions = null;
    graph = false;
    compression = null;

    /** The identity includes compression; readers register previous identities to retain compatibility. */
    constructor({ id, version = 1, format, readOptions = {}, writeOptions = {}, graph = false, compression = null })
    {
        if (!format || typeof format.read !== "function" || typeof format.write !== "function")
            throw new TypeError("Storage format codec requires format.read and format.write");
        if (compression !== null && compression !== "gzip") throw new TypeError("Unsupported storage compression");
        this.id = id;
        this.version = version;
        this.format = format;
        this.readOptions = readOptions;
        this.writeOptions = writeOptions;
        this.graph = graph;
        this.compression = compression;
    }

    /** Encode with the existing format, then optionally compress the resulting bytes. */
    async Encode(value)
    {
        const bytes = await this.format.write(value, this.writeOptions);
        return this.compression === "gzip" ? transform(bytes, new CompressionStream("gzip")) : bytes;
    }

    /** Decode before optional graph unwrapping; partial graph failures never masquerade as saved success. */
    async Decode(value)
    {
        const bytes = this.compression === "gzip" ? await decompressGzip(value) : value;
        const result = await this.format.read(bytes, this.readOptions);
        if (!this.graph) return result;
        if (result.reports.length) throw new Error(`Stored graph has ${result.reports.length} invalid members`);
        return result.root;
    }
}

/** Browser-standard streams also run in Node and workers; no DOM is needed. */
async function transform(bytes, stream)
{
    return asUint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}
