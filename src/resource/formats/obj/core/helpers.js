/**
 * Internal read-pipeline glue for CjsObjFormat.
 */

import { hydrateJson } from "./json.js";
import { parseObjText } from "./parser.js";
import {
    generateBiNormals,
    generateNormals,
    generateTangents
} from "#math/mesh";
import {
    packTangentFrames
} from "#math/tangent";

export const GR2_CLASS_KEYS = Object.freeze([
    "Root",
    "Mesh",
    "BoneBinding",
    "IndexGroup",
    "MorphTarget",
    "Model",
    "Skeleton",
    "Bone",
    "Animation",
    "TrackGroup",
    "TransformTrack",
    "Curve"
]);

export const CMF_CLASS_KEYS = Object.freeze([
    "Root",
    "Section",
    "Metadata",
    "MetadataEntry",
    "Mesh",
    "IndexGroup",
    "VertexElement",
    "MeshLod",
    "MeshArea",
    "LodMeshArea",
    "BoneBinding",
    "MorphTargets",
    "MorphTarget",
    "LodMorphTarget",
    "AudioOcclusionMesh",
    "Skeleton",
    "BoneMask",
    "BoneWeight",
    "Animation",
    "AnimationChannel",
    "AnimationCurve"
]);

export const CLASS_KEYS = Object.freeze(Array.from(new Set([
    ...GR2_CLASS_KEYS,
    ...CMF_CLASS_KEYS
])));

export const OUTPUT_JSON = "json";
export const OUTPUT_OBJ_JSON = "objJson";
export const OUTPUT_SHARED = "shared";
export const OUTPUT_GR2 = "gr2";
export const OUTPUT_CMF = "cmf";

export const DEFAULT_VALUES = Object.freeze({
    emit: OUTPUT_OBJ_JSON,
    source: "memory",
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
    "packTangents",
    "uvHandedness",
    "rebuildMissingNormals",
    "rebuildMissingTangents",
    "rebuildMissingBiNormals",
    "classes"
]);

/**
 * Validate a `classes` node key against {@link CLASS_KEYS}.
 *
 * @param {string} key Candidate node key.
 * @param {string} [readerName] Format name used in thrown errors.
 */
export function validateClassKey(key, readerName = "CjsObjFormat")
{
    if (!CLASS_KEYS.includes(key))
    {
        throw new Error(`${readerName}: unknown class key ${JSON.stringify(key)}; expected one of ${CLASS_KEYS.join(", ")}`);
    }
}

/**
 * Validate a single `classes` entry.
 *
 * @param {string} key Node key.
 * @param {Function} Class Candidate constructor.
 * @param {string} [readerName] Format name used in thrown errors.
 */
export function validateClass(key, Class, readerName = "CjsObjFormat")
{
    validateClassKey(key, readerName);
    if (typeof Class !== "function")
    {
        throw new TypeError(`${readerName}: class ${JSON.stringify(key)} must be a constructor`);
    }
}

/**
 * Merge and validate a class map.
 *
 * @param {object} base Current classes map.
 * @param {object} classes Incoming classes map.
 * @param {string} readerName Format name used in thrown errors.
 * @returns {object} Merged classes.
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
 * Validate a boolean/function mesh rule.
 *
 * @param {string} name Option name.
 * @param {any} value Candidate option value.
 * @param {string} readerName Format name used in thrown errors.
 * @returns {boolean|Function} Validated rule.
 */
function validateRule(name, value, readerName)
{
    if (typeof value === "boolean" || typeof value === "function") return value;
    throw new TypeError(`${readerName}: ${name} must be true, false, or a function`);
}

/**
 * Normalize the generated UV/tangent handedness option.
 *
 * @param {any} value Candidate option value.
 * @param {string} readerName Format name used in thrown errors.
 * @returns {"right"|"left"} Normalized handedness.
 */
function normalizeUvHandedness(value, readerName)
{
    if (value === undefined || value === null) return DEFAULT_VALUES.uvHandedness;
    if (value === "right" || value === 1 || value === "positive") return "right";
    if (value === "left" || value === -1 || value === "negative") return "left";
    throw new TypeError(`${readerName}: uvHandedness must be "right" or "left"`);
}

