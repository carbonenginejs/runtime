/**
 * Internal read-pipeline glue for CjsGltfFormat.
 */

import { CLASS_KEYS as GR2_CLASS_KEYS, hydrateJson } from "./json.js";
import { buildCmfFromShared, CMF_CLASS_KEYS, hydrateCmf } from "./targets.js";
import { inspectGltf, isGlb, parseGltfToJson, parseInput, toBytes } from "./parser.js";
import {
    generateBiNormals,
    generateNormals,
    generateTangents
} from "@carbonenginejs/runtime-utils/mesh";
import {
    packTangentFrames
} from "@carbonenginejs/runtime-utils/tangent";
import {
    cross,
    normalize
} from "@carbonenginejs/runtime-utils/vec3";

export const CLASS_KEYS = Object.freeze(Array.from(new Set([
    ...GR2_CLASS_KEYS,
    ...CMF_CLASS_KEYS
])));

export { isGlb, toBytes };

export const OUTPUT_JSON = "json";
export const OUTPUT_GLTF_JSON = "gltfJson";
export const OUTPUT_SHARED = "shared";
export const OUTPUT_GR2 = "gr2";
export const OUTPUT_CMF = "cmf";

export const DEFAULT_VALUES = Object.freeze({
    emit: OUTPUT_GLTF_JSON,
    source: "memory",
    buffers: null,
    packTangents: false,
    uvHandedness: "right",
    rebuildMissingNormals: false,
    rebuildMissingTangents: false,
    rebuildMissingBiNormals: false,
    classes: Object.freeze({})
});

const OPTION_KEYS = new Set([
    "emit",
    "source",
    "buffers",
    "packTangents",
    "uvHandedness",
    "rebuildMissingNormals",
    "rebuildMissingTangents",
    "rebuildMissingBiNormals",
    "classes"
]);

/** Validates a requested runtime class key for the glTF format reader. */
export function validateClassKey(key, readerName = "CjsGltfFormat")
{
    if (!CLASS_KEYS.includes(key))
    {
        throw new Error(`${readerName}: unknown class key ${JSON.stringify(key)}; expected one of ${CLASS_KEYS.join(", ")}`);
    }
}

/** Validates a resolved runtime class constructor for the glTF format reader. */
export function validateClass(key, Class, readerName = "CjsGltfFormat")
{
    validateClassKey(key, readerName);
    if (typeof Class !== "function")
    {
        throw new TypeError(`${readerName}: class ${JSON.stringify(key)} must be a constructor`);
    }
}

function mergeClasses(base, classes, readerName)
{
    if (!classes || typeof classes !== "object")
    {
        throw new TypeError(`${readerName}: classes option must be an object`);
    }

    const next = { ...base };
    for (const [ key, Class ] of Object.entries(classes))
    {
        if (Class === null || Class === undefined)
        {
            delete next[key];
            continue;
        }
        validateClass(key, Class, readerName);
        next[key] = Class;
    }
    return next;
}

function validateRule(name, value, readerName)
{
    if (typeof value === "boolean" || typeof value === "function") return value;
    throw new TypeError(`${readerName}: ${name} must be true, false, or a function`);
}

function normalizeUvHandedness(value, readerName)
{
    if (value === undefined || value === null) return DEFAULT_VALUES.uvHandedness;
    if (value === "right" || value === 1 || value === "positive") return "right";
    if (value === "left" || value === -1 || value === "negative") return "left";
    throw new TypeError(`${readerName}: uvHandedness must be "right" or "left"`);
}

/**
 * Normalizes reader options against their supported defaults for the glTF format
 * reader.
 */
export function normalizeValues(base, options = {}, readerName = "CjsGltfFormat")
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
    const emit = normalizeEmit(values.emit, readerName);
    const classes = Object.prototype.hasOwnProperty.call(options, "classes")
        ? mergeClasses(base.classes || {}, options.classes, readerName)
        : { ...(base.classes || {}) };
    if ((emit === OUTPUT_GR2 || emit === OUTPUT_CMF) && !hasClasses(classes))
    {
        throw new TypeError(`${readerName}: emit "${emit}" requires explicit classes`);
    }
    if (typeof values.source !== "string" || !values.source)
    {
        values.source = DEFAULT_VALUES.source;
    }

    return {
        emit,
        source: values.source,
        buffers: values.buffers || null,
        packTangents: validateRule("packTangents", values.packTangents, readerName),
        uvHandedness: normalizeUvHandedness(values.uvHandedness, readerName),
        rebuildMissingNormals: validateRule("rebuildMissingNormals", values.rebuildMissingNormals, readerName),
        rebuildMissingTangents: validateRule("rebuildMissingTangents", values.rebuildMissingTangents, readerName),
        rebuildMissingBiNormals: validateRule("rebuildMissingBiNormals", values.rebuildMissingBiNormals, readerName),
        classes
    };
}

