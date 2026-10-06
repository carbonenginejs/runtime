/**
 * Internal read-pipeline glue for CjsGltfFormat.
 */

import { CjsGeometryFormat } from "../../../format/CjsGeometryFormat.js";
import { toJsonWithArrayValues as toJsonValue } from "../../../format/jsonPolicies.js";
import { CLASS_KEYS as GR2_CLASS_KEYS, hydrateShared } from "./json.js";
import { buildCmfFromShared } from "../../cmf/core/shared.js";
import { CMF_CLASS_KEYS } from "../../cmf/core/constants.js";
import {
    inspectGltf,
    isGlb,
    parseGltfToShared,
    parseInput
} from "./parser.js";
import { hydrateCmf } from "../../cmf/core/utils/hydration.js";
import {
    generateBiNormals,
    generateNormals,
    generateTangents
} from "#math/mesh";
import {
    packTangentFrames
} from "#math/tangent";
import {
    cross,
    normalize
} from "#math/vec3";

export const CLASS_KEYS = Array.from(new Set([
    ...GR2_CLASS_KEYS,
    ...CMF_CLASS_KEYS
]));

export { isGlb };

export const OUTPUT_JSON = "json";
export const OUTPUT_GLTF_JSON = "gltfJson";
export const OUTPUT_SHARED = "shared";
export const OUTPUT_GR2 = "gr2";
export const OUTPUT_CMF = "cmf";

/**
 * External buffer bytes supplied by the caller: an array indexed by buffer, a Map or a record keyed by
 * buffer URI or index.
 *
 * @typedef {Array<ArrayBuffer|ArrayBufferView>|Map<(string|number), ArrayBuffer|ArrayBufferView>|Object<string, ArrayBuffer|ArrayBufferView>} CjsGltfBufferSource
 */

/**
 * Normalized glTF reader values. A rule is a boolean, or a function that receives the mesh context and
 * returns a boolean.
 *
 * @typedef {object} CjsGltfValues
 * @property {string} emit "shared", "json", "gltfJson", "gr2" or "cmf".
 * @property {string} source Source name recorded on the output.
 * @property {CjsGltfBufferSource|null} buffers External buffer bytes.
 * @property {boolean|function(object): boolean} packTangents Rule for packing tangent frames.
 * @property {string} uvHandedness "right" or "left".
 * @property {boolean|function(object): boolean} rebuildMissingNormals Rule for generating absent normals.
 * @property {boolean|function(object): boolean} rebuildMissingTangents Rule for generating absent tangents.
 * @property {boolean|function(object): boolean} rebuildMissingBiNormals Rule for generating absent binormals.
 * @property {Object<string, Function>} classes Runtime classes keyed by class key.
 */

/**
 * The parsed glTF document and its GLB binary chunk.
 *
 * @typedef {object} CjsGltfParsedInput
 * @property {object} gltf The glTF JSON document.
 * @property {Uint8Array|null} binaryChunk GLB BIN chunk, or null.
 * @property {string} format "gltf" or "glb".
 */

/**
 * Summary returned by glTF inspection.
 *
 * @typedef {object} CjsGltfInspection
 * @property {string} source Source name.
 * @property {string} format "gltf" or "glb".
 * @property {string|undefined} assetVersion The asset version string.
 * @property {number} sceneCount Scene count.
 * @property {number} nodeCount Node count.
 * @property {number} meshCount Mesh count.
 * @property {number} skinCount Skin count.
 * @property {number} animationCount Animation count.
 * @property {number} materialCount Material count.
 * @property {Array<{name: string, primitiveCount: number}>} meshes Per-mesh summaries.
 * @property {Array<{name: string, channelCount: number, samplerCount: number}>} animations Per-animation summaries.
 */

export const DEFAULT_VALUES = {
    emit: OUTPUT_SHARED,
    source: "memory",
    buffers: null,
    packTangents: false,
    uvHandedness: "right",
    rebuildMissingNormals: false,
    rebuildMissingTangents: false,
    rebuildMissingBiNormals: false,
    classes: {}
};

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

/**
 * Validates a requested runtime class key for the glTF format reader.
 *
 * @param {string} key Class key.
 * @param {string} [readerName="CjsGltfFormat"] Reader name used in errors.
 */
export function validateClassKey(key, readerName = "CjsGltfFormat")
{
    CjsGeometryFormat.validateClassKey(key, CLASS_KEYS, readerName);
}

/**
 * Validates a resolved runtime class constructor for the glTF format reader.
 *
 * @param {string} key Class key.
 * @param {Function} Class Runtime class constructor.
 * @param {string} [readerName="CjsGltfFormat"] Reader name used in errors.
 */
