import CjsDxbcFormat from "../../dxbc/index.js";
import { normalizeBytecodeBytes, readEffectAnalysis } from "./effectAnalysis.js";

import { CarbonWebgpuContainer, looksLikeCarbonWebgpuContainer } from "./carbonWebgpu/CarbonWebgpuContainer.js";
import { validateEffectContainer } from "./carbonWebgpu/validateContainer.js";
import {
    deriveAnalysis,
    deriveBackendBodySet,
    deriveInfo,
    deriveMetadata,
    deriveWgsl,
    resolvedPermutationIndex
} from "./carbonWebgpu/containerViews.js";
import { WebgpuReadError } from "./errors.js";
import { lowerDxbcToIr } from "./ir/lowerDxbcToIr.js";
import {
    normalizeEffectPermutation,
    validateResolvedPermutation
} from "./packageEffectSelection.js";

export const OUTPUT_JSON = "json";
export const CARBON_WEBGPU_FORMAT = "CARBON_WEBGPU";
export const CARBON_WEBGPU_ANALYSIS_FORMAT = "CARBON_WEBGPU_ANALYSIS";
export const CARBON_WEBGPU_ANALYSIS_VERSION = 1;

export const DEFAULT_VALUES = Object.freeze({
    emit: OUTPUT_JSON,
    source: "memory",
    decodeInstructions: true,
    permutation: null,
    schema: null,
    classes: Object.freeze({})
});

const OPTION_KEYS = new Set([ "emit", "source", "decodeInstructions", "permutation", "schema", "classes" ]);
// One emit, as WebGL has. `Read` returns the container-backed document and that
// document is complete: the analysis, WGSL, metadata and permutation views the
// caller selects among, plus `backendBodySet`, which is every translated body
// joined to its shared translation units.
//
// A second `raw` emit used to hand back the live `CarbonWebgpuContainer` because
// the chunk package's JSON could not express the body set. It became the only way
// to reach a body, so `engine-webgpu` duck-typed the container instead of reading
// the document - and when the chunk package was replaced, the engine kept asking
// for a shape the producer had stopped emitting. Both halves then failed, in
// different directions, for weeks: the default emit built pipelines but resolved
// no bodies, and the raw emit resolved bodies but built no pipelines.
//
// Neither is reachable now. The container stays internal to this module.
const VALID_EMITS = new Set([ OUTPUT_JSON ]);

function hasOwn(value, key)
{
    return Object.prototype.hasOwnProperty.call(value, key);
}

function normalizeEmit(emit, readerName)
{
    if (emit === undefined || VALID_EMITS.has(emit)) return OUTPUT_JSON;
    throw new TypeError(`${readerName}: emit must be "${OUTPUT_JSON}", got ${JSON.stringify(emit)}`);
}

function assertKnownOptions(options, readerName)
{
    for (const key of Object.keys(options))
    {
        if (!OPTION_KEYS.has(key))
        {
            throw new TypeError(`${readerName}: unknown option ${JSON.stringify(key)}`);
        }
    }
}

function classMap(values)
{
    return values && values.classes ? values.classes : {};
}

function cloneValues(values)
{
    return {
        emit: values.emit,
        source: values.source ?? DEFAULT_VALUES.source,
        decodeInstructions: values.decodeInstructions ?? DEFAULT_VALUES.decodeInstructions,
        permutation: values.permutation ?? null,
        schema: values.schema ?? null,
        classes: { ...classMap(values) }
    };
}

/**
 * Rejects class override keys outside a format reader's supported class set.
 *
 * @param {string[]} classKeys Supported class override keys.
 * @param {string} key Candidate override key.
 * @param {string} readerName Reader name used in diagnostics.
 */
export function validateClassKey(classKeys, key, readerName)
{
    if (!classKeys.includes(key))
    {
        throw new Error(`${readerName} unknown class type "${String(key)}"`);
    }
}

/**
 * Validates one constructor supplied through a format reader class override.
 *
 * @param {string[]} classKeys Supported class override keys.
 * @param {string} type Candidate override key.
 * @param {Function} Class Candidate constructor.
 * @param {string} readerName Reader name used in diagnostics.
 */
export function validateClass(classKeys, type, Class, readerName)
{
    validateClassKey(classKeys, type, readerName);
    if (typeof Class !== "function")
    {
        throw new TypeError(`${readerName} class "${type}" must be a constructor`);
    }
}

