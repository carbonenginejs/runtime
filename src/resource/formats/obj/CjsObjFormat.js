import { CjsFormat } from "../../format/CjsFormat.js";
import { CjsGeometryFormat } from "../../format/CjsGeometryFormat.js";
/**
 * Exposed CarbonEngineJS-facing OBJ format class.
 *
 * Keep this file small and reviewable: OBJ parsing, mesh rebuild helpers,
 * option normalization, and JSON hydration live under src/core.
 */

import {
    CLASS_KEYS,
    DEFAULT_VALUES,
    OUTPUT_CMF,
    OUTPUT_GR2,
    OUTPUT_JSON,
    OUTPUT_OBJ_JSON,
    OUTPUT_SHARED,
    inspectWithValues,
    normalizeValues,
    readWithValues,
    toJsonValue,
    toText,
} from "./core/helpers.js";

const FORMAT_NAME = "CjsObjFormat";

/**
 * CarbonEngineJS-facing Wavefront OBJ format surface.
 *
 * The Cjs prefix marks this as a JavaScript format/construction boundary.
 * OBJ is the current import source; the public read contract is the shared
 * CarbonEngineJS JSON mesh schema.
 */
export class CjsObjFormat extends CjsGeometryFormat
{

    _emit = DEFAULT_VALUES.emit;
    _source = DEFAULT_VALUES.source;
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
     * @returns {CjsObjFormat} This format profile.
     */
    SetValues(options = {})
    {
        const values = normalizeValues(this.GetValues(), options, FORMAT_NAME);

        this._emit = values.emit;
        this._source = values.source;
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
            packTangents: this._packTangents,
            uvHandedness: this._uvHandedness,
            rebuildMissingNormals: this._rebuildMissingNormals,
            rebuildMissingTangents: this._rebuildMissingTangents,
            rebuildMissingBiNormals: this._rebuildMissingBiNormals,
            classes: this._classes
        }, options, FORMAT_NAME);
    }

    /**
     * Read OBJ text with this profile's values.
     *
     * @param {string|Uint8Array|ArrayBuffer|DataView} input OBJ text or UTF-8 bytes.
     * @param {object} [options] Per-call value overrides.
     * @returns {object} The shared CarbonEngineJS JSON mesh schema.
     */
    Read(input, options = {})
    {
        return readWithValues(this, input, this.GetValues(options), FORMAT_NAME);
    }

    /**
     * Inspect OBJ text without hydrating classes.
     *
     * @param {string|Uint8Array|ArrayBuffer|DataView} input OBJ text or UTF-8 bytes.
     * @param {object} [options] Per-call value overrides.
     * @returns {object} Plain summary data.
     */
    Inspect(input, options = {})
    {
        return inspectWithValues(input, this.GetValues(options), FORMAT_NAME);
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
     * @param {string|Uint8Array|ArrayBuffer|DataView} input OBJ text or UTF-8 bytes.
     * @param {object} [options] Format values.
     * @returns {object} The shared CarbonEngineJS JSON mesh schema.
     */
    static read(input, options = {})
    {
        return readWithValues(CjsObjFormat, input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME), FORMAT_NAME);
    }

    /**
     * Static one-shot inspection.
     *
     * @param {string|Uint8Array|ArrayBuffer|DataView} input OBJ text or UTF-8 bytes.
     * @param {object} [options] Format values.
     * @returns {object} Plain summary data.
     */
    static inspect(input, options = {})
    {
        return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME), FORMAT_NAME);
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
     * Cheap text sniff for OBJ-like mesh data.
     *
     * @param {string|Uint8Array|ArrayBuffer|DataView} input Candidate OBJ text.
     * @returns {boolean} True when at least one vertex and face statement exist.
     */
    static isObj(input)
    {
        try
        {
            const text = toText(input);
            return /^v\s+/m.test(text) && /^f\s+/m.test(text);
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
    static id = "CjsObjFormat";
    static outputs = CjsFormat.defineOutputs({
        shared: { decoded: true },
        gr2: { decoded: true },
        cmf: { decoded: true },
        json: { role: "debug", decoded: true },
        objJson: { role: "debug", default: true, decoded: true }
    });
    static extensions = [ ".obj" ];

}

export default CjsObjFormat;