export function validateClass(key, Class, readerName = "CjsGltfFormat")
{
    CjsGeometryFormat.validateClass(key, Class, CLASS_KEYS, readerName);
}

/**
 * Merges caller classes over the base map; a null or undefined entry removes its key.
 *
 * @param {Object<string, Function>} base Current classes.
 * @param {Object<string, Function|null|undefined>} classes Caller classes.
 * @param {string} readerName Reader name used in errors.
 * @returns {Object<string, Function>} The merged map.
 * @throws {TypeError} When classes is not an object.
 */
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

/**
 * Accepts a boolean or function rule.
 *
 * @param {string} name Option name, for the error.
 * @param {unknown} value Rule value.
 * @param {string} readerName Reader name used in errors.
 * @returns {boolean|function(object): boolean} The rule.
 * @throws {TypeError} When value is neither a boolean nor a function.
 */
function validateRule(name, value, readerName)
{
    if (typeof value === "boolean" || typeof value === "function") return value;
    throw new TypeError(`${readerName}: ${name} must be true, false, or a function`);
}

/**
 * Maps the accepted UV handedness spellings to "right" or "left".
 *
 * @param {string|number|null|undefined} value Requested handedness.
 * @param {string} readerName Reader name used in errors.
 * @returns {string} "right" or "left".
 * @throws {TypeError} When value is not a recognized spelling.
 */
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
 *
 * @param {CjsGltfValues} base Values the options override.
 * @param {object} [options={}] Caller options; only the CjsGltfValues keys are accepted.
 * @param {string} [readerName="CjsGltfFormat"] Reader name used in errors.
 * @returns {CjsGltfValues} The normalized values.
 * @throws {TypeError} When an option is unknown or invalid, or a class emit has no classes.
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

/**
 * Validates the requested output, defaulting to "shared".
 *
 * @param {string|null|undefined} emit Requested output.
 * @param {string} readerName Reader name used in errors.
 * @returns {string} The output name.
 * @throws {TypeError} When emit is unknown.
 */
function normalizeEmit(emit, readerName)
{
    if (emit === undefined || emit === null) return OUTPUT_SHARED;
    if (emit === OUTPUT_JSON || emit === OUTPUT_GLTF_JSON || emit === OUTPUT_SHARED ||
        emit === OUTPUT_GR2 || emit === OUTPUT_CMF) return emit;
    throw new TypeError(`${readerName}: emit must be "${OUTPUT_SHARED}", "${OUTPUT_GLTF_JSON}", "${OUTPUT_GR2}", or "${OUTPUT_CMF}", got ${JSON.stringify(emit)}`);
}

/**
 * Reports whether a class map holds any constructor.
 *
 * @param {Object<string, Function>} classes Class map.
 * @returns {boolean} True when at least one entry is a function.
 */
function hasClasses(classes)
{
    return !!classes && Object.values(classes).some((Class) => typeof Class === "function");
}

/**
 * Reports whether a mesh has a non-empty vertex channel.
 *
 * @param {object} mesh Shared mesh.
 * @param {string} channel Vertex channel name.
 * @returns {boolean} True when the channel has data.
 */
function hasVertexChannel(mesh, channel)
{
    const value = mesh && mesh.vertex && mesh.vertex[channel];
    return !!value && value.length > 0;
}

/**
 * Returns a non-empty vertex channel, or fails naming the feature that needs it.
 *
 * @param {object} mesh Shared mesh.
 * @param {number} meshIndex Mesh index, for the error.
 * @param {string} channel Vertex channel name.
 * @param {string} feature Feature name, for the error.
 * @returns {ArrayLike<number>} The channel values.
 * @throws {Error} When the channel is absent or empty.
 */
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

/**
 * Concatenates the triangle indices of every index group.
 *
 * @param {object} mesh Shared mesh.
 * @param {number} meshIndex Mesh index, for the error.
 * @param {string} feature Feature name, for the error.
 * @returns {Array<number>} The triangle indices.
 * @throws {Error} When the mesh has no triangle indices.
 */
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

/**
 * Evaluates a boolean or function rule for one mesh.
 *
 * @param {import("../CjsGltfFormat.js").CjsGltfFormat|typeof import("../CjsGltfFormat.js").CjsGltfFormat} format Format profile or class, passed to a function rule.
 * @param {boolean|function(object): boolean} rule Rule to evaluate.
 * @param {object} context Mesh context passed to a function rule; `context.feature` names it in errors.
 * @returns {boolean} The rule result.
 * @throws {TypeError} When a function rule returns a non-boolean.
 */
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

