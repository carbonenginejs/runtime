/**
 * Internal glue for CjsWebglFormat.
 *
 * Keeps the public class file small: input/option normalization, DXBC-to-GLSL
 * emission, and JSON conversion live here. Reading an effect is
 * `readGlslEffectContainer` and summarising one is `inspectGlslEffectContainer`;
 * neither needs glue, so neither is wrapped here. The GLSL emitter lives under
 * src/formats/webgl/core/glsl.
 */

import { DxbcGlslEmitter } from "./glsl/DxbcGlslEmitter.js";
import { applyPackedLightFixups } from "./glsl/packedLightFixups.js";
import { WebglReadError } from "./errors.js";
import {
    looksLikeCarbonEffectContainer
} from "../../../format/carbonEffect/CjsCarbonEffectReader.js";

export const OUTPUT_JSON = "json";

export const DEFAULT_VALUES = Object.freeze({
    emit: OUTPUT_JSON,
    source: "memory"
});

const VALID_EMITS = new Set([ OUTPUT_JSON ]);
const OPTION_KEYS = new Set([ "emit", "source" ]);

/**
 * Merge format values over a base set and validate them.
 *
 * @param {object} base Current values.
 * @param {object} [options] Values to merge in.
 * @param {string} [readerName] Reader name used in error messages.
 * @returns {object} A validated copy of the merged values.
 */
export function normalizeValues(base, options = {}, readerName = "CjsWebglFormat")
{
    if (!options || typeof options !== "object")
    {
        throw new TypeError(`${readerName}: options must be an object`);
    }
    for (const key of Object.keys(options))
    {
        if (!OPTION_KEYS.has(key))
        {
            throw new TypeError(`${readerName}: unknown option ${JSON.stringify(key)}`);
        }
    }

    const values = { ...base, ...options };

    if (!VALID_EMITS.has(values.emit))
    {
        throw new TypeError(`${readerName}: emit must be "${OUTPUT_JSON}", got ${JSON.stringify(values.emit)}`);
    }
    if (typeof values.source !== "string" || !values.source)
    {
        values.source = DEFAULT_VALUES.source;
    }

    return {
        emit: values.emit,
        source: values.source
    };
}

/**
 * Normalize caller input into a Uint8Array of package/DXBC bytes.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Candidate payload.
 * @returns {Uint8Array} The payload bytes.
 */
export function toBytes(input)
{
    if (input instanceof Uint8Array) return input;
    if (typeof ArrayBuffer !== "undefined" && input instanceof ArrayBuffer) return new Uint8Array(input);
    if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    throw new TypeError("CjsWebglFormat: input must be effect container bytes (Uint8Array, Buffer, DataView or ArrayBuffer)");
}

/**
 * Reports whether a payload has the Carbon effect container shape.
 *
 * A shape check, not an identity check: our files are stock Carbon containers,
 * so nothing in the bytes distinguishes a WebGL one from a shipped
 * `effect.dx11`. Identity comes from the path the file was resolved through.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Candidate payload.
 * @returns {boolean} True when the payload has the container shape.
 */
export function isWebglEffectContainer(input)
{
    try
    {
        return looksLikeCarbonEffectContainer(toBytes(input));
    }
    catch
    {
        return false;
    }
}

const EMIT_GLSL_OPTION_KEYS = new Set([
    "constantBufferStyle",
    "pixelConstantBufferRemap",
    "samplerName",
    "vertexStructuredCapacity",
    "dataTextureWidth",
    "stubResourceRegisters",
    "detailMapArrayRegisters",
    "lightConstantBuffer",
    "lightPackedTexture",
    "pairVaryings",
    "source"
]);

const EMIT_GLSL_PROFILE_KEYS = new Set([
    "constantBufferStyle",
    "pixelConstantBufferRemap",
    "samplerName",
    "vertexStructuredCapacity",
    "dataTextureWidth",
    "stubResourceRegisters",
    "detailMapArrayRegisters",
    "lightConstantBuffer",
    "lightPackedTexture"
]);

/**
 * Translates one DXBC stage into GLSL ES 3.00 source, sharing one core path
 * between `CjsWebglFormat.emitGlsl` (static) and `EmitGlsl` (instance).
 *
 * `options` is a flat bag combining the emitter's ccpwgl-profile constructor
 * bits (`constantBufferStyle`, `pixelConstantBufferRemap`, `samplerName`,
 * `vertexStructuredCapacity`, `dataTextureWidth`) with its per-call Emit
 * options (`pairVaryings`, `source`); omitted keys keep the emitter's
 * existing defaults exactly.
 *
 * @param {ArrayBuffer|ArrayBufferView|Uint8Array} dxbcBytes DXBC container bytes.
 * @param {object} [options] Combined profile/emit options.
 * @returns {{source:string,stageName:string,inputs:object[],outputs:object[],bindings:object[],warnings:string[],computeFragment:(object|undefined)}}
 *   GLSL text plus the IO contract the packaging layer records; compute
 *   stages add the emitter's `computeFragment` host contract.
 */
export function emitGlslWithOptions(dxbcBytes, options = {})
{
    if (!options || typeof options !== "object")
    {
        throw new TypeError("CjsWebglFormat: emitGlsl options must be an object");
    }
    for (const key of Object.keys(options))
    {
        if (!EMIT_GLSL_OPTION_KEYS.has(key))
        {
            throw new TypeError(`CjsWebglFormat: unknown emitGlsl option ${JSON.stringify(key)}`);
        }
    }

    const profile = {};
    for (const key of EMIT_GLSL_PROFILE_KEYS)
    {
        if (Object.prototype.hasOwnProperty.call(options, key)) profile[key] = options[key];
    }

    const emitter = new DxbcGlslEmitter({ profile });
    const result = emitter.Emit(dxbcBytes, {
        source: options.source,
        pairVaryings: options.pairVaryings
    });

    // The packed local-light lowering leaves two idioms that must not reach a
    // driver: a flag mask round-tripped through a float, and an all-bits mask
    // stored as a float and then used for branch control, where 0xFFFFFFFF is a
    // NaN. Applied here rather than at a call site so every caller gets them.
    if (!options.lightPackedTexture) return result;

    return {
        ...result,
        source: applyPackedLightFixups(result.source, result.stageName)
    };
}

/**
 * Deep-convert a value to plain JSON-compatible data. Typed arrays become
 * plain number arrays; Maps/Sets become objects/arrays; class instances
 * with toJSON are honoured.
 *
 * @param {any} value Value to convert.
 * @returns {any} Plain data.
 */
export function toJsonValue(value)
{
    if (value === null || value === undefined) return value ?? null;
    if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "bigint") return value.toString();
    if (ArrayBuffer.isView(value)) return Array.from(value);
    if (Array.isArray(value)) return value.map(toJsonValue);
    if (value instanceof Map)
    {
        const out = {};
        for (const [ key, entry ] of value) out[key] = toJsonValue(entry);
        return out;
    }
    if (value instanceof Set) return Array.from(value, toJsonValue);
    if (typeof value === "object")
    {
        if (typeof value.toJSON === "function") return toJsonValue(value.toJSON());
        const out = {};
        for (const key of Object.keys(value)) out[key] = toJsonValue(value[key]);
        return out;
    }
    return null;
}

export { WebglReadError };
