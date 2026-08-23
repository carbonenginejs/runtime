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
    /**
     * Test whether the caller explicitly selected the legacy FSD layout.
     * @param {*} _input Unused candidate input.
     * @param {object} [options] Caller format profile.
     * @returns {boolean} True when legacy FSD was explicitly selected.
     */
    static is(_input, options = {})
    {
        return options.bitWidth === 32
            || options.variant === VARIANT
            || options.variant === "32";
    }

    /**
     * Report the legacy layout's explicit unsupported status.
     * @param {*|string} input Candidate input.
     * @param {object} [options] Caller format profile.
     * @returns {object} Plain support report.
     */
    static probeSupport(input, options = {})
    {
        const identified = this.is(input, options);

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
     * @param {*} input Candidate input.
     * @param {object} [options] Caller format profile.
     * @returns {object} Legacy layout metadata.
     */
    static inspect(input, options = {})
    {
        return this.probeSupport(input, options).metadata;
    }

    /**
     * Reject legacy FSD decoding until its schema-driven reader exists.
     * @param {*} _input Unused candidate input.
     * @param {object} [options] Caller format profile.
     * @returns {never} Always throws the unsupported-layout error.
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
     * @param {*} input Candidate input.
     * @param {object} [options] Caller format profile.
     * @returns {never} Always throws the unsupported-layout error.
     */
    static readJSON(input, options = {})
    {
        return this.read(input, options);
    }

    static id = VARIANT;
    static extensions = Object.freeze([ ".fsdbinary" ]);
    static mediaTypes = Object.freeze([ "data" ]);
    static outputs = Object.freeze({});
}

export default CjsFsd32Format;
