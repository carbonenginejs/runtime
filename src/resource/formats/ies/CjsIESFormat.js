import { CjsFormat } from "../../format/CjsFormat.js";
import { readIes } from "./core/readIes.js";
import { bakeLightProfile } from "./core/bakeLightProfile.js";

/**
 * Reads IES photometric bytes into authored CPU data.
 * Supports the TILT=NONE form; profile conversion belongs to the consumer.
 */
export class CjsIESFormat extends CjsFormat
{
    /**
     * Reads bytes using this instance's defaults and per-call overrides.
     * @param {ArrayBuffer|ArrayBufferView} input IES file bytes.
     * @param {object} [options] Read options (source and emit).
     * @returns {object} Authored header, angles and candela values.
     */
    Read(input, options = {})
    {
        return this.constructor.read(input, { ...this.options, ...options });
    }

    /**
     * Inspects the file with this instance's options.
     * @param {ArrayBuffer|ArrayBufferView} input IES file bytes.
     * @param {object} [options] Read options.
     * @returns {object} Header and angle metadata, excluding candela values.
     */
    Inspect(input, options = {})
    {
        return this.constructor.inspect(input, { ...this.options, ...options });
    }

    /**
     * Decodes bytes without applying multipliers, normalization or resampling.
     * Candela values are horizontal-major: h * verticalAngleCount + v.
     * @param {ArrayBuffer|ArrayBufferView} input IES file bytes.
     * @param {object} [options] Optional source label and emit: "payload".
     * @returns {object} Plain, JSON-compatible authored photometric data.
     */
    static read(input, options = {})
    {
        if (options && options.emit === "lightProfile")
        {
            // Carbon's light-profile bake (Tr2LightProfileRes::ParseIes's
            // texture half): first horizontal slice, peak-normalized,
            // 1024-texel cosine-uniform R16F strip with an 11-level
            // half-quantized box mip chain, laid out mip-major.
            const { emit, ...rest } = options;
            return bakeLightProfile(readIes(input, rest));
        }
        return readIes(input, options);
    }

    /**
     * Validates the file and returns its header and angle tables.
     * @param {ArrayBuffer|ArrayBufferView} input IES file bytes.
     * @param {object} [options] Read options.
     * @returns {object} Metadata without the candela table.
     */
    static inspect(input, options = {})
    {
        const { candelaValues, ...metadata } = this.read(input, options);
        return metadata;
    }

    static id = "ies";
    static extensions = Object.freeze([ ".ies" ]);
    static mediaTypes = Object.freeze([ "data" ]);
    static outputs = Object.freeze(CjsFormat.defineOutputs({
        payload: { default: true, decoded: true },
        lightProfile: { decoded: true }
    }));
}

export default CjsIESFormat;
