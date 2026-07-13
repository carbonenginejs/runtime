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
    importNodeModule,
    inspectWithValues,
    isGlb,
    normalizeValues,
    readWithValues,
    toBytes,
    toJsonValue,
    validateClass,
    validateClassKey
} from "./core/helpers.js";

const FORMAT_NAME = "CjsGltfFormat";

/**
 * CarbonEngineJS-facing glTF/GLB format surface.
 *
 * The Cjs prefix marks this as a JavaScript format/construction boundary.
 * glTF is the import source; the public read contract is the shared
 * CarbonEngineJS JSON mesh, skeleton, and animation schema.
 */
export class CjsGltfFormat
{

    #emit = DEFAULT_VALUES.emit;
    #source = DEFAULT_VALUES.source;
    #buffers = DEFAULT_VALUES.buffers;
    #packTangents = DEFAULT_VALUES.packTangents;
    #uvHandedness = DEFAULT_VALUES.uvHandedness;
    #rebuildMissingNormals = DEFAULT_VALUES.rebuildMissingNormals;
    #rebuildMissingTangents = DEFAULT_VALUES.rebuildMissingTangents;
    #rebuildMissingBiNormals = DEFAULT_VALUES.rebuildMissingBiNormals;
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
     * @returns {CjsGltfFormat} This format profile.
     */
    SetValues(options = {})
    {
        const values = normalizeValues(this.GetValues(), options, FORMAT_NAME);

        this.#emit = values.emit;
        this.#source = values.source;
        this.#buffers = values.buffers;
        this.#packTangents = values.packTangents;
        this.#uvHandedness = values.uvHandedness;
        this.#rebuildMissingNormals = values.rebuildMissingNormals;
        this.#rebuildMissingTangents = values.rebuildMissingTangents;
        this.#rebuildMissingBiNormals = values.rebuildMissingBiNormals;
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
            buffers: this.#buffers,
            packTangents: this.#packTangents,
            uvHandedness: this.#uvHandedness,
            rebuildMissingNormals: this.#rebuildMissingNormals,
            rebuildMissingTangents: this.#rebuildMissingTangents,
            rebuildMissingBiNormals: this.#rebuildMissingBiNormals,
            classes: this.#classes
        }, options, FORMAT_NAME);
    }

    /**
     * Set multiple node-class constructors for this profile.
     *
     * @param {object} [classes] Map of node class keys to constructors.
     * @returns {CjsGltfFormat} This format profile.
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
     * @returns {CjsGltfFormat} This format profile.
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
     * Whether this format profile has a constructor registered for a node key.
     *
     * @param {string} type Node class key.
     * @returns {boolean} True when a constructor is registered.
     */
    HasClass(type)
    {
        return !!this.GetClass(type);
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
     * Node-only convenience: reads a glTF or GLB file from disk.
     *
     * External `.bin` buffers referenced by relative URI are loaded beside the
     * `.gltf` file. GLB binary chunks are handled directly.
     *
     * @param {string} path Path to a `.gltf` or `.glb` file.
     * @param {object} [options] Format values.
     * @returns {Promise<object>} The shared CarbonEngineJS JSON geometry schema.
     */
    static async readFile(path, options = {})
    {
        if (typeof path !== "string" || !path)
        {
            throw new TypeError(`${FORMAT_NAME}: readFile path must be a non-empty string`);
        }

        const
            fs = await importNodeModule("node:fs/promises"),
            pathModule = await importNodeModule("node:path"),
            input = await fs.readFile(path);

        if (isGlb(input))
        {
            return CjsGltfFormat.read(input, { source: path, ...options });
        }

        const
            text = new TextDecoder().decode(input),
            gltf = JSON.parse(text),
            buffers = {};

        for (const buffer of gltf.buffers || [])
        {
            if (!buffer.uri || buffer.uri.startsWith("data:")) continue;
            const uri = decodeURIComponent(buffer.uri);
            buffers[buffer.uri] = await fs.readFile(pathModule.resolve(pathModule.dirname(path), uri));
        }

        return CjsGltfFormat.read(gltf, { source: path, buffers, ...options });
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
            const text = typeof input === "string" ? input : new TextDecoder().decode(toBytes(input));
            const json = JSON.parse(text);
            return !!(json.asset && String(json.asset.version || "").startsWith("2"));
        }
        catch
        {
            return false;
        }
    }

    static OUTPUT_JSON = OUTPUT_JSON;
    static OUTPUT_GLTF_JSON = OUTPUT_GLTF_JSON;
    static OUTPUT_SHARED = OUTPUT_SHARED;
    static OUTPUT_GR2 = OUTPUT_GR2;
    static OUTPUT_CMF = OUTPUT_CMF;
    static CLASS_KEYS = CLASS_KEYS;
    static type = Object.freeze([ "geometry" ]);
    static mediaTypes = Object.freeze([ "geometry" ]);
    static inputTypes = Object.freeze([ "gltf", "glb" ]);
    static outputTypes = Object.freeze([ OUTPUT_SHARED, OUTPUT_GR2, OUTPUT_CMF ]);
    static debugOutputTypes = Object.freeze([ OUTPUT_JSON, OUTPUT_GLTF_JSON ]);

}

export default CjsGltfFormat;