function mergeClasses(values, classes, classKeys, readerName)
{
    if (!classes || typeof classes !== "object")
    {
        throw new TypeError(`${readerName} classes option must be an object`);
    }

    const next = { ...values.classes };
    for (const [ type, Class ] of Object.entries(classes))
    {
        validateClass(classKeys, type, Class, readerName);
        next[type] = Class;
    }
    values.classes = next;
}

/**
 * Merge format values over a base set and validate them.
 *
 * @param {object} base Current values.
 * @param {object} [options] Values to merge in.
 * @param {string[]} classKeys Valid class keys.
 * @param {string} readerName Reader name used in error messages.
 * @returns {object} A validated copy of the merged values.
 */
export function normalizeValues(base, options = {}, classKeys = [], readerName = "CjsWebgpuFormat")
{
    if (!options || typeof options !== "object")
    {
        throw new TypeError(`${readerName} options must be an object`);
    }

    assertKnownOptions(options, readerName);

    const values = cloneValues(base);
    if (hasOwn(options, "emit")) values.emit = normalizeEmit(options.emit, readerName);
    if (hasOwn(options, "source")) values.source = typeof options.source === "string" && options.source ? options.source : DEFAULT_VALUES.source;
    if (hasOwn(options, "decodeInstructions")) values.decodeInstructions = !!options.decodeInstructions;
    if (hasOwn(options, "permutation")) values.permutation = options.permutation ?? null;
    if (hasOwn(options, "schema")) values.schema = options.schema ?? null;
    if (hasOwn(options, "classes")) mergeClasses(values, options.classes, classKeys, readerName);
    return values;
}

/**
 * Normalize caller input into a Uint8Array of package bytes.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Candidate payload.
 * @returns {Uint8Array} The payload bytes.
 */
export function toBytes(input)
{
    if (input instanceof Uint8Array) return input;
    if (typeof ArrayBuffer !== "undefined" && input instanceof ArrayBuffer) return new Uint8Array(input);
    if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    throw new TypeError("CjsWebgpuFormat: input must be Carbon WebGPU package bytes (Uint8Array, Buffer, DataView or ArrayBuffer)");
}

/**
 * Reports whether a payload has the Carbon v15 container shape.
 *
 * This is a **shape** check, not an identity check. Our containers are stock
 * Carbon v15 files, so nothing in the bytes separates one from a shipped
 * `effect.dx11` file -- and nothing should. Identity comes from the resource
 * path the file was resolved through, exactly as it does for Carbon, whose own
 * three backend trees are byte-format-identical with no language field anywhere.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Candidate payload.
 * @returns {boolean} True when the payload opens on Carbon's v15 version dword.
 */
export function isCarbonWebgpu(input)
{
    try
    {
        return looksLikeCarbonWebgpuContainer(toBytes(input));
    }
    catch
    {
        return false;
    }
}

/**
 * The shared read path used by the instance Read/Inspect and static one-shots.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Carbon WebGPU container payload.
 * @param {object} values Normalized format values.
 * @returns {CarbonWebgpuContainer} The loaded container.
 */
export function readRaw(input, values)
{
    const bytes = toBytes(input);
    const container = new CarbonWebgpuContainer();
    const ok = container.Read(bytes, { sourcePath: values.source });

    if (!ok)
    {
        throw new WebgpuReadError(
            container.readError ? container.readError.message : "Failed to read Carbon WebGPU container",
            {
                source: values.source,
                cause: container.readError || null
            }
        );
    }

    try
    {
        validateEffectContainer(container, { source: values.source });
    }
    catch (error)
    {
        if (error instanceof WebgpuReadError) throw error;
        throw new WebgpuReadError(error.message, {
            source: values.source,
            cause: error
        });
    }

    return container;
}

/**
 * Converts a loaded container to the documented plain JSON shape.
 *
 * `analysis` and `wgsl` are **derived views**, not stored documents. The chunk
 * package kept them beside the reflection they were computed from and carried
 * digests to detect the two disagreeing; there is now one document, so there is
 * nothing left to disagree and no digest to carry.
 *
 * `chunks` is gone. It described a container that no longer exists, and a record
 * layout has no chunk table to translate it into.
 *
 * @param {CarbonWebgpuContainer} container Loaded container.
 * @param {object} [options] View options.
 * @returns {object} Plain JSON data.
 */
