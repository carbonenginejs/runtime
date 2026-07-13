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
    importNodeModule,
    inspectWithValues,
    isBinaryStl,
    isStl,
    normalizeValues,
    readWithValues,
    toJsonValue,
    validateClass,
    validateClassKey,
    writeWithValues
} from "./core/helpers.js";

const FORMAT_NAME = "CjsStlFormat";

/**
 * CarbonEngineJS-facing STL format surface.
 *
 * The Cjs prefix marks this as a JavaScript format/construction boundary.
 * STL is a triangle-only import/export format; the JSON contract is the shared
 * CarbonEngineJS mesh schema.
 */
export class CjsStlFormat
{

    #emit = DEFAULT_VALUES.emit;
    #source = DEFAULT_VALUES.source;
    #binary = DEFAULT_VALUES.binary;
    #solidName = DEFAULT_VALUES.solidName;
    #scale = DEFAULT_VALUES.scale;
    #recalculateNormals = DEFAULT_VALUES.recalculateNormals;
    #weldVertices = DEFAULT_VALUES.weldVertices;
    #weldTolerance = DEFAULT_VALUES.weldTolerance;
    #skipDegenerate = DEFAULT_VALUES.skipDegenerate;
    #requireWatertight = DEFAULT_VALUES.requireWatertight;
    #classes = DEFAULT_VALUES.classes;

    /**
     * Create a reusable format profile.
     *
     * @param {object} [options] Default format values.
     */
    constructor(options = {})
    {
        this.SetValues(options);
    }

    /**
     * Set format values for this reusable profile.
     *
     * @param {object} [options] Values to merge into the profile.
     * @returns {CjsStlFormat} This format profile.
     */
    SetValues(options = {})
    {
        const values = normalizeValues(this.GetValues(), options, FORMAT_NAME);

        this.#emit = values.emit;
        this.#source = values.source;
        this.#binary = values.binary;
        this.#solidName = values.solidName;
        this.#scale = values.scale;
        this.#recalculateNormals = values.recalculateNormals;
        this.#weldVertices = values.weldVertices;
        this.#weldTolerance = values.weldTolerance;
        this.#skipDegenerate = values.skipDegenerate;
        this.#requireWatertight = values.requireWatertight;
        this.#classes = values.classes;

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
            emit: this.#emit,
            source: this.#source,
            binary: this.#binary,
            solidName: this.#solidName,
            scale: this.#scale,
            recalculateNormals: this.#recalculateNormals,
            weldVertices: this.#weldVertices,
            weldTolerance: this.#weldTolerance,
            skipDegenerate: this.#skipDegenerate,
            requireWatertight: this.#requireWatertight,
            classes: this.#classes
        }, options, FORMAT_NAME);
    }

    /**
     * Set multiple node-class constructors for this profile.
     *
     * @param {object} [classes] Map of node class keys to constructors.
     * @returns {CjsStlFormat} This format profile.
     */
    SetClasses(classes = {})
    {
        return this.SetValues({ classes });
    }

    /**
     * Set one node-class constructor for this profile.
     *
     * @param {string} type Node class key.
     * @param {Function|null|undefined} Class Constructor to use, or nullish to delete.
     * @returns {CjsStlFormat} This format profile.
     */
    SetClass(type, Class)
    {
        if (Class === null || Class === undefined)
        {
            validateClassKey(type, FORMAT_NAME);
            const classes = { ...this.#classes };
            delete classes[type];
            this.#classes = classes;
            return this;
        }

        validateClass(type, Class, FORMAT_NAME);
        return this.SetValues({ classes: { [type]: Class } });
    }

    /**
     * Get a configured node-class constructor.
     *
     * @param {string} type Node class key.
     * @returns {Function|undefined} The registered constructor, if any.
     */
    GetClass(type)
    {
        validateClassKey(type, FORMAT_NAME);
        return this.#classes[type];
    }

    /**
     * Whether this format profile has a constructor registered for a node class key.
     *
     * @param {string} type Node class key.
     * @returns {boolean} True when a constructor is registered.
     */
    HasClass(type)
    {
        return !!this.GetClass(type);
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
     * @param {object} input Shared JSON root or mesh.
     * @param {object} [options] Per-call value overrides.
     * @returns {string|Uint8Array} ASCII STL text or binary STL bytes.
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
     * @param {object} input Shared JSON root or mesh.
     * @param {object} [options] Format values.
     * @returns {string|Uint8Array} ASCII STL text or binary STL bytes.
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
     * Node-only convenience: reads an STL file from disk.
     *
     * @param {string} path Path to an STL file.
     * @param {object} [options] Format values.
     * @returns {Promise<object>} The shared CarbonEngineJS JSON mesh schema.
     */
    static async readFile(path, options = {})
    {
        if (typeof path !== "string" || !path)
        {
            throw new TypeError(`${FORMAT_NAME}: readFile path must be a non-empty string`);
        }

        const { readFile } = await importNodeModule("node:fs/promises");
        const input = await readFile(path);
        return CjsStlFormat.read(input, { source: path, ...options });
    }

    /**
     * Node-only convenience: writes an STL file to disk.
     *
     * @param {string} path Path to write.
     * @param {object} input Shared JSON root or mesh.
     * @param {object} [options] Format values.
     * @returns {Promise<string>} The written path.
     */
    static async writeFile(path, input, options = {})
    {
        if (typeof path !== "string" || !path)
        {
            throw new TypeError(`${FORMAT_NAME}: writeFile path must be a non-empty string`);
        }

        const { writeFile } = await importNodeModule("node:fs/promises");
        const output = CjsStlFormat.write(input, options);
        await writeFile(path, output);
        return path;
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

    static OUTPUT_JSON = OUTPUT_JSON;
    static OUTPUT_STL_JSON = OUTPUT_STL_JSON;
    static OUTPUT_SHARED = OUTPUT_SHARED;
    static OUTPUT_GR2 = OUTPUT_GR2;
    static OUTPUT_CMF = OUTPUT_CMF;
    static CLASS_KEYS = CLASS_KEYS;
    static type = Object.freeze([ "geometry" ]);
    static mediaTypes = Object.freeze([ "geometry" ]);
    static inputTypes = Object.freeze([ "stl" ]);
    static outputTypes = Object.freeze([ OUTPUT_SHARED, OUTPUT_GR2, OUTPUT_CMF ]);
    static debugOutputTypes = Object.freeze([ OUTPUT_JSON, OUTPUT_STL_JSON ]);

}

export default CjsStlFormat;