/**
 * Merge format values over a base set and validate them.
 *
 * @param {object} base Current values.
 * @param {object} [options] Values to merge in.
 * @param {string} [readerName] Format name used in error messages.
 * @returns {object} A validated copy of the merged values.
 */
export function normalizeValues(base, options = {}, readerName = "CjsObjFormat")
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
    if (emit === undefined || emit === null || emit === OUTPUT_JSON || emit === OUTPUT_OBJ_JSON || emit === OUTPUT_SHARED)
    {
        return OUTPUT_OBJ_JSON;
    }
    if (emit === OUTPUT_GR2 || emit === OUTPUT_CMF) return emit;
    throw new TypeError(`${readerName}: emit must be "${OUTPUT_SHARED}", "${OUTPUT_OBJ_JSON}", "${OUTPUT_GR2}", or "${OUTPUT_CMF}", got ${JSON.stringify(emit)}`);
}

function hasClasses(classes)
{
    return !!classes && Object.values(classes).some((Class) => typeof Class === "function");
}

/**
 * Normalize caller input into OBJ text.
 *
 * @param {string|Uint8Array|ArrayBuffer|DataView} input Candidate OBJ text.
 * @returns {string} OBJ text.
 */
export function toText(input)
{
    if (typeof input === "string") return input;
    if (typeof ArrayBuffer !== "undefined" && input instanceof ArrayBuffer)
    {
        return new TextDecoder().decode(new Uint8Array(input));
    }
    if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(input))
    {
        return new TextDecoder().decode(new Uint8Array(input.buffer, input.byteOffset, input.byteLength));
    }
    throw new TypeError("CjsObjFormat: input must be OBJ text or UTF-8 bytes");
}

/**
 * Whether a shared-schema vertex channel contains data.
 *
 * @param {object} mesh Mesh record.
 * @param {string} channel Vertex channel name.
 * @returns {boolean} True when channel exists and has values.
 */
function hasVertexChannel(mesh, channel)
{
    const value = mesh && mesh.vertex && mesh.vertex[channel];
    return !!value && value.length > 0;
}

/**
 * Require one vertex channel.
 *
 * @param {object} mesh Mesh record.
 * @param {number} meshIndex Mesh index.
 * @param {string} channel Vertex channel name.
 * @param {string} feature Feature name.
 * @returns {number[]} Channel values.
 */
function requireVertexChannel(mesh, meshIndex, channel, feature)
{
    const value = mesh && mesh.vertex && mesh.vertex[channel];
    if (!value || value.length === 0)
    {
        const name = mesh && mesh.name ? JSON.stringify(mesh.name) : `#${meshIndex}`;
        throw new Error(`CjsObjFormat: ${feature} requires mesh.vertex.${channel} for mesh ${name}`);
    }
    return value;
}

/**
 * Gather all triangle indices from a mesh's index groups.
 *
 * @param {object} mesh Mesh record.
 * @param {number} meshIndex Mesh index.
 * @param {string} feature Feature name.
 * @returns {number[]} Flat triangle indices.
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
        throw new Error(`CjsObjFormat: ${feature} requires triangle indices for mesh ${name}`);
    }
    return faces;
}

/**
 * Evaluate a boolean/function mesh rule.
 *
 * @param {object|Function} format Format instance or constructor.
 * @param {boolean|Function} rule Rule value.
 * @param {object} context Rule context.
 * @returns {boolean} Whether the rule applies.
 */
function shouldApplyMeshRule(format, rule, context)
{
    if (typeof rule === "function")
    {
        const result = rule({ format, reader: format, ...context });
        if (typeof result !== "boolean")
        {
            throw new TypeError(`CjsObjFormat: ${context.feature} rule must return true or false`);
        }
        return result;
    }
    return rule;
}