export function packageToJson(container, options = {})
{
    const source = options.source || container.sourcePath || "memory";
    const permutationIndex = options.permutationIndex ?? resolvedPermutationIndex(container);
    const analysis = deriveAnalysis(container, { source, permutationIndex });
    const wgsl = deriveWgsl(container, { permutationIndex });

    return toJsonValue({
        format: CARBON_WEBGPU_FORMAT,
        version: container.carbon.version,
        sourcePath: source,
        info: deriveInfo(container, { source }),
        metadata: deriveMetadata(container, { source, permutationIndex }),
        permutationGraph: container.permutationGraph,
        analysis,
        wgsl,
        backendBodySet: deriveBackendBodySet(container),
        stages: analysis.stages ?? [],
        shaders: wgsl.shaders ?? [],
        layouts: wgsl.layouts ?? []
    });
}

/**
 * Shared read entry.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Carbon WebGPU container payload.
 * @param {object} values Normalized format values.
 * @returns {object} Plain JSON data.
 */
export function readWithValues(input, values)
{
    return packageToJson(readRaw(input, values), { source: values.source });
}

/**
 * Compact inspection: Carbon version and compiler bytes, body counts, and the
 * resolved analysis/WGSL counts without building the full JSON package shape.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Carbon WebGPU container payload.
 * @param {object} values Normalized format values.
 * @returns {object} Plain summary data.
 */
export function inspectWithValues(input, values)
{
    const container = readRaw(input, values);
    const graph = container.permutationGraph;
    const permutationIndex = resolvedPermutationIndex(container);
    const analysis = deriveAnalysis(container, { source: values.source, permutationIndex });
    const wgsl = deriveWgsl(container, { permutationIndex });

    return {
        source: values.source,
        isCarbonWebgpu: true,
        version: container.carbon.version,
        compilerVersion: [ ...container.carbon.compilerVersion ],
        permutationCount: graph.variants.length,
        uniqueBodyCount: graph.bodies.length,
        stageCount: analysis.stages.length,
        shaderCount: wgsl.shaders.length,
        layoutCount: wgsl.layouts.length
    };
}

function dxbcSource(source, key)
{
    return source ? `${source}#${key}` : key;
}

function resolvedStageBytecode(stage, key, bytecodeByKey)
{
    if (!Number.isInteger(stage.stageType)
        || !Number.isInteger(stage.passIndex)
        || typeof stage.techniqueName !== "string"
        || !stage.techniqueName
        || typeof stage.stageName !== "string"
        || !stage.stageName)
    {
        throw new Error(`${key} manifest stage identity is invalid`);
    }

    const innerStageType = stage.shaderBytecode?.stageType;
    if (innerStageType !== undefined && !Number.isInteger(innerStageType))
    {
        throw new Error(`${key} manifest stage bytecode type is invalid`);
    }

    let raw = bytecodeByKey?.get(key);
    if (!raw && bytecodeByKey instanceof Map)
    {
        raw = Array.from(bytecodeByKey.values()).find((entry) =>
            entry.techniqueName === stage.techniqueName
            && entry.passIndex === stage.passIndex
            && entry.stageType === stage.stageType
        );
    }
    if (!raw) return stage.shaderBytecode?.bytes;

    if (!Number.isInteger(raw.stageType)
        || stage.stageType !== raw.stageType
        || (innerStageType !== undefined && innerStageType !== raw.stageType)
        || stage.stageName !== raw.stageName
        || (stage.shaderBytecode?.stageName !== undefined
            && stage.shaderBytecode.stageName !== raw.stageName))
    {
        throw new Error(`${key} manifest and raw stage metadata disagree`);
    }

    if (stage.shaderBytecode?.bytes !== undefined)
    {
        const manifestBytes = normalizeBytecodeBytes(
            stage.shaderBytecode.bytes,
            `${key} manifest stage bytecode`
        );
        if (!manifestBytes
            || manifestBytes.length !== raw.bytes.length
            || manifestBytes.some((value, index) => value !== raw.bytes[index]))
        {
            throw new Error(`${key} manifest and raw stage bytecode disagree`);
        }
    }

    return raw.bytes;
}

