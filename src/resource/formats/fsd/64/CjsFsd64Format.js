import { CjsSchema } from "#schema/CjsSchema";

import { CjsFormat } from "../../../format/CjsFormat.js";
import { CjsFsd64Binary } from "./core/CjsFsd64Binary.js";

import { CjsFsd64SchemaDecoder } from "./core/CjsFsd64SchemaDecoder.js";
import { CjsTableData } from "../../../format/CjsTableData.js";

const VARIANT = "cfsd64";
const OUTPUT_JSON = "json";
const OUTPUT_PAYLOAD = "payload";

/**
 * FSD variant metadata. Modern containers fill every field; the legacy and failed-probe forms carry
 * nulls and omit the container fields.
 *
 * @typedef {object} CjsFsdVariantMetadata
 * @property {string} family Always "fsd".
 * @property {string|null} variant "cfsd64", "fsd32", or null when unidentified.
 * @property {number|null} bitWidth 64, 32, or null when unidentified.
 * @property {boolean} decodable True when a reader can decode this variant.
 * @property {string|null} [identifiedBy] "caller" when the legacy layout was selected by options.
 * @property {number} [headerSize] Container header byte size.
 * @property {number} [byteLength] Container byte length.
 * @property {number} [payloadLength] Declared payload byte length.
 * @property {string} [layoutID] 32-character layout identity.
 * @property {string} [schemaID] 48-character schema identity.
 */

/**
 * Plain FSD support report returned by `probeSupport`.
 *
 * @typedef {object} CjsFsdSupportReport
 * @property {string} format Variant name, "cfsd64" or "fsd32".
 * @property {string} source "path" for a string input, "buffer" otherwise.
 * @property {boolean} recognized True when the variant was recognized.
 * @property {boolean} supported True when an output can be decoded.
 * @property {string} [preferredOutput] "payload", "json", or "" when nothing is readable.
 * @property {string} reason Human-readable explanation.
 * @property {Array<{kind: string, supported: boolean, requires?: Array<string>}>} [variants] Per-output support.
 * @property {CjsFsdVariantMetadata} metadata Variant metadata.
 */

/** Identifies and dispatches modern 64-bit cFSD containers. */
export class CjsFsd64Format extends CjsFormat
{
    /** Registered name; `constructor.name` does not survive minification. */
    static className = "CjsFsd64Format";

    /**
     * Describe a validated modern cFSD envelope.
     *
     * @param {ArrayBuffer|ArrayBufferView} input Container bytes.
     * @param {object} [options={}] Inspection options.
     * @param {string} [options.path] Source name used in errors.
     * @returns {CjsFsdVariantMetadata} Container metadata.
     */
    static describe(input, options = {})
    {
        const binary = new CjsFsd64Binary(input, { path: options.path });

        return {
            family: "fsd",
            variant: VARIANT,
            bitWidth: 64,
            headerSize: binary.RootOffset,
            byteLength: binary.ByteLength,
            payloadLength: binary.PayloadLength,
            layoutID: binary.LayoutID,
            schemaID: binary.SchemaID,
            decodable: true,
        };
    }

    /**
     * Test whether bytes contain a valid modern cFSD envelope.
     *
     * @param {string|null} _filename Resource path; this format ignores it.
     * @param {ArrayBuffer|ArrayBufferView} input Candidate bytes.
     * @returns {boolean} True when the envelope is valid.
     */
    static is(_filename, input)
    {
        try
        {
            this.describe(input);
            return true;
        }
        catch
        {
            return false;
        }
    }

    /**
     * Report recognition and available dataset-reader outputs.
     *
     * @param {ArrayBuffer|ArrayBufferView|string} input Candidate input.
     * @param {object} [options={}] Probe and reader options.
     * @param {string} [options.path] Source name used in errors.
     * @param {{Read?: Function, ReadJSON?: Function}} [options.reader] Dataset reader.
     * @param {{Read?: Function, ReadJSON?: Function}} [options.registry] Dataset reader registry, used when reader is absent.
     * @returns {CjsFsdSupportReport} Plain support report.
     */
    static probeSupport(input, options = {})
    {
        try
        {
            const metadata = this.describe(input, options);
            const reader = options.reader ?? options.registry;
            // Host feature check: the FSD reader is supplied by the host application.
            const canReadPayload = Boolean(options.schema) || typeof reader?.Read === "function";
            const canReadJson = Boolean(options.schema) || typeof reader?.ReadJSON === "function";

            return {
                format: VARIANT,
                source: typeof input === "string" ? "path" : "buffer",
                recognized: true,
                supported: canReadPayload || canReadJson,
                preferredOutput: canReadPayload ? OUTPUT_PAYLOAD : canReadJson ? OUTPUT_JSON : "",
                reason: canReadPayload || canReadJson
                    ? "Recognized modern 64-bit cFSD and found a reader for the dataset layout."
                    : "Recognized modern 64-bit cFSD; decoding requires options.schema, options.reader or options.registry.",
                variants: [
                    { kind: "cjstables", supported: Boolean(options.schema), requires: options.schema ? [] : [ "schema" ] },
                    { kind: OUTPUT_PAYLOAD, supported: canReadPayload, requires: canReadPayload ? [] : [ "reader.Read" ] },
                    { kind: OUTPUT_JSON, supported: canReadJson, requires: canReadJson ? [] : [ "reader.ReadJSON" ] }
                ],
                metadata,
            };
        }
        catch (error)
        {
            return {
                format: VARIANT,
                source: typeof input === "string" ? "path" : "buffer",
                recognized: false,
                supported: false,
                reason: error?.message ?? "The input is not a modern cFSD container.",
                variants: [
                    { kind: OUTPUT_PAYLOAD, supported: false },
                    { kind: OUTPUT_JSON, supported: false }
                ],
                metadata: {
                    family: "fsd",
                    variant: null,
                    bitWidth: null,
                    decodable: false,
                },
            };
        }
    }