/**
 * Counts a mesh's vertices from its position channel.
 *
 * @param {object} mesh Shared mesh.
 * @returns {number} The vertex count.
 */
function vertexCount(mesh)
{
    return mesh.vertex.position.length / 3;
}

/**
 * Returns the tangent channel as three components per vertex.
 *
 * @param {object} mesh Shared mesh.
 * @returns {Array<number>} XYZ tangents.
 * @throws {Error} When the tangent channel is not 3 or 4 components wide.
 */
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

/**
 * Generates binormals from normals and tangents, using the tangent w sign when present.
 *
 * @param {object} mesh Shared mesh.
 * @param {CjsGltfValues} values Reader values; `values.uvHandedness` applies to 3-wide tangents.
 * @returns {Array<number>} XYZ binormals.
 * @throws {Error} When the tangent channel is not 3 or 4 components wide.
 */
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

/**
 * Generates the absent normal, tangent and binormal channels the rules ask for, then packs tangents.
 *
 * @param {import("../CjsGltfFormat.js").CjsGltfFormat|typeof import("../CjsGltfFormat.js").CjsGltfFormat} format Format profile or class, passed to function rules.
 * @param {object} root Shared geometry root.
 * @param {object} mesh Shared mesh or LOD to update in place.
 * @param {number} meshIndex Mesh index.
 * @param {number} lodIndex LOD index.
 * @param {CjsGltfValues} values Reader values.
 */
function rebuildMeshData(format, root, mesh, meshIndex, lodIndex, values)
{
    const
        common = { options: values, raw: null, shared: root, mesh, meshIndex, lodIndex },
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

/**
 * Runs rebuildMeshData over every mesh and LOD, keeping each mesh's channels on its first LOD.
 *
 * @param {import("../CjsGltfFormat.js").CjsGltfFormat|typeof import("../CjsGltfFormat.js").CjsGltfFormat} format Format profile or class, passed to function rules.
 * @param {object} shared Shared geometry root.
 * @param {CjsGltfValues} values Reader values.
 */
function rebuildMissingMeshData(format, shared, values)
{
    for (let meshIndex = 0; meshIndex < shared.meshes.length; meshIndex++)
    {
        const mesh = shared.meshes[meshIndex];
        const lods = mesh.lods?.length ? mesh.lods : [ mesh ];
        for (let lodIndex = 0; lodIndex < lods.length; lodIndex++)
        {
            rebuildMeshData(format, shared, lods[lodIndex], meshIndex, lodIndex, values);
        }
        if (mesh.lods?.length)
        {
            mesh.vertex = mesh.lods[0].vertex;
            mesh.indices = mesh.lods[0].indices;
        }
    }
}

/**
 * Reads input using normalized format options for the glTF format reader.
 *
 * @param {import("../CjsGltfFormat.js").CjsGltfFormat|typeof import("../CjsGltfFormat.js").CjsGltfFormat} format Format profile or class, passed to function rules.
 * @param {object|string|ArrayBuffer|ArrayBufferView} input glTF object, JSON text or bytes, or GLB bytes.
 * @param {CjsGltfValues} values Normalized reader values.
 * @returns {object} The CMF, JSON or hydrated shared output that values.emit selects.
 */
export function readWithValues(format, input, values)
{
    const parsed = parseInput(input);
    const shared = parseGltfToShared(parsed.gltf, {
        binaryChunk: parsed.binaryChunk,
        source: values.source,
        buffers: values.buffers
    });
    rebuildMissingMeshData(format, shared, values);
    if (values.emit === OUTPUT_CMF)
    {
        return hydrateCmf(
            buildCmfFromShared(shared),
            values.classes,
            { source: values.source },
            "CjsGltfFormat CMF"
        );
    }
    if (values.emit === OUTPUT_JSON || values.emit === OUTPUT_GLTF_JSON)
    {
        return toJsonValue(shared);
    }
    return hydrateShared(shared, { classes: values.classes, source: values.source });
}

/**
 * Inspects input using normalized format options for the glTF format reader.
 *
 * @param {object|string|ArrayBuffer|ArrayBufferView} input glTF object, JSON text or bytes, or GLB bytes.
 * @param {CjsGltfValues} values Normalized reader values; `values.source` is reported.
 * @returns {CjsGltfInspection} The document summary.
 */
export function inspectWithValues(input, values)
{
    const parsed = parseInput(input);
    return inspectGltf(parsed.gltf, { format: parsed.format, source: values.source });
}

/** The shared JSON policy for this reader, under the name its callers use. */
export { toJsonValue };
