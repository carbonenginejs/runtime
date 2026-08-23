import { CjsFormat } from "../../../format/CjsFormat.js";
import { CjsFsd64Binary } from "./core/CjsFsd64Binary.js";

const VARIANT = "cfsd64";
const OUTPUT_JSON = "json";
const OUTPUT_PAYLOAD = "payload";

/** Identifies and dispatches modern 64-bit cFSD containers. */
export class CjsFsd64Format extends CjsFormat
{
    static describe(input, options = {})
    {
        const binary = new CjsFsd64Binary(input, { path: options.path });

        return Object.freeze({
            family: "fsd",
            variant: VARIANT,
            bitWidth: 64,
            headerSize: binary.RootOffset,
            byteLength: binary.ByteLength,
            payloadLength: binary.PayloadLength,
            layoutID: binary.LayoutID,
            schemaID: binary.SchemaID,
            decodable: true,
        });
    }

    static is(input)
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

    static probeSupport(input, options = {})
    {
        try
        {
            const metadata = this.describe(input, options);
            const reader = options.reader ?? options.registry;
            const canReadPayload = typeof reader?.Read === "function";
            const canReadJson = typeof reader?.ReadJSON === "function";

            return {
                format: VARIANT,
                source: typeof input === "string" ? "path" : "buffer",
                recognized: true,
                supported: canReadPayload || canReadJson,
                preferredOutput: canReadPayload ? OUTPUT_PAYLOAD : canReadJson ? OUTPUT_JSON : "",
                reason: canReadPayload || canReadJson
                    ? "Recognized modern 64-bit cFSD and found a reader for the dataset layout."
                    : "Recognized modern 64-bit cFSD; decoding requires options.reader or options.registry.",
                variants: [
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

    static inspect(input, options = {})
    {
        return this.describe(input, options);
    }

    static read(input, options = {})
    {
        // Validate the format before selecting a dataset layout so malformed
        // modern bytes never surface as a misleading missing-reader failure.
        this.describe(input, options);

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

    static readJSON(input, options = {})
    {
        return this.read(input, { ...options, emit: OUTPUT_JSON });
    }

    static id = VARIANT;
    static extensions = Object.freeze([ ".fsdbinary" ]);
    static mediaTypes = Object.freeze([ "data" ]);
    static outputs = CjsFormat.defineOutputs({
        payload: { default: true, decoded: true },
        json: { decoded: true }
    });
}

export default CjsFsd64Format;