    /**
     * Inspect a modern cFSD container.
     *
     * @param {ArrayBuffer|ArrayBufferView} input Container bytes.
     * @param {object} [options={}] Inspection options.
     * @param {string} [options.path] Source name used in errors.
     * @returns {CjsFsdVariantMetadata} Container metadata.
     */
    static inspect(input, options = {})
    {
        return this.describe(input, options);
    }

    /**
     * Decode a modern cFSD container with the supplied dataset reader.
     *
     * @param {ArrayBuffer|ArrayBufferView} input Container bytes.
     * @param {object} [options={}] Reader and output options, passed on to the reader.
     * @param {string} [options.path] Source name used in errors.
     * @param {{Read?: Function, ReadJSON?: Function}} [options.reader] Dataset reader.
     * @param {{Read?: Function, ReadJSON?: Function}} [options.registry] Dataset reader registry, used when reader is absent.
     * @param {string} [options.emit] "cjstables", "json", or native "payload".
     * @param {object} [options.schema] Inert dataset schema, required for table/worker decoding.
     * @returns {unknown} The reader's decoded payload or JSON value.
     * @throws {TypeError} When no reader exposes the selected method.
     */
    static read(input, options = {})
    {
        // Validate the format before selecting a dataset layout so malformed
        // modern bytes never surface as a misleading missing-reader failure.
        this.describe(input, options);

        if (options.emit === "cjstables")
        {
            const result = new CjsTableData(options.metadata ?? {});
            for (const batch of this.readBatches(input, options)) result.Append(batch);
            return result.GetValues();
        }
        if (options.schema)
        {
            return options.emit === OUTPUT_JSON
                ? CjsFsd64SchemaDecoder.readJSON(input, options.schema)
                : CjsFsd64SchemaDecoder.read(input, options.schema);
        }
        const reader = options.reader ?? options.registry;
        const method = options.emit === OUTPUT_JSON ? "ReadJSON" : "Read";

        if (!reader || typeof reader[method] !== "function")
        {
            const error = new TypeError(
                `Modern cFSD ${method} requires options.reader or options.registry exposing ${method}().`
            );

            error.code = "CJS_FSD_READER_REQUIRED";
            error.method = method;
            throw error;
        }

        return reader[method](input, options);
    }

    /**
     * Decode a modern cFSD container to JSON-compatible values.
     *
     * @param {ArrayBuffer|ArrayBufferView} input Container bytes.
     * @param {object} [options={}] Reader options, as for read.
     * @returns {unknown} The reader's JSON-compatible value.
     */
    static readJSON(input, options = {})
    {
        return this.read(input, { ...options, emit: OUTPUT_JSON });
    }

    /**
     * Decode bounded native table batches from an inert schema. Schemas can be
     * posted to workers; live reader instances and registries cannot.
     * @param {ArrayBuffer|ArrayBufferView} input Container bytes.
     * @param {object} options Inert schema, optional name, metadata and batchSize.
     * @returns {Generator<object>} Plain cjstables documents.
     */
    static *readBatches(input, options)
    {
        const { schema, name = schema?.name ?? "records", metadata = {}, batchSize = 256 } = options;
        if (!schema) throw new TypeError("FSD table output requires an inert options.schema");
        if (!Number.isSafeInteger(batchSize) || batchSize < 1) throw new RangeError("Batch size must be positive");
        let batch = new CjsTableData(metadata).AddTable(name);
        let count = 0;
        let total = 0;
        for (const [key, value] of CjsFsd64SchemaDecoder.entries(input, schema))
        {
            batch.Add(name, key, value);
            total++;
            if (++count === batchSize)
            {
                yield batch.GetValues();
                batch = new CjsTableData(metadata).AddTable(name);
                count = 0;
            }
        }
        if (count || total === 0) yield batch.GetValues();
    }

    static worker = { module: import.meta.url, exportName: "CjsFsd64Format", outputTypes: [ "payload", "json", "cjstables" ], defaultOutput: "payload" };

    static id = "CjsFsd64Format";

    static extensions = [ ".fsdbinary" ];

    static outputs = CjsFormat.defineOutputs({
        payload: { default: true, decoded: true },
        json: { decoded: true },
        cjstables: { decoded: true, requires: [ "schema" ] }
    });
}

export default CjsFsd64Format;

CjsSchema.meta.define(CjsFsd64Format, { className: "CjsFsd64Format" });