function normalizeEmit(emit, readerName)
{
    if (emit === undefined || emit === null || emit === OUTPUT_JSON || emit === OUTPUT_GLTF_JSON || emit === OUTPUT_SHARED)
    {
        return OUTPUT_GLTF_JSON;
    }
    if (emit === OUTPUT_GR2 || emit === OUTPUT_CMF) return emit;
    throw new TypeError(`${readerName}: emit must be "${OUTPUT_SHARED}", "${OUTPUT_GLTF_JSON}", "${OUTPUT_GR2}", or "${OUTPUT_CMF}", got ${JSON.stringify(emit)}`);
}

function hasClasses(classes)
{
    return !!classes && Object.values(classes).some((Class) => typeof Class === "function");
}

function hasVertexChannel(mesh, channel)
{
    const value = mesh && mesh.vertex && mesh.vertex[channel];
    return !!value && value.length > 0;
}

function requireVertexChannel(mesh, meshIndex, channel, feature)
{
    const value = mesh && mesh.vertex && mesh.vertex[channel];
    if (!value || value.length === 0)
    {
        const name = mesh && mesh.name ? JSON.stringify(mesh.name) : `#${meshIndex}`;
        throw new Error(`CjsGltfFormat: ${feature} requires mesh.vertex.${channel} for mesh ${name}`);
    }
    return value;
}

function triangleFaces(mesh, meshIndex, feature)
{
    const faces = [];
    for (const group of mesh.indices || [])
    {
        if (group && group.faces) faces.push(...group.faces);
    }
    if (faces.length === 0)
    {
        const name = mesh && mesh.name ? JSON.stringify(mesh.name) : `#${meshIndex}`;
        throw new Error(`CjsGltfFormat: ${feature} requires triangle indices for mesh ${name}`);
    }
    return faces;
}

function shouldApplyMeshRule(format, rule, context)
{
    if (typeof rule === "function")
    {
        const result = rule({ format, reader: format, ...context });
        if (typeof result !== "boolean")
        {
            throw new TypeError(`CjsGltfFormat: ${context.feature} rule must return true or false`);
        }
        return result;
    }
    return rule;
}

function vertexCount(mesh)
{
    return mesh.vertex.position.length / 3;
}

function tangentXyz(mesh)
{
    const
        tangent = requireVertexChannel(mesh, 0, "tangent", "tangent conversion"),
        count = vertexCount(mesh),
        width = tangent.length / count;

    if (width === 3) return tangent.slice();
    if (width !== 4) throw new Error("CjsGltfFormat: tangent channel must have 3 or 4 components per vertex");

    const out = new Array(count * 3);
    for (let i = 0, o = 0; i < tangent.length; i += 4, o += 3)
    {
        out[o] = tangent[i];
        out[o + 1] = tangent[i + 1];
        out[o + 2] = tangent[i + 2];
    }
    return out;
}

function generatedBiNormalsForMesh(mesh, values)
{
    const
        normals = requireVertexChannel(mesh, 0, "normal", "binormal generation"),
        tangent = requireVertexChannel(mesh, 0, "tangent", "binormal generation"),
        count = vertexCount(mesh),
        width = tangent.length / count;

    if (width === 3)
    {
        return generateBiNormals(normals, tangent, { uvHandedness: values.uvHandedness });
    }

    if (width !== 4) throw new Error("CjsGltfFormat: tangent channel must have 3 or 4 components per vertex");

    const out = new Array(count * 3);
    for (let i = 0, o = 0; i < tangent.length; i += 4, o += 3)
    {
        const b = normalize(
            [ 0, 0, 0 ],
            cross(
                [ 0, 0, 0 ],
                [ normals[o], normals[o + 1], normals[o + 2] ],
                [ tangent[i], tangent[i + 1], tangent[i + 2] ]
            )
        );
        const sign = tangent[i + 3] < 0 ? -1 : 1;
        out[o] = b[0] * sign;
        out[o + 1] = b[1] * sign;
        out[o + 2] = b[2] * sign;
    }
    return out;
}