/**
 * Apply missing-channel rebuild options to a shared JSON graph.
 *
 * @param {object|Function} format Format instance or constructor.
 * @param {object} json Shared JSON graph.
 * @param {object} values Normalized format values.
 */
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

        if (!hasVertexChannel(mesh, "normal") && shouldApplyMeshRule(
            format,
            values.rebuildMissingNormals,
            { ...common, feature: "rebuildMissingNormals", channel: "normal" }))
        {
            mesh.vertex.normal = generateNormals(
                requireVertexChannel(mesh, meshIndex, "position", "rebuildMissingNormals"),
                triangleFaces(mesh, meshIndex, "rebuildMissingNormals")
            );
        }
        else if (!hasVertexChannel(mesh, "normal") && shouldPackTangents)
        {
            mesh.vertex.normal = generateNormals(
                requireVertexChannel(mesh, meshIndex, "position", "packTangents"),
                triangleFaces(mesh, meshIndex, "packTangents")
            );
        }

        if (!hasVertexChannel(mesh, "tangent") && shouldApplyMeshRule(
            format,
            values.rebuildMissingTangents,
            { ...common, feature: "rebuildMissingTangents", channel: "tangent" }))
        {
            mesh.vertex.tangent = generateTangents(
                requireVertexChannel(mesh, meshIndex, "position", "rebuildMissingTangents"),
                requireVertexChannel(mesh, meshIndex, "normal", "rebuildMissingTangents"),
                requireVertexChannel(mesh, meshIndex, "texcoord0", "rebuildMissingTangents"),
                triangleFaces(mesh, meshIndex, "rebuildMissingTangents"),
                { uvHandedness: values.uvHandedness }
            );
        }
        else if (!hasVertexChannel(mesh, "tangent") && shouldPackTangents)
        {
            mesh.vertex.tangent = generateTangents(
                requireVertexChannel(mesh, meshIndex, "position", "packTangents"),
                requireVertexChannel(mesh, meshIndex, "normal", "packTangents"),
                requireVertexChannel(mesh, meshIndex, "texcoord0", "packTangents"),
                triangleFaces(mesh, meshIndex, "packTangents"),
                { uvHandedness: values.uvHandedness }
            );
        }

        if (!hasVertexChannel(mesh, "binormal") && shouldApplyMeshRule(
            format,
            values.rebuildMissingBiNormals,
            { ...common, feature: "rebuildMissingBiNormals", channel: "binormal" }))
        {
            mesh.vertex.binormal = generateBiNormals(
                requireVertexChannel(mesh, meshIndex, "normal", "rebuildMissingBiNormals"),
                requireVertexChannel(mesh, meshIndex, "tangent", "rebuildMissingBiNormals"),
                { uvHandedness: values.uvHandedness }
            );
        }
        else if (!hasVertexChannel(mesh, "binormal") && shouldPackTangents)
        {
            mesh.vertex.binormal = generateBiNormals(
                requireVertexChannel(mesh, meshIndex, "normal", "packTangents"),
                requireVertexChannel(mesh, meshIndex, "tangent", "packTangents"),
                { uvHandedness: values.uvHandedness }
            );
        }

        if (shouldPackTangents)
        {
            mesh.vertex.tangent = packTangentFrames(
                requireVertexChannel(mesh, meshIndex, "normal", "packTangents"),
                requireVertexChannel(mesh, meshIndex, "tangent", "packTangents"),
                requireVertexChannel(mesh, meshIndex, "binormal", "packTangents")
            );
            mesh.vertex.normal = [];
            mesh.vertex.binormal = [];
        }
    }
}

/**
 * Read OBJ text and return the shared JSON schema.
 *
 * @param {object|Function} format Format instance or constructor.
 * @param {string|Uint8Array|ArrayBuffer|DataView} input OBJ text or UTF-8 bytes.
 * @param {object} values Normalized format values.
 * @param {string} readerName Format name.
 * @returns {object} Shared JSON graph.
 */
export function readWithValues(format, input, values, readerName = "CjsObjFormat")
{
    const text = toText(input);
    const json = parseObjText(text, { source: values.source });
    rebuildMissingMeshData(format, json, values);
    if (values.emit === OUTPUT_CMF) return hydrateCmf(buildCmfFromShared(json), values.classes, { source: values.source });
    return hydrateJson(json, { classes: values.classes, source: values.source });
}

