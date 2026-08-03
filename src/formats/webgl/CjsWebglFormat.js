/**
 * Exposed CarbonEngineJS-facing WebGL format class.
 *
 * Keep this file small and reviewable: container decoding lives in
 * core/readGlslEffectContainer.js, summarising in
 * core/inspectGlslEffectContainer.js, the DXBC-to-GLSL ES 3.00 emitter under
 * core/glsl, and option normalization in core/helpers.js.
 */

import {
    DEFAULT_VALUES,
    OUTPUT_JSON,
    emitGlslWithOptions,
    isWebglEffectContainer,
    normalizeValues,
    toJsonValue
} from "./core/helpers.js";
import { buildEffectPackage } from "./core/effectPackage.js";
import { readGlslEffectContainer } from "./core/readGlslEffectContainer.js";
import { inspectGlslEffectContainer } from "./core/inspectGlslEffectContainer.js";

const FORMAT_NAME = "CjsWebglFormat";

/**
 * CarbonEngineJS-facing format surface for `.carbonwebgl` WebGL shader packages, and
 * a DXBC -> GLSL ES 3.00 emitter for the WebGL2 vertex/pixel/map-style-compute
 * stages ccpwgl targets.
 *
 * The Cjs prefix marks this as a JavaScript format/construction boundary. A
 * WebGL effect is a stock Carbon effect container whose stored programs are
 * GLSL ES 3.00 - the same file shape Carbon ships for its own backends, and the
 * same one WebGPU emits with WGSL. `Read` decodes one into stage and shader
 * records; `Inspect` is a cheap structural summary; `BuildEffect` translates a
 * compiled Tr2 effect into one; `EmitGlsl` translates a single DXBC stage.
 */
export class CjsWebglFormat
{

    #emit = DEFAULT_VALUES.emit;
    #source = DEFAULT_VALUES.source;

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
     * @returns {CjsWebglFormat} This format profile.
     */
    SetValues(options = {})
    {
        const values = normalizeValues(this.GetValues(), options, FORMAT_NAME);

        this.#emit = values.emit;
        this.#source = values.source;

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
            source: this.#source
        }, options, FORMAT_NAME);
    }

    /**
     * Decode an effect container into stage and shader records.
     *
     * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Container bytes.
     * @param {object} [options] Per-call value overrides.
     * @returns {object} Stage graph in the completeness rules' vocabulary.
     */
    Read(input, options = {})
    {
        return readGlslEffectContainer(input, this.GetValues(options));
    }

    /**
     * Summarise an effect container without decoding every body's records.
     *
     * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Container bytes.
     * @param {object} [options] Per-call value overrides.
     * @returns {object} Plain summary data.
     */
    Inspect(input, options = {})
    {
        return inspectGlslEffectContainer(input, this.GetValues(options));
    }

    /**
     * Translates one DXBC vertex/pixel/map-style-compute stage into GLSL ES 3.00.
     *
     * @param {ArrayBuffer|ArrayBufferView|Uint8Array} dxbcBytes DXBC container bytes.
     * @param {object} [options] Combined ccpwgl-profile/emit options. See {@link CjsWebglFormat.emitGlsl}.
     * @returns {object} GLSL text plus the IO contract the packaging layer records.
     */
    EmitGlsl(dxbcBytes, options = {})
    {
        return emitGlslWithOptions(dxbcBytes, options);
    }

    /**
     * Builds a complete effect container from compiled Tr2 effect bytes.
     *
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input Compiled effect bytes.
     * @param {object} [options] Selection, provenance, and emitter policy.
     * @returns {object} Package bytes plus inspection and qualification records.
     */
    BuildEffect(input, options = {})
    {
        return buildEffectPackage(input, options);
    }

    /**
     * Instance JSON-compatible conversion.
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
     * @returns {boolean} True when the payload has the container shape.
     */
    static isWebglEffectContainer(input)
    {
        return isWebglEffectContainer(input);
    }

    /**
     * Static one-shot container decode.
     *
     * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Container bytes.
     * @param {object} [options] Format values.
     * @returns {object} Stage graph in the completeness rules' vocabulary.
     */
    static read(input, options = {})
    {
        return readGlslEffectContainer(input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
    }

    /**
     * Static one-shot inspection.
     *
     * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Container bytes.
     * @param {object} [options] Format values.
     * @returns {object} Plain summary data.
     */
    static inspect(input, options = {})
    {
        return inspectGlslEffectContainer(input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
    }

    /**
     * Static one-shot DXBC-to-GLSL emission.
     *
     * @param {ArrayBuffer|ArrayBufferView|Uint8Array} dxbcBytes DXBC container bytes.
     * @param {object} [options] Combined ccpwgl-profile/emit options: `constantBufferStyle`
     *   (`"array"` (default) uniform `vec4[]` for ccpwgl's uniform4fv path, or `"std140"`),
     *   `pixelConstantBufferRemap` (default `{ 0: 7 }`, pixel-stage cb slot renames),
     *   `samplerName(register, stageName)` (naming function), `vertexStructuredCapacity`
     *   (default 69, bone-array element capacity), `dataTextureWidth` (default 2048),
     *   `pairVaryings` (per-call varying zero-fill list), `source` (per-call error-detail name).
     * @returns {object} GLSL text plus the IO contract the packaging layer records.
     */
    static emitGlsl(dxbcBytes, options = {})
    {
        return emitGlslWithOptions(dxbcBytes, options);
    }

    /**
     * Static whole-effect container builder.
     *
     * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input Compiled effect bytes.
     * @param {object} [options] Selection, provenance, and emitter policy.
     * @returns {object} Package bytes plus inspection and qualification records.
     */
    static buildEffect(input, options = {})
    {
        return buildEffectPackage(input, options);
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
    static type = Object.freeze([ "shader" ]);
    static mediaTypes = Object.freeze([ "shader" ]);
    static inputTypes = Object.freeze([ "carbonwebgl" ]);
    static outputTypes = Object.freeze([ OUTPUT_JSON ]);
    static packageVersion = "0.2.0";

}

export default CjsWebglFormat;