function rebuildMissingMeshData(format, json, values)
{
    for (let meshIndex = 0; meshIndex < json.meshes.length; meshIndex++)
    {
        const
            mesh = json.meshes[meshIndex],
            common = { options: values, raw: null, json, mesh, meshIndex },
            shouldPackTangents = shouldApplyMeshRule(
                format,
                values.packTangents,
                { ...common, feature: "packTangents", channel: "tangent" }
            );

        if (!hasVertexChannel(mesh, "normal") && (shouldApplyMeshRule(
            format,
            values.rebuildMissingNormals,
            { ...common, feature: "rebuildMissingNormals", channel: "normal" }) || shouldPackTangents))
        {
            mesh.vertex.normal = generateNormals(
                requireVertexChannel(mesh, meshIndex, "position", "rebuildMissingNormals"),
                triangleFaces(mesh, meshIndex, "rebuildMissingNormals")
            );
        }

        if (!hasVertexChannel(mesh, "tangent") && (shouldApplyMeshRule(
            format,
            values.rebuildMissingTangents,
            { ...common, feature: "rebuildMissingTangents", channel: "tangent" }) || shouldPackTangents))
        {
            mesh.vertex.tangent = generateTangents(
                requireVertexChannel(mesh, meshIndex, "position", "rebuildMissingTangents"),
                requireVertexChannel(mesh, meshIndex, "normal", "rebuildMissingTangents"),
                requireVertexChannel(mesh, meshIndex, "texcoord0", "rebuildMissingTangents"),
                triangleFaces(mesh, meshIndex, "rebuildMissingTangents")
            );
        }

        if (!hasVertexChannel(mesh, "binormal") && (shouldApplyMeshRule(
            format,
            values.rebuildMissingBiNormals,
            { ...common, feature: "rebuildMissingBiNormals", channel: "binormal" }) || shouldPackTangents))
        {
            mesh.vertex.binormal = generatedBiNormalsForMesh(mesh, values);
        }

        if (shouldPackTangents)
        {
            mesh.vertex.tangent = packTangentFrames(
                requireVertexChannel(mesh, meshIndex, "normal", "packTangents"),
                tangentXyz(mesh),
                requireVertexChannel(mesh, meshIndex, "binormal", "packTangents")
            );
            mesh.vertex.normal = [];
            mesh.vertex.binormal = [];
        }
    }
}

/** Reads input using normalized format options for the glTF format reader. */
export function readWithValues(format, input, values)
{
    const parsed = parseInput(input);
    const json = parseGltfToJson(parsed.gltf, {
        binaryChunk: parsed.binaryChunk,
        source: values.source,
        buffers: values.buffers
    });
    rebuildMissingMeshData(format, json, values);
    if (values.emit === OUTPUT_CMF) return hydrateCmf(buildCmfFromShared(json), values.classes, { source: values.source });
    return hydrateJson(json, { classes: values.classes, source: values.source });
}

/** Inspects input using normalized format options for the glTF format reader. */
export function inspectWithValues(input, values)
{
    const parsed = parseInput(input);
    return inspectGltf(parsed.gltf, { format: parsed.format, source: values.source });
}

/** Converts a parsed payload into a JSON-safe value for the glTF format reader. */
export function toJsonValue(value)
{
    if (value === null || value === undefined) return value;
    if (typeof value !== "object") return value;

    if (typeof value.toJSON === "function")
    {
        const next = value.toJSON();
        if (next !== value) return toJsonValue(next);
    }

    if (Array.isArray(value)) return value.map(toJsonValue);
    if (ArrayBuffer.isView(value) && !(value instanceof DataView)) return Array.from(value);

    const out = {};
    for (const key of Object.keys(value))
    {
        out[key] = toJsonValue(value[key]);
    }
    return out;
}

/**
 * Imports a Node built-in module without exposing the specifier to any
 * bundler's static import graph.
 *
 * `await import("node:fs/promises")` written as a literal is resolved
 * eagerly by webpack/Rollup/esbuild alike when they walk the module
 * graph, breaking browser builds even though this path only ever runs
 * under Node (readFile is a Node-only convenience). Building the
 * specifier inside a `Function` body hides it from every bundler's
 * static analysis - it only exists at runtime, in the Node process that
 * actually calls readFile.
 *
 * @param {string} specifier Node built-in module specifier, e.g. "node:fs/promises".
 * @returns {Promise<any>} The imported module namespace.
 */
export function importNodeModule(specifier)
{
    // eslint-disable-next-line no-new-func
    return new Function("s", "return import(s)")(specifier);
}
