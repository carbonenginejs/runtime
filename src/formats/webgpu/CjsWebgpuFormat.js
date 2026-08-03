import { CLASS_KEYS } from "./core/schema.js";
import { lowerDxbcToIr } from "./core/ir/lowerDxbcToIr.js";
import { buildWgsl } from "./core/wgsl/emitWgsl.js";
import { buildWgslBindingPlan } from "./core/wgsl/buildWgslBindingPlan.js";
import { buildWgslSet } from "./core/wgsl/buildWgslSet.js";
import { buildEffectPackage } from "./core/packageEffect.js";
import { FORMAT_WEBGPU_PACKAGE_VERSION } from "./core/packageMetadata.js";
import {
    CARBON_WEBGPU_ANALYSIS_FORMAT,
    CARBON_WEBGPU_FORMAT,
    DEFAULT_VALUES,
    OUTPUT_JSON,
    OUTPUT_RAW,
    analyzeEffectWithValues,
    inspectWithValues,
    isCarbonWebgpu,
    normalizeValues,
    readWithValues,
    toJsonValue,
    validateClass,
    validateClassKey
} from "./core/helpers.js";

const FORMAT_NAME = "CjsWebgpuFormat";

/**
 * CarbonEngineJS-facing format surface for `.carbonwebgpu` WebGPU packages, plus an
 * offline effect-analysis helper built on the runtime-resource HLSL and DXBC
 * format subpaths.
 *
 * The package owns read/build, normalized shader analysis, and the current
 * bounded DXBC-to-WGSL profiles. Broader shader-semantic coverage remains an
 * explicit qualification ladder.
 */
