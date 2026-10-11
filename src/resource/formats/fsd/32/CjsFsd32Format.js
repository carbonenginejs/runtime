import { CjsFormat } from "../../../format/CjsFormat.js";
import { BinaryLoader } from "./BinaryLoader.js";
import { FsdSchemaAttributes } from "./FsdSchema/FsdSchemaAttributes.js";

/** @typedef {import("../64/CjsFsd64Format.js").CjsFsdSupportReport} CjsFsdSupportReport */
/** @typedef {import("../64/CjsFsd64Format.js").CjsFsdVariantMetadata} CjsFsdVariantMetadata */
/** @typedef {import("./FsdSchema/FsdSchemaAttributes.js").FsdPySchema} FsdPySchema */

const VARIANT = "fsd32";
const OUTPUT_PAYLOAD = "payload";

/**
 * Legacy 32-bit FSD reader: Carbon's open-source `fsd` loader, ported in this
 * directory.
 *
 * Legacy FSD has no self-describing header, so callers identify it with
 * `bitWidth: 32` (or `variant: "fsd32"`) after the normal extension route has
 * selected FSD, and supply the binary schema as Carbon's loader expects it:
 * the Python schema dictionary, as a plain object, in `options.schema`.
 * `read` is Carbon's `LoadBinaryFromString(data, offset, schema, path)` and
 * returns what it returns: a scalar, string or component array, or a lazy
 * `FsdObject`, `FsdList`, `FsdDict` or `FsdVector`.
 *
 * Carbon's loader has no way to enumerate a dict's keys, so there is no JSON
 * or table output; those throw `CJS_FSD_32_UNSUPPORTED`.
 */
export class CjsFsd32Format extends CjsFormat
{
    /** Registered name; `constructor.name` does not survive minification. */
    static className = "CjsFsd32Format";

    /**
     * Test whether the caller explicitly selected the legacy FSD layout.
     *
     * @param {string|null} _filename Resource path; this format ignores it.
     * @param {unknown} _input Unused candidate input.
     * @param {object} [options={}] Caller format profile.
     * @param {number} [options.bitWidth] 32 selects the legacy layout.
     * @param {string} [options.variant] "fsd32" or "32" selects the legacy layout.
     * @returns {boolean} True when legacy FSD was explicitly selected.
     */
    static is(_filename, _input, options = {})
    {
        return options.bitWidth === 32
            || options.variant === VARIANT
            || options.variant === "32";
    }

    /**
     * Report whether the legacy layout was selected and can be read.
     *
     * Only the payload output is readable, and only with `options.schema`.
     *
     * @param {ArrayBuffer|ArrayBufferView|string} input Candidate bytes or path.
     * @param {object} [options={}] Caller format profile.
     * @param {number} [options.bitWidth] 32 selects the legacy layout.
     * @param {string} [options.variant] "fsd32" or "32" selects the legacy layout.
     * @param {FsdPySchema} [options.schema] Binary schema dictionary.
     * @returns {CjsFsdSupportReport} Plain support report.
     */
    static probeSupport(input, options = {})
    {
        const identified = this.is(null, input, options);
        const readable = identified && Boolean(options.schema);

        return {
            format: VARIANT,
            source: typeof input === "string" ? "path" : "buffer",
            recognized: identified,
            supported: readable,
            preferredOutput: readable ? OUTPUT_PAYLOAD : "",
            reason: !identified
                ? "Legacy FSD has no outer header and was not identified by the caller."
                : readable
                    ? "Legacy 32-bit FSD was identified by the caller and a binary schema was supplied."
                    : "Legacy 32-bit FSD was identified by the caller; reading requires options.schema.",
            variants: [
                { kind: OUTPUT_PAYLOAD, supported: readable, requires: readable ? [] : [ "schema" ] },
                { kind: "json", supported: false },
                { kind: "cjstables", supported: false },
            ],
            metadata: {
                family: "fsd",
                variant: identified ? VARIANT : null,
                bitWidth: identified ? 32 : null,
                decodable: readable,
                identifiedBy: identified ? "caller" : null,
            },
        };
    }

