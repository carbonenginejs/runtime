import { CjsFormat } from "../../../format/CjsFormat.js";
const VARIANT = "fsd32";

/**
 * Reserved legacy FSD reader boundary.
 *
 * Legacy FSD has no self-describing outer header, so callers identify it with
 * `bitWidth: 32` (or `variant: "fsd32"`) after the normal extension route has
 * selected FSD. Reading is deliberately unsupported until a schema-driven
 * implementation lands in this directory.
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
     * Report the legacy layout's explicit unsupported status.
     *
     * @param {ArrayBuffer|ArrayBufferView|string} input Candidate bytes or path.
     * @param {object} [options={}] Caller format profile.
     * @param {number} [options.bitWidth] 32 selects the legacy layout.
     * @param {string} [options.variant] "fsd32" or "32" selects the legacy layout.
     * @returns {import("../64/CjsFsd64Format.js").CjsFsdSupportReport} Plain support report.
     */
    static probeSupport(input, options = {})
    {
        const identified = this.is(null, input, options);

        return {
            format: VARIANT,
            source: typeof input === "string" ? "path" : "buffer",
            recognized: identified,
            supported: false,
            reason: identified
                ? "Legacy 32-bit FSD was identified by the caller, but its reader is not implemented."
                : "Legacy FSD has no outer header and was not identified by the caller.",
            metadata: {
                family: "fsd",
                variant: identified ? VARIANT : null,
                bitWidth: identified ? 32 : null,
                decodable: false,
                identifiedBy: identified ? "caller" : null,
            },
        };
    }

    /**
     * Inspect caller-supplied legacy layout metadata.
     *
     * @param {ArrayBuffer|ArrayBufferView|string} input Candidate bytes or path.
     * @param {object} [options={}] Caller format profile, as for probeSupport.
     * @returns {import("../64/CjsFsd64Format.js").CjsFsdVariantMetadata} Legacy layout metadata.
     */
    static inspect(input, options = {})
    {
        return this.probeSupport(input, options).metadata;
    }

    /**
     * Reject legacy FSD decoding until its schema-driven reader exists.
     *
     * @param {unknown} _input Unused candidate input.
     * @param {object} [options={}] Caller format profile.
     * @param {string} [options.path] Source name recorded on the error.
     * @returns {never} Always throws the unsupported-layout error.
     * @throws {Error} Always, with `code` "CJS_FSD_32_UNSUPPORTED".
     */
    static read(_input, options = {})
    {
        const error = new Error(
            "Legacy 32-bit FSD is identified but not readable. "
            + "Its future schema-driven reader belongs in formats/fsd/32."
        );

        error.code = "CJS_FSD_32_UNSUPPORTED";
        error.variant = VARIANT;
        error.bitWidth = 32;
        error.path = options.path ?? null;
        throw error;
    }

    /**
     * Reject legacy FSD JSON decoding.
     *
     * @param {unknown} input Unused candidate input.
     * @param {object} [options={}] Caller format profile, as for read.
     * @returns {never} Always throws the unsupported-layout error.
     */
    static readJSON(input, options = {})
    {
        return this.read(input, options);
    }

    static id = "CjsFsd32Format";

    static extensions = [ ".fsdbinary" ];

    static outputs = {};
}

export default CjsFsd32Format;