export class CjsWebgpuFormat
{
    #emit = DEFAULT_VALUES.emit;
    #source = DEFAULT_VALUES.source;
    #decodeInstructions = DEFAULT_VALUES.decodeInstructions;
    #permutation = DEFAULT_VALUES.permutation;
    #schema = DEFAULT_VALUES.schema;
    #classes = {};

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
     * @returns {CjsWebgpuFormat} This format profile.
     */
    SetValues(options = {})
    {
        const values = normalizeValues(this.GetValues(), options, CLASS_KEYS, FORMAT_NAME);
        this.#emit = values.emit;
        this.#source = values.source;
        this.#decodeInstructions = values.decodeInstructions;
        this.#permutation = values.permutation;
        this.#schema = values.schema;
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
            decodeInstructions: this.#decodeInstructions,
            permutation: this.#permutation,
            schema: this.#schema,
            classes: this.#classes
        }, options, CLASS_KEYS, FORMAT_NAME);
    }

    /**
     * Set multiple node-class constructors for this profile.
     *
     * @param {object} [classes] Map of node class keys to constructors.
     * @returns {CjsWebgpuFormat} This format profile.
     */
    SetClasses(classes = {})
    {
        return this.SetValues({ classes });
    }

    /**
     * Set one node-class constructor for this profile.
     *
     * @param {string} type Node class key.
     * @param {Function|null|undefined} Class constructor to use, or nullish to delete.
     * @returns {CjsWebgpuFormat} This format profile.
     */
    SetClass(type, Class)
    {
        validateClassKey(CLASS_KEYS, type, FORMAT_NAME);
        if (Class === null || Class === undefined)
        {
            delete this.#classes[type];
            return this;
        }

        validateClass(CLASS_KEYS, type, Class, FORMAT_NAME);
        this.#classes = { ...this.#classes, [type]: Class };
        return this;
    }

    /**
     * Get a configured node-class constructor.
     *
     * @param {string} type Node class key.
     * @returns {Function|undefined} The registered constructor, if any.
     */
    GetClass(type)
    {
        validateClassKey(CLASS_KEYS, type, FORMAT_NAME);
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
     * Read a Carbon WebGPU package with this profile's values.
     *
     * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Carbon WebGPU package bytes.
     * @param {object} [options] Per-call value overrides.
     * @returns {object} Plain JSON data, or the raw package instance when emit is "raw".
     */
    Read(input, options = {})
    {
        return readWithValues(input, this.GetValues(options));
    }

    /**
     * Inspect a Carbon WebGPU package without building the full JSON shape.
     *
     * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Carbon WebGPU package bytes.
     * @param {object} [options] Per-call value overrides.
     * @returns {object} Plain summary data.
     */
    Inspect(input, options = {})
    {
        return inspectWithValues(input, this.GetValues(options));
    }

    /**
     * Analyzes one compiled effect payload into a normalized WebGPU-facing
     * document using the current profile's values.
     *
     * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Tr2 effect bytes.
     * @param {object} [options] Per-call value overrides.
     * @returns {object} Plain JSON-compatible analysis data.
     */
    AnalyzeEffect(input, options = {})
    {
        return analyzeEffectWithValues(input, this.GetValues(options));
    }

    /**
     * Builds a Carbon WebGPU package with complete version-15 source reflection and
     * selected-body WebGPU output from compiled Tr2 effect bytes.
     *
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input Compiled effect bytes.
     * @param {object} [options] Source, body-mode, permutation, and stage-selection policy.
     * @returns {object} Package bytes plus inspection and provenance documents.
     */
    BuildEffect(input, options = {})
    {
        const values = this.GetValues();

        return buildEffectPackage(input, {
            source: values.source,
            permutation: values.permutation,
            ...options
        });
    }

    /**
     * Lowers DXBC bytes or decoded instructions into the front-end shader IR.
     *
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView|object} input DXBC input.
     * @param {object} [options] IR provenance options.
     * @returns {object} Frozen shader IR program.
     */
    BuildShaderIr(input, options = {})
    {
        return lowerDxbcToIr(input, options);
    }

    /**
     * Emits WGSL for the currently supported typed shader slice.
     *
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView|object} input DXBC or shader IR.
     * @param {object} [options] Source/provenance options.
     * @returns {object} Frozen WGSL shader descriptor.
     */
    BuildWgsl(input, options = {})
    {
        return buildWgsl(input, options);
    }

    /**
     * Assign one canonical numeric binding layout across shader stages in a pass.
     * Unshared D3D tuples remain stage-scoped unless shared explicitly.
     *
     * @param {object[]} programs Complete CJS shader IR stage set for one pass.
     * @param {object} [options] Pass-level binding policy.
     * @param {string[]} [options.sharedIdentities] Compatible D3D identities
     * confirmed to represent one resource across stages.
     * @returns {object} Frozen CJS_WGSL_BINDING_PLAN document.
     */
    BuildWgslBindingPlan(programs, options = {})
    {
        return buildWgslBindingPlan(programs, options);
    }

    /**
     * Assembles emitted shader descriptors into a portable WGSL set.
     *
     * @param {object[]} entries Canonically keyed emitted shader descriptors.
     * @returns {object} Frozen CJS_WGSL_SET document.
     */
    BuildWgslSet(entries)
    {
        return buildWgslSet(entries);
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
     * Static payload sniff. Static methods use camelCase by convention.
     *
     * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Candidate bytes.
     * @returns {boolean} True when the payload has Carbon's version-15 shape.
     */
    static isCarbonWebgpu(input)
    {
        return isCarbonWebgpu(input);
    }

    /**
     * Static one-shot read.
     *
     * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Carbon WebGPU package bytes.
     * @param {object} [options] Format values.
     * @returns {object} Plain JSON data, or the raw package instance when emit is "raw".
     */
    static read(input, options = {})
    {
        return readWithValues(input, normalizeValues(DEFAULT_VALUES, options, CLASS_KEYS, FORMAT_NAME));
    }

    /**
     * Static one-shot inspection.
     *
     * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Carbon WebGPU package bytes.
     * @param {object} [options] Format values.
     * @returns {object} Plain summary data.
     */
    static inspect(input, options = {})
    {
        return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, options, CLASS_KEYS, FORMAT_NAME));
    }

    /**
     * Static one-shot effect analysis.
     *
     * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Tr2 effect bytes.
     * @param {object} [options] Format values.
     * @returns {object} Plain JSON-compatible analysis data.
     */
    static analyzeEffect(input, options = {})
    {
        return analyzeEffectWithValues(input, normalizeValues(DEFAULT_VALUES, options, CLASS_KEYS, FORMAT_NAME));
    }

    /**
     * Static selected-body Carbon WebGPU builder.
     *
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input Compiled effect bytes.
     * @param {object} [options] Source, body-mode, permutation, and stage-selection policy.
     * @returns {object} Package bytes plus inspection and provenance documents.
     */
    static buildEffect(input, options = {})
    {
        return buildEffectPackage(input, options);
    }

    /**
     * Static DXBC-to-front-end-IR helper.
     *
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView|object} input DXBC input.
     * @param {object} [options] IR provenance options.
     * @returns {object} Frozen shader IR program.
     */
    static buildShaderIr(input, options = {})
    {
        return lowerDxbcToIr(input, options);
    }

    /**
     * Static WGSL emission helper for the currently supported typed slice.
     *
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView|object} input DXBC or shader IR.
     * @param {object} [options] Source/provenance options.
     * @returns {object} Frozen WGSL shader descriptor.
     */
    static buildWgsl(input, options = {})
    {
        return buildWgsl(input, options);
    }

    /**
     * Static pass-global WGSL binding-plan helper. Unshared D3D tuples remain
     * stage-scoped unless listed in options.sharedIdentities.
     *
     * @param {object[]} programs Complete CJS shader IR stage set for one pass.
     * @param {object} [options] Pass-level binding policy.
     * @param {string[]} [options.sharedIdentities] Compatible D3D identities
     * confirmed to represent one resource across stages.
     * @returns {object} Frozen CJS_WGSL_BINDING_PLAN document.
     */
    static buildWgslBindingPlan(programs, options = {})
    {
        return buildWgslBindingPlan(programs, options);
    }

    /**
     * Static WGSL-set assembly helper.
     *
     * @param {object[]} entries Canonically keyed emitted shader descriptors.
     * @returns {object} Frozen CJS_WGSL_SET document.
     */
    static buildWgslSet(entries)
    {
        return buildWgslSet(entries);
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

    static OUTPUT_JSON = OUTPUT_JSON;
    static OUTPUT_RAW = OUTPUT_RAW;
    static CLASS_KEYS = CLASS_KEYS;
    static type = Object.freeze([ "shader" ]);
    static mediaTypes = Object.freeze([ "shader" ]);
    static inputTypes = Object.freeze([ "carbonwebgpu" ]);
    static outputTypes = Object.freeze([ OUTPUT_JSON ]);
    static debugOutputTypes = Object.freeze([ OUTPUT_RAW ]);
    static implementationStatus = "partial";
    static format = CARBON_WEBGPU_FORMAT;
    static analysisFormat = CARBON_WEBGPU_ANALYSIS_FORMAT;
    static packageVersion = FORMAT_WEBGPU_PACKAGE_VERSION;
}

export default CjsWebgpuFormat;