    /**
     * Inspect caller-supplied legacy layout metadata.
     *
     * @param {ArrayBuffer|ArrayBufferView|string} input Candidate bytes or path.
     * @param {object} [options={}] Caller format profile, as for probeSupport.
     * @returns {CjsFsdVariantMetadata} Legacy layout metadata.
     */
    static inspect(input, options = {})
    {
        return this.probeSupport(input, options).metadata;
    }

    /**
     * Decode the value at `options.offset` with Carbon's legacy loader.
     *
     * @param {ArrayBuffer|ArrayBufferView} input Legacy FSD bytes.
     * @param {object} [options={}] Caller format profile.
     * @param {FsdPySchema} [options.schema] Binary schema dictionary; required.
     * @param {number} [options.offset=0] Byte offset of the root value.
     * @param {string} [options.path] Logical path, used in nested paths and messages.
     * @param {string} [options.emit] Only the default payload output exists.
     * @returns {unknown} The decoded root value or lazy container.
     * @throws {Error} With code `CJS_FSD_32_UNSUPPORTED` for JSON or table output,
     * `CJS_FSD_32_SCHEMA_REQUIRED` without a schema, `CJS_FSD_INPUT_INVALID` for
     * non-byte input, `CJS_FSD_32_SCHEMA_INVALID` when the root type is unknown,
     * or a `CJS_FSD_32_*` Python error from the loader.
     */
    static read(input, options = {})
    {
        if (options.emit && options.emit !== OUTPUT_PAYLOAD)
        {
            throw FsdError(
                "CJS_FSD_32_UNSUPPORTED",
                `Legacy 32-bit FSD has no ${options.emit} output: Carbon's loader cannot enumerate dict keys.`,
                options,
            );
        }

        if (!options.schema)
        {
            throw FsdError("CJS_FSD_32_SCHEMA_REQUIRED", "Legacy 32-bit FSD reading requires options.schema.", options);
        }

        const data = NormalizeBytes(input, options);
        const schemaAttributes = new FsdSchemaAttributes();

        if (!FsdSchemaAttributes.createSchema(options.schema, schemaAttributes, 0))
        {
            throw FsdError(
                "CJS_FSD_32_SCHEMA_INVALID",
                `Legacy 32-bit FSD schema type '${schemaAttributes.schemaTypeAsString}' is not one Carbon's loader reads.`,
                options,
            );
        }

        return BinaryLoader.loadBinaryFromString(data, options.offset ?? 0, schemaAttributes, options.path ?? "");
    }

    /**
     * Reject legacy FSD JSON decoding: Carbon's loader cannot enumerate dict keys.
     *
     * @param {unknown} input Unused candidate input.
     * @param {object} [options={}] Caller format profile, as for read.
     * @returns {never} Always throws.
     * @throws {Error} With code `CJS_FSD_32_UNSUPPORTED`.
     */
    static readJSON(input, options = {})
    {
        return this.read(input, { ...options, emit: "json" });
    }

    static id = "CjsFsd32Format";

    static extensions = [ ".fsdbinary" ];

    static outputs = CjsFormat.defineOutputs({
        payload: { default: true, decoded: true, requires: [ "schema" ] },
    });
}

/**
 * Create a coded legacy FSD error.
 *
 * @param {string} code Error code.
 * @param {string} message Error message.
 * @param {object} options Caller options; `path` is recorded.
 * @returns {Error} The error.
 */
function FsdError(code, message, options)
{
    const error = new Error(message);

    error.code = code;
    error.variant = VARIANT;
    error.bitWidth = 32;
    error.path = options.path ?? null;
    return error;
}

/**
 * Normalize input bytes to a `Uint8Array` that keeps a view's offset.
 *
 * @param {unknown} input Candidate bytes.
 * @param {object} options Caller options, for the error path.
 * @returns {Uint8Array} The bytes.
 * @throws {TypeError} With code `CJS_FSD_INPUT_INVALID` for anything else.
 */
function NormalizeBytes(input, options)
{
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);

    const error = FsdError("CJS_FSD_INPUT_INVALID", "Legacy 32-bit FSD input must be an ArrayBuffer or ArrayBufferView.", options);
    Object.setPrototypeOf(error, TypeError.prototype);
    throw error;
}

export default CjsFsd32Format;
