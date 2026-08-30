import { asUint8Array } from "#utils/bytes";
import { CjsFormat } from "../../format/CjsFormat.js";
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
export class CjsGltfFormat extends CjsFormat
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
    static Output = Object.freeze({
        JSON: OUTPUT_JSON,
        GLTF_JSON: OUTPUT_GLTF_JSON,
        SHARED: OUTPUT_SHARED,
        GR2: OUTPUT_GR2,
        CMF: OUTPUT_CMF
    });
    static CLASS_KEYS = CLASS_KEYS;
    static id = "gltf";
    static mediaTypes = Object.freeze([ "geometry" ]);
    static outputs = CjsFormat.defineOutputs({
        shared: { decoded: true },
        gr2: { decoded: true },
        cmf: { decoded: true },
        json: { role: "debug", decoded: true },
        gltfJson: { role: "debug", default: true, decoded: true }
    });
    static extensions = Object.freeze([ ".gltf", ".glb" ]);

}

export default CjsGltfFormat;