function analyzeStage(stage, options)
{
    const key = `${stage.techniqueName}.pass${stage.passIndex}.${stage.stageName}`;
    const shaderBytecode = stage.shaderBytecode && typeof stage.shaderBytecode === "object"
        ? { ...stage.shaderBytecode }
        : stage.shaderBytecode;
    if (shaderBytecode && typeof shaderBytecode === "object")
    {
        delete shaderBytecode.bytes;
    }
    const out = {
        ...stage,
        shaderBytecode,
        key,
        dxbc: null,
        dxbcError: null,
        ir: null,
        irError: null
    };

    if (options.decodeBytecode === false)
    {
        return out;
    }

    const bytecodeBytes = normalizeBytecodeBytes(
        options.bytecodeBytes ?? stage.shaderBytecode?.bytes,
        `${key} stage bytecode`
    );
    if (!bytecodeBytes?.length)
    {
        return out;
    }

    try
    {
        out.dxbc = CjsDxbcFormat.read(bytecodeBytes, {
            source: dxbcSource(options.source, key),
            decodeInstructions: options.decodeInstructions
        });
        if (options.decodeInstructions && Array.isArray(out.dxbc.instructions))
        {
            try
            {
                out.ir = lowerDxbcToIr(out.dxbc, { source: dxbcSource(options.source, key) });
            }
            catch (error)
            {
                out.irError = {
                    name: error.name,
                    message: error.message
                };
            }
        }
    }
    catch (error)
    {
        out.dxbcError = {
            name: error.name,
            message: error.message
        };
    }

    return out;
}

/**
 * Builds the normalized WebGPU analysis document from a resolved effect.
 *
 * @param {object} resolved Raw resolved-effect context from `readEffectAnalysis`.
 * @param {object} [options] Analysis options.
 * @param {string} [options.source] Source label for diagnostics.
 * @param {boolean} [options.decodeBytecode] Whether stage bytecode is inspected.
 * @param {boolean} [options.decodeInstructions] Whether DXBC instructions are decoded.
 * @returns {object} Plain JSON-compatible analysis data.
 */
export function buildEffectAnalysis(resolved, options = {})
{
    const source = options.source || resolved.effectRes?.sourcePath || "memory";
    const decodeBytecode = options.decodeBytecode !== undefined ? !!options.decodeBytecode : true;
    const decodeInstructions = options.decodeInstructions !== undefined ? !!options.decodeInstructions : true;
    const manifest = resolved.bindingManifest?.toJSON?.() ?? null;
    const bytecodeByKey = resolved.stageBytecodeByKey instanceof Map
        ? resolved.stageBytecodeByKey
        : null;
    const stages = (manifest?.stages || []).map((stage) =>
    {
        const key = `${stage.techniqueName}.pass${stage.passIndex}.${stage.stageName}`;

        return analyzeStage(stage, {
            source,
            decodeBytecode,
            decodeInstructions,
            bytecodeBytes: resolvedStageBytecode(stage, key, bytecodeByKey)
        });
    });

    return toJsonValue({
        format: CARBON_WEBGPU_ANALYSIS_FORMAT,
        formatVersion: CARBON_WEBGPU_ANALYSIS_VERSION,
        source,
        effectVersion: resolved.effectDescription?.version ?? manifest?.version ?? resolved.effectRes?.m_version ?? null,
        compilerVersion: resolved.effectRes?.m_compilerVersion ?? null,
        effectName: manifest?.effectName || resolved.effectDescription?.effectName || null,
        bodyIndex: resolved.selection?.bodyIndex ?? 0,
        selectedOptions: resolved.selection?.selectedOptions ?? [],
        passes: manifest?.passes || [],
        stages
    });
}

/**
 * Analyzes one compiled effect payload into a normalized WebGPU-facing
 * document: selected permutation, Carbon binding manifest, and per-stage DXBC
 * decode.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input Tr2 effect payload.
 * @param {object} values Normalized format values.
 * @returns {object} Plain JSON-compatible analysis data.
 */
export function analyzeEffectWithValues(input, values)
{
    const permutation = normalizeEffectPermutation(values.permutation);
    const resolved = readEffectAnalysis(input, {
        source: values.source,
        permutation
    });
    validateResolvedPermutation(
        permutation,
        resolved.selection?.selectedOptions ?? []
    );

    return buildEffectAnalysis(resolved, {
        source: values.source,
        decodeInstructions: values.decodeInstructions
    });
}

/**
 * Deep-convert a value to plain JSON-compatible data.
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

export { WebgpuReadError };