function buildCmfFromShared(root)
{
    return {
        version: 1,
        metadata: null,
        meshes: (root.meshes ?? []).map((mesh) => buildCmfMesh(mesh)),
        skeletons: [],
        animations: []
    };
}

function buildCmfMesh(mesh)
{
    const
        vertex = mesh.vertex ?? {},
        stride = estimateVertexStride(vertex),
        vertexCount = stride === 0 ? 0 : Math.floor((vertex.position ?? []).length / 3),
        indices = mesh.indices ?? [];

    return {
        name: mesh.name ?? "",
        decl: buildCmfDecl(vertex),
        lods: [ {
            vb: { index: 1, offset: 0, size: vertexCount * stride, stride },
            ib: { index: 2, offset: 0, size: totalIndexCount(indices) * bytesPerIndex(indices), stride: bytesPerIndex(indices) },
            areas: indices.map((group, index) => ({
                firstElement: firstTriangle(indices, index),
                elementCount: Math.floor((group.faces ?? []).length / 3)
            })),
            morphTargets: [],
            threshold: 0xffffffff,
            vertex,
            indices
        } ],
        areas: indices.map((group) => ({
            name: group.name ?? "",
            bounds: cmfBounds(mesh),
            bones: [],
            affectedByBones: false,
            affectedByMorphTargets: false
        })),
        boneBindings: [],
        morphTargets: { decl: [], targets: [] },
        uvDensities: [],
        bounds: cmfBounds(mesh),
        audioOcclusionMesh: {
            vertices: [],
            indices: [],
            bounds: { min: [ 0, 0, 0 ], max: [ 0, 0, 0 ] }
        },
        topology: "TriangleList",
        skeleton: null,
        vertex,
        indices
    };
}

function buildCmfDecl(vertex)
{
    const decl = [];
    let offset = 0;
    for (const channel of [
        [ "position", "Position", 3 ],
        [ "normal", "Normal", 3 ],
        [ "tangent", "Tangent", 3 ],
        [ "binormal", "Binormal", 3 ],
        [ "texcoord0", "TexCoord", 2, 0 ],
        [ "texcoord1", "TexCoord", 2, 1 ],
        [ "color0", "Color", 4, 0 ],
        [ "blendIndice", "BoneIndices", 4, 0, "UInt16" ],
        [ "blendWeight", "BoneWeights", 4, 0 ]
    ])
    {
        const [ name, usage, elementCount, usageIndex = 0, type = "Float32" ] = channel;
        if (!Array.isArray(vertex[name]) || vertex[name].length === 0) continue;
        decl.push({ usage, usageIndex, type, elementCount, offset });
        offset += elementCount * elementTypeSize(type);
    }
    return decl;
}

function estimateVertexStride(vertex)
{
    return buildCmfDecl(vertex).reduce((stride, element) => Math.max(stride, element.offset + element.elementCount * elementTypeSize(element.type)), 0);
}

function elementTypeSize(type)
{
    return type === "Float32" ? 4 : type.includes("16") ? 2 : 1;
}

function totalIndexCount(indices)
{
    return indices.reduce((total, group) => total + (group.faces?.length ?? 0), 0);
}

function bytesPerIndex(indices)
{
    return indices.some((group) => group.bytesPerIndex === 4 || (group.faces ?? []).some((index) => index > 0xffff)) ? 4 : 2;
}

function firstTriangle(indices, areaIndex)
{
    let first = 0;
    for (let i = 0; i < areaIndex; i++) first += Math.floor((indices[i].faces ?? []).length / 3);
    return first;
}

function cmfBounds(mesh)
{
    return {
        min: mesh.minBounds ?? [ 0, 0, 0 ],
        max: mesh.maxBounds ?? [ 0, 0, 0 ]
    };
}

