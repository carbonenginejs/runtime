import { CjsFormat } from "../../format/CjsFormat.js";
import { CjsGeometryFormat } from "../../format/CjsGeometryFormat.js";
/**
 * Exposed CarbonEngineJS-facing STL format class.
 *
 * Keep this file small and reviewable: STL parsing, writing, printability
 * inspection, option normalization, and JSON hydration live under src/core.
 */

import {
    CLASS_KEYS,
    DEFAULT_VALUES,
    OUTPUT_CMF,
    OUTPUT_GR2,
    OUTPUT_JSON,
    OUTPUT_SHARED,
    OUTPUT_STL_JSON,
    inspectWithValues,
    isBinaryStl,
    isStl,
    normalizeValues,
    readWithValues,
    toJsonValue,
    writeWithValues
} from "./core/helpers.js";

const FORMAT_NAME = "CjsStlFormat";

/**
 * Shared mesh accepted by the STL writer. STL exports only `vertex.position`
 * and triangular `indices[].faces`; all other shared channels are ignored.
 *
 * @typedef {object} CjsStlSharedMesh
 * @property {string} [name] Diagnostic mesh name; `solidName` controls the STL header.
 * @property {{position: ArrayLike<number>, normal?: ArrayLike<number>}} vertex Shared vertex channels.
 * @property {Array<{name?: string, faces: ArrayLike<number>}>} indices Triangle index groups.
 */

/**
 * Shared geometry root accepted by the STL writer.
 *
 * @typedef {object} CjsStlSharedRoot
 * @property {Array<CjsStlSharedMesh>} meshes Meshes flattened into one STL solid.
 * @property {string} [grannyFileSource] Optional source label used by inspection.
 */

/**
 * Reusable STL read, write, and inspection options.
 *
 * @typedef {object} CjsStlFormatOptions
 * @property {"shared"|"stlJson"|"json"|"gr2"|"cmf"} [emit="stlJson"] Read output contract.
 * @property {string} [source="memory"] Source label stored in read/inspection output.
 * @property {boolean} [binary=true] Whether writes return binary bytes instead of ASCII text.
 * @property {string} [solidName="carbonenginejs"] Sanitized ASCII solid name and binary header label.
 * @property {number} [scale=1] Positive finite multiplier applied to exported positions.
 * @property {boolean} [recalculateNormals=true] Derive facet normals from winding instead of vertex normals.
 * @property {boolean} [weldVertices=false] Weld equal positions while reading STL.
 * @property {number} [weldTolerance=1e-5] Non-negative read/inspection position tolerance.
 * @property {boolean} [skipDegenerate=true] Omit degenerate shared triangles during writes.
 * @property {boolean} [requireWatertight=false] Reject writes with printability topology issues.
 * @property {Record<string, Function>} [classes] Caller constructors used for read hydration.
 */

/**
 * CarbonEngineJS-facing STL format surface.
 *
 * The Cjs prefix marks this as a JavaScript format/construction boundary.
 * STL is a triangle-only import/export format; the JSON contract is the shared
 * CarbonEngineJS mesh schema.
 */
export class CjsStlFormat extends CjsGeometryFormat
{

    _emit = DEFAULT_VALUES.emit;
    _source = DEFAULT_VALUES.source;
    _binary = DEFAULT_VALUES.binary;
    _solidName = DEFAULT_VALUES.solidName;
    _scale = DEFAULT_VALUES.scale;
    _recalculateNormals = DEFAULT_VALUES.recalculateNormals;
    _weldVertices = DEFAULT_VALUES.weldVertices;
    _weldTolerance = DEFAULT_VALUES.weldTolerance;
    _skipDegenerate = DEFAULT_VALUES.skipDegenerate;
    _requireWatertight = DEFAULT_VALUES.requireWatertight;
    _classes = DEFAULT_VALUES.classes;

    /**
     * Create a reusable format profile.
     *
     * The instance stores only normalized options; each `Read`, `Write`, or
     * `Inspect` call may provide non-mutating overrides.
     *
     * @param {CjsStlFormatOptions} [options={}] Default format values.
     * @throws {TypeError} If an option, output mode, numeric value, or class map is invalid.
     */
    constructor(options = {})
    {
        super();
        this.SetValues(options);
    }

    /**
     * Set format values for this reusable profile.
     *
     * @param {CjsStlFormatOptions} [options={}] Values to merge into the profile.
     * @returns {CjsStlFormat} This format profile.
     * @throws {TypeError} If an option, output mode, numeric value, or class map is invalid.
     */
    SetValues(options = {})
    {
        const values = normalizeValues(this.GetValues(), options, FORMAT_NAME);

        this._emit = values.emit;
        this._source = values.source;
        this._binary = values.binary;
        this._solidName = values.solidName;
        this._scale = values.scale;
        this._recalculateNormals = values.recalculateNormals;
        this._weldVertices = values.weldVertices;
        this._weldTolerance = values.weldTolerance;
        this._skipDegenerate = values.skipDegenerate;
        this._requireWatertight = values.requireWatertight;
        this._classes = values.classes;

        return this;
    }

