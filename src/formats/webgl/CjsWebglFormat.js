/**
 * Exposed CarbonEngineJS-facing WebGL format class.
 *
 * Keep this file small and reviewable: CEWG container parsing lives under
 * src/core/cewg (internal parsing machinery, not part of this package's
 * public surface); the DXBC-to-GLSL ES 3.00 emitter lives under
 * src/core/glsl; input/option normalization and the shared read/build/emit
 * paths live in src/core/helpers.js.
 */

import {
    DEFAULT_VALUES,
    OUTPUT_JSON,
    OUTPUT_RAW,
    buildPackage,
    emitGlslWithOptions,
    inspectWithValues,
    isCewg,
    normalizeValues,
    readWithValues,
    toJsonValue
} from "./core/helpers.js";
import { buildEffectPackage } from "./core/effectPackage.js";

const FORMAT_NAME = "CjsWebglFormat";

/**
 * CarbonEngineJS-facing format surface for `.cewg` WebGL shader packages, and
 * a DXBC -> GLSL ES 3.00 emitter for the WebGL2 vertex/pixel/map-style-compute
 * stages ccpwgl targets.
 *
 * The Cjs prefix marks this as a JavaScript format/construction boundary.
 * CEWG is a CarbonEngineJS-invented container format (flat four-byte-tagged
 * chunks: `INFO`/`META`/`GLSL`/...), not a Microsoft or CCP one. `Read`
 * parses a package to plain JSON by default (`emit: "raw"` exposes the live
 * `CewgPackage` instance instead); `Inspect` is a cheap chunk/shader-count
 * summary; `Build` assembles package bytes from chunk payloads; `EmitGlsl`
 * translates one DXBC vertex/pixel/map-style-compute stage to GLSL ES 3.00.
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
     * Read a CEWG package with this profile's values.
     *
     * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input CEWG package bytes.
     * @param {object} [options] Per-call value overrides.
     * @returns {object} Plain JSON data, or the raw CewgPackage instance when emit is "raw".
     */
    Read(input, options = {})
    {
        return readWithValues(input, this.GetValues(options));
    }

    /**
     * Inspect a CEWG package without building the full JSON shape.
     *
     * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input CEWG package bytes.
     * @param {object} [options] Per-call value overrides.
     * @returns {object} Plain summary data.
     */
    Inspect(input, options = {})
    {
        return inspectWithValues(input, this.GetValues(options));
    }

    /**
     * Assembles a CEWG package from ordered chunk payloads.
     *
     * @param {Array<[string, string|object|Uint8Array|ArrayBuffer|ArrayBufferView]>} chunks Ordered package chunks.
     * @returns {Uint8Array} Package bytes.
     */
    Build(chunks)
    {
        return buildPackage(chunks);
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
     * Builds a complete CEWG package from compiled Tr2 effect bytes.
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
     * @returns {boolean} True when the payload starts with the CEWG magic.
     */
    static isCewg(input)
    {
        return isCewg(input);
    }

    /**
     * Static one-shot read.
     *
     * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input CEWG package bytes.
     * @param {object} [options] Format values.
     * @returns {object} Plain JSON data, or the raw CewgPackage instance when emit is "raw".
     */
    static read(input, options = {})
    {
        return readWithValues(input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
    }

    /**
     * Static one-shot inspection.
     *
     * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input CEWG package bytes.
     * @param {object} [options] Format values.
     * @returns {object} Plain summary data.
     */
    static inspect(input, options = {})
    {
        return inspectWithValues(input, normalizeValues(DEFAULT_VALUES, options, FORMAT_NAME));
    }

    /**
     * Static one-shot package build.
     *
     * @param {Array<[string, string|object|Uint8Array|ArrayBuffer|ArrayBufferView]>} chunks Ordered package chunks.
     * @returns {Uint8Array} Package bytes.
     */
    static build(chunks)
    {
        return buildPackage(chunks);
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
     * Static whole-effect CEWG builder.
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
    static OUTPUT_RAW = OUTPUT_RAW;
    static type = Object.freeze([ "shader" ]);
    static mediaTypes = Object.freeze([ "shader" ]);
    static inputTypes = Object.freeze([ "cewg" ]);
    static outputTypes = Object.freeze([ OUTPUT_JSON ]);
    static debugOutputTypes = Object.freeze([ OUTPUT_RAW ]);
    static packageVersion = "0.2.0";

}

export default CjsWebglFormat;