function hydrateCmf(root, classes, hydrationOptions = {})
{
    const hydrationClasses = createHydrationClasses(classes, hydrationOptions);
    return hydrateCmfNode("Root", {
        ...root,
        metadata: root.metadata ? hydrateCmfNode("Metadata", root.metadata, hydrationClasses) : null,
        meshes: root.meshes.map((mesh) => hydrateCmfMesh(mesh, hydrationClasses)),
        skeletons: root.skeletons.map((skeleton) => hydrateCmfNode("Skeleton", skeleton, hydrationClasses)),
        animations: root.animations.map((animation) => hydrateCmfNode("Animation", animation, hydrationClasses))
    }, hydrationClasses, hydrationOptions);
}

function hydrateCmfMesh(mesh, classes)
{
    return hydrateCmfNode("Mesh", {
        ...mesh,
        decl: mesh.decl.map((element) => hydrateCmfNode("VertexElement", element, classes)),
        lods: mesh.lods.map((lod) => hydrateCmfNode("MeshLod", {
            ...lod,
            areas: lod.areas.map((area) => hydrateCmfNode("LodMeshArea", area, classes)),
            morphTargets: lod.morphTargets.map((target) => hydrateCmfNode("LodMorphTarget", target, classes))
        }, classes)),
        areas: mesh.areas.map((area) => hydrateCmfNode("MeshArea", area, classes)),
        boneBindings: mesh.boneBindings.map((binding) => hydrateCmfNode("BoneBinding", binding, classes)),
        morphTargets: hydrateCmfNode("MorphTargets", {
            decl: mesh.morphTargets.decl.map((element) => hydrateCmfNode("VertexElement", element, classes)),
            targets: mesh.morphTargets.targets.map((target) => hydrateCmfNode("MorphTarget", target, classes))
        }, classes),
        audioOcclusionMesh: hydrateCmfNode("AudioOcclusionMesh", mesh.audioOcclusionMesh, classes)
    }, classes);
}

function hydrateCmfNode(type, fields, classes, hydrationOptions = {})
{
    const Class = classes?.[type];
    const options = Object.keys(hydrationOptions).length > 0 ? hydrationOptions : classes?.__hydrationOptions || {};
    return Class ? populateCmfNode(new Class(), fields, options) : fields;
}

function populateCmfNode(instance, fields, hydrationOptions = {})
{
    if (!instance || typeof instance.SetValues !== "function")
    {
        throw new TypeError("CjsObjFormat CMF class population requires classes to implement SetValues(values)");
    }
    instance.SetValues(fields, { ...hydrationOptions, skipUpdate: true, skipEvents: true });
    return instance;
}

function createHydrationClasses(classes, hydrationOptions)
{
    const map = Object.create(classes || null);
    Object.defineProperty(map, "__hydrationOptions", { value: hydrationOptions, enumerable: false });
    return map;
}

/**
 * Inspect OBJ text without hydrating classes or applying rebuild options.
 *
 * @param {string|Uint8Array|ArrayBuffer|DataView} input OBJ text or UTF-8 bytes.
 * @param {object} values Normalized format values.
 * @returns {object} Plain summary data.
 */
export function inspectWithValues(input, values)
{
    const json = parseObjText(toText(input), { source: values.source });
    return {
        source: json.grannyFileSource,
        format: "obj",
        meshCount: json.meshes.length,
        triangleCount: json.meshes.reduce((total, mesh) =>
            total + mesh.indices.reduce((meshTotal, group) => meshTotal + group.faces.length / 3, 0), 0),
        meshes: json.meshes.map(mesh => ({
            name: mesh.name,
            vertexCount: mesh.vertex.position.length / 3,
            triangleCount: mesh.indices.reduce((total, group) => total + group.faces.length / 3, 0),
            indexGroupCount: mesh.indices.length,
            indexGroupNames: mesh.indices.map(group => group.name),
            hasNormals: mesh.vertex.normal.length > 0,
            hasTangents: mesh.vertex.tangent.length > 0,
            hasBiNormals: mesh.vertex.binormal.length > 0,
            hasTexcoord0: mesh.vertex.texcoord0.length > 0
        }))
    };
}

/**
 * Convert format output to plain JSON-compatible data.
 *
 * @param {any} value Format output.
 * @returns {any} JSON-compatible value.
 */
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

