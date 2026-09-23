import { asUint8Array } from "#utils/bytes";
import { CjsFormat } from "../../format/CjsFormat.js";
import { CjsGeometryFormat } from "../../format/CjsGeometryFormat.js";
/**
 * Exposed CarbonEngineJS-facing glTF/GLB format class.
 *
 * Keep this file small and reviewable: glTF parsing, accessor decoding,
 * mesh conversion, skin conversion, animation conversion, and geometry helper
 * glue live under src/core.
 */

import {
    CLASS_KEYS,
    DEFAULT_VALUES,
    OUTPUT_CMF,
    OUTPUT_GLTF_JSON,
    OUTPUT_GR2,
    OUTPUT_JSON,
    OUTPUT_SHARED,
    inspectWithValues,
    isGlb,
    normalizeValues,
    readWithValues,
    toJsonValue,
} from "./core/helpers.js";

const FORMAT_NAME = "CjsGltfFormat";

/**
 * glTF/GLB format class that parses documents, decodes accessors, and converts
 * meshes, skins, and animations into shared-mesh, GR2, or CMF output plus debug
 * JSON.
 *
 * The Cjs prefix marks this as a JavaScript format/construction boundary.
 * glTF is the import source; the default public read contract is the shared
 * CarbonEngineJS mesh, skeleton, and animation graph. JSON is an explicit
 * debug/output projection rather than an intermediate format contract.
 */
export class CjsGltfFormat extends CjsGeometryFormat
{

    _emit = DEFAULT_VALUES.emit;
    _source = DEFAULT_VALUES.source;
    _buffers = DEFAULT_VALUES.buffers;
    _packTangents = DEFAULT_VALUES.packTangents;
    _uvHandedness = DEFAULT_VALUES.uvHandedness;
    _rebuildMissingNormals = DEFAULT_VALUES.rebuildMissingNormals;
    _rebuildMissingTangents = DEFAULT_VALUES.rebuildMissingTangents;
    _rebuildMissingBiNormals = DEFAULT_VALUES.rebuildMissingBiNormals;
    _classes = DEFAULT_VALUES.classes;

    /**
     * Create a reusable format profile.
     *
     * @param {object} [options] Default format values.
     */
    constructor(options = {})
    {
        super();
        this.SetValues(options);
    }

    /**
     * Set format values for this reusable profile.
     *
     * @param {object} [options] Values to merge into the profile.
     * @returns {CjsGltfFormat} This format profile.
     */
    SetValues(options = {})
    {
        const values = normalizeValues(this.GetValues(), options, FORMAT_NAME);

        this._emit = values.emit;
        this._source = values.source;
        this._buffers = values.buffers;
        this._packTangents = values.packTangents;
        this._uvHandedness = values.uvHandedness;
        this._rebuildMissingNormals = values.rebuildMissingNormals;
        this._rebuildMissingTangents = values.rebuildMissingTangents;
        this._rebuildMissingBiNormals = values.rebuildMissingBiNormals;
        this._classes = values.classes;

        return this;
    }

    /**
     * Get this profile's current values, optionally with per-call overrides.
     *
     * @param {object} [options] Optional values to merge into a copy.
     * @returns {object} A copy of the effective values.
     */
    GetValues(options = {})
    {
        return normalizeValues({
            emit: this._emit,
            source: this._source,
            buffers: this._buffers,
            packTangents: this._packTangents,
            uvHandedness: this._uvHandedness,
            rebuildMissingNormals: this._rebuildMissingNormals,
            rebuildMissingTangents: this._rebuildMissingTangents,
            rebuildMissingBiNormals: this._rebuildMissingBiNormals,
            classes: this._classes
        }, options, FORMAT_NAME);
    }

    /**
     * Read glTF/GLB data with this profile's values.
     *
     * @param {object|string|Uint8Array|ArrayBuffer|DataView} input glTF object, JSON text/bytes, or GLB bytes.
     * @param {object} [options] Per-call value overrides.
     * @returns {object} The shared CarbonEngineJS JSON geometry schema.
     */
    Read(input, options = {})
    {
        return readWithValues(this, input, this.GetValues(options));
    }

    /**
     * Inspect glTF/GLB data without hydrating classes.
     *
     * @param {object|string|Uint8Array|ArrayBuffer|DataView} input glTF object, JSON text/bytes, or GLB bytes.
     * @param {object} [options] Per-call value overrides.
     * @returns {object} Plain summary data.
     */
    Inspect(input, options = {})
    {
        return inspectWithValues(input, this.GetValues(options));
    }

    /**
     * Convert format output to JSON-compatible data.
     *
     * @param {any} value Format output to convert.
     * @returns {any} Plain JSON-compatible data.
     */
    ToJSON(value)
    {
        return toJsonValue(value);
    }

    /**
     * Static one-shot read. Static methods use camelCase by convention.
     *
     * @param {object|string|Uint8Array|ArrayBuffer|DataView} input glTF object, JSON text/bytes, or GLB bytes.
     * @param {object} [options] Format values.
     * @returns {object} The shared CarbonEngineJS JSON geometry schema.
     */
    static read(input, options = {})
    {
        return readWithValues(CjsGltfFormat, input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
    }

    /**
     * Static one-shot inspection.
     *
     * @param {object|string|Uint8Array|ArrayBuffer|DataView} input glTF object, JSON text/bytes, or GLB bytes.
     * @param {object} [options] Format values.
     * @returns {object} Plain summary data.
     */
    static inspect(input, options = {})
    {
        return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
    }

    /**
     * Static JSON-compatible conversion.
     *
     * @param {any} value Format output to convert.
     * @returns {any} Plain JSON-compatible data.
     */
    static toJSON(value)
    {
        return toJsonValue(value);
    }

    /**
     * Cheap payload sniff for GLB bytes.
     *
     * @param {Uint8Array|ArrayBuffer|DataView} input Candidate bytes.
     * @returns {boolean} True when the payload starts with GLB magic.
     */
    static isGlb(input)
    {
        return isGlb(input);
    }

    /**
     * Cheap object/text/bytes sniff for glTF-like assets.
     *
     * @param {object|string|Uint8Array|ArrayBuffer|DataView} input Candidate glTF data.
     * @returns {boolean} True when the input looks like glTF 2.x or GLB.
     */
    static isGltf(input)
    {
        try
        {
            if (isGlb(input)) return true;
            if (input && typeof input === "object" && !ArrayBuffer.isView(input) && !(input instanceof ArrayBuffer))
            {
                return !!(input.asset && String(input.asset.version || "").startsWith("2"));
            }
            const text = typeof input === "string" ? input : new TextDecoder().decode(asUint8Array(input, "CjsGltfFormat input"));
            const json = JSON.parse(text);
            return !!(json.asset && String(json.asset.version || "").startsWith("2"));
        }
        catch
        {
            return false;
        }
    }

    /**
     * Emit targets for this format (canonical frozen enum).
     */
    static classKeys = CLASS_KEYS;
    static id = "CjsGltfFormat";
    static outputs = CjsFormat.defineOutputs({
        shared: { default: true, decoded: true },
        gr2: { decoded: true },
        cmf: { decoded: true },
        json: { role: "debug", decoded: true },
        gltfJson: { role: "debug", decoded: true }
    });
    static extensions = [ ".gltf", ".glb" ];

}

export default CjsGltfFormat;