    /**
     * Get this profile's current values, optionally with per-call overrides.
     *
     * @param {CjsStlFormatOptions} [options={}] Optional values to merge into a copy.
     * @returns {CjsStlFormatOptions} A validated copy of the effective values.
     * @throws {TypeError} If an override is invalid.
     */
    GetValues(options = {})
    {
        return normalizeValues({
            emit: this._emit,
            source: this._source,
            binary: this._binary,
            solidName: this._solidName,
            scale: this._scale,
            recalculateNormals: this._recalculateNormals,
            weldVertices: this._weldVertices,
            weldTolerance: this._weldTolerance,
            skipDegenerate: this._skipDegenerate,
            requireWatertight: this._requireWatertight,
            classes: this._classes
        }, options, FORMAT_NAME);
    }

    /**
     * Read STL text/bytes with this profile's values.
     *
     * @param {string|Uint8Array|ArrayBuffer|DataView} input STL text or bytes.
     * @param {object} [options] Per-call value overrides.
     * @returns {object} The shared CarbonEngineJS JSON mesh schema.
     */
    Read(input, options = {})
    {
        return readWithValues(this, input, this.GetValues(options));
    }

    /**
     * Write shared JSON geometry as STL with this profile's values.
     *
     * Multiple meshes and index groups are flattened in encounter order because
     * STL has no portable material or scene hierarchy. Degenerate triangles are
     * skipped by default. Binary output validates that every coordinate is
     * representable as float32 rather than silently writing infinities.
     *
     * @param {CjsStlSharedRoot|CjsStlSharedMesh} input Shared JSON root or mesh.
     * @param {CjsStlFormatOptions} [options={}] Per-call writer overrides.
     * @returns {string|Uint8Array} ASCII STL text or binary STL bytes.
     * @throws {TypeError|RangeError|Error} If geometry, indices, coordinates, topology, or options are invalid.
     */
    Write(input, options = {})
    {
        return writeWithValues(input, this.GetValues(options));
    }

    /**
     * Inspect STL text/bytes or shared JSON geometry for printability blockers.
     *
     * @param {any} input STL text/bytes or shared JSON root/mesh.
     * @param {object} [options] Per-call value overrides.
     * @returns {object} Plain printability report.
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
     * @param {string|Uint8Array|ArrayBuffer|DataView} input STL text or bytes.
     * @param {object} [options] Format values.
     * @returns {object} The shared CarbonEngineJS JSON mesh schema.
     */
    static read(input, options = {})
    {
        return readWithValues(CjsStlFormat, input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
    }

    /**
     * Static one-shot write.
     *
     * The call is one-shot and does not mutate `input`. Multiple meshes and
     * index groups are flattened into a single STL solid in encounter order.
     *
     * @param {CjsStlSharedRoot|CjsStlSharedMesh} input Shared JSON root or mesh.
     * @param {CjsStlFormatOptions} [options={}] Writer values.
     * @returns {string|Uint8Array} ASCII STL text or binary STL bytes.
     * @throws {TypeError|RangeError|Error} If geometry, indices, coordinates, topology, or options are invalid.
     */
    static write(input, options = {})
    {
        return writeWithValues(input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
    }

    /**
     * Static one-shot inspection.
     *
     * @param {any} input STL text/bytes or shared JSON root/mesh.
     * @param {object} [options] Format values.
     * @returns {object} Plain printability report.
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
     * Cheap sniff for STL-like input.
     *
     * @param {string|Uint8Array|ArrayBuffer|DataView} input Candidate STL input.
     * @returns {boolean} True when input looks like STL.
     */
    static isStl(input)
    {
        return isStl(input);
    }

    /**
     * Check whether byte-like input has an exact binary STL layout.
     *
     * @param {string|Uint8Array|ArrayBuffer|DataView} input Candidate STL input.
     * @returns {boolean} True when input is binary STL bytes.
     */
    static isBinaryStl(input)
    {
        return isBinaryStl(input);
    }

    /**
     * Emit targets for this format (canonical frozen enum).
     */
    static Output = Object.freeze({
        JSON: OUTPUT_JSON,
        STL_JSON: OUTPUT_STL_JSON,
        SHARED: OUTPUT_SHARED,
        GR2: OUTPUT_GR2,
        CMF: OUTPUT_CMF
    });
    static CLASS_KEYS = CLASS_KEYS;
    static id = "CjsStlFormat";
    // STL takes the shared geometry root directly rather than going through
    // CMF, because it carries triangles and nothing else worth preserving.
    // Lossless for what STL can represent; everything else was never in scope.
    static inputs = CjsFormat.defineInputs({
        shared: { default: true, payloadType: "geometry", options: [ "binary", "solidName", "scale", "recalculateNormals", "weldVertices" ] }
    });

    static outputs = CjsFormat.defineOutputs({
        shared: { decoded: true },
        gr2: { decoded: true },
        cmf: { decoded: true },
        json: { role: "debug", decoded: true },
        stlJson: { role: "debug", default: true, decoded: true }
    });
    static extensions = Object.freeze([ ".stl" ]);

}

export default CjsStlFormat;
