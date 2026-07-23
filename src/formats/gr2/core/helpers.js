import { readGr2Raw } from "./reader.js";
import { emitJson, CLASS_KEYS as GR2_CLASS_KEYS } from "./json.js";
import { tangents } from "./tangents.js";
import { decompressAnimationCurves } from "./curves.js";
import { buildCmfFromShared, CMF_CLASS_KEYS, hydrateCmf } from "./targets.js";

export const CLASS_KEYS = Object.freeze(Array.from(new Set([
    ...GR2_CLASS_KEYS,
    ...CMF_CLASS_KEYS
])));

export const OUTPUT_JSON = "json";
export const OUTPUT_GR2 = "gr2";
export const OUTPUT_GR2_JSON = "gr2Json";
export const OUTPUT_CMF = "cmf";
export const OUTPUT_RAW = "raw";

export const DEFAULT_VALUES = Object.freeze({
    emit: OUTPUT_JSON,
    decompressCurves: false,
    unpackTangents: false,
    rebuildMissingNormals: false,
    rebuildMissingTangents: false,
    rebuildMissingBiNormals: false,
    classes: Object.freeze({})
});

const OPTION_KEYS = new Set([
    "emit",
    "decompressCurves",
    "unpackTangents",
    "rebuildMissingNormals",
    "rebuildMissingTangents",
    "rebuildMissingBiNormals",
    "classes"
]);

function normalizeEmit(emit)
{
    if (emit === undefined || emit === OUTPUT_JSON) return OUTPUT_JSON;
    if (emit === OUTPUT_GR2_JSON) return OUTPUT_GR2_JSON;
    if (emit === OUTPUT_GR2) return OUTPUT_GR2;
    if (emit === OUTPUT_CMF) return OUTPUT_CMF;
    if (emit === OUTPUT_RAW) return OUTPUT_RAW;
    throw new Error(`CjsFormatGr2 unknown emit value "${emit}"`);
}

function hasOwn(value, key)
{
    return Object.prototype.hasOwnProperty.call(value, key);
}

function classMap(values)
{
    return values && values.classes ? values.classes : {};
}

function cloneValues(values)
{
    return {
        emit: values.emit,
        decompressCurves: values.decompressCurves,
        unpackTangents: values.unpackTangents,
        rebuildMissingNormals: values.rebuildMissingNormals,
        rebuildMissingTangents: values.rebuildMissingTangents,
        rebuildMissingBiNormals: values.rebuildMissingBiNormals,
        classes: { ...classMap(values) }
    };
}

function assertKnownOptions(options)
{
    for (const key of Object.keys(options))
    {
        if (!OPTION_KEYS.has(key))
        {
            throw new TypeError(`CjsFormatGr2 unknown option "${key}"`);
        }
    }
}

function validateBoolean(name, value)
{
    if (typeof value !== "boolean")
    {
        throw new TypeError(`CjsFormatGr2 ${name} option must be true or false`);
    }
    return value;
}

function validateRule(name, value)
{
    if (typeof value === "boolean" || typeof value === "function") return value;
    throw new TypeError(`CjsFormatGr2 ${name} option must be true, false, or a function`);
}

export function validateClassKey(key)
{
    if (!CLASS_KEYS.includes(key))
    {
        throw new Error(`CjsFormatGr2 unknown class type "${key}"`);
    }
}

export function validateClass(type, Class)
{
    validateClassKey(type);
    if (typeof Class !== "function")
    {
        throw new TypeError(`CjsFormatGr2 class "${type}" must be a constructor`);
    }
}

function mergeClasses(values, classes)
{
    if (!classes || typeof classes !== "object")
    {
        throw new TypeError("CjsFormatGr2 classes option must be an object");
    }

    const next = { ...values.classes };
    for (const [ type, Class ] of Object.entries(classes))
    {
        validateClass(type, Class);
        next[type] = Class;
    }
    values.classes = next;
}

function optionValue(options, keys)
{
    for (const key of keys)
    {
        if (hasOwn(options, key)) return options[key];
    }
    return undefined;
}

export function normalizeValues(base = DEFAULT_VALUES, options = {})
{
    if (!options || typeof options !== "object")
    {
        throw new TypeError("CjsFormatGr2 options must be an object");
    }

    assertKnownOptions(options);

    const values = cloneValues(base);

    if (hasOwn(options, "emit")) values.emit = normalizeEmit(options.emit);
    if (hasOwn(options, "decompressCurves"))
    {
        values.decompressCurves = validateBoolean("decompressCurves", options.decompressCurves);
    }

    const unpackTangents = optionValue(options, [ "unpackTangents" ]);
    if (unpackTangents !== undefined)
    {
        values.unpackTangents = validateRule("unpackTangents", unpackTangents);
    }

    const rebuildMissingNormals = optionValue(options, [ "rebuildMissingNormals" ]);
    if (rebuildMissingNormals !== undefined)
    {
        values.rebuildMissingNormals = validateRule("rebuildMissingNormals", rebuildMissingNormals);
    }

    const rebuildMissingTangents = optionValue(options, [ "rebuildMissingTangents" ]);
    if (rebuildMissingTangents !== undefined)
    {
        values.rebuildMissingTangents = validateRule("rebuildMissingTangents", rebuildMissingTangents);
    }

    const rebuildMissingBiNormals = optionValue(options, [ "rebuildMissingBiNormals" ]);
    if (rebuildMissingBiNormals !== undefined)
    {
        values.rebuildMissingBiNormals = validateRule("rebuildMissingBiNormals", rebuildMissingBiNormals);
    }

    if (hasOwn(options, "classes"))
    {
        mergeClasses(values, options.classes);
    }

    if ((values.emit === OUTPUT_GR2 || values.emit === OUTPUT_CMF) && !hasClasses(values.classes))
    {
        throw new TypeError(`CjsFormatGr2 emit "${values.emit}" requires explicit classes`);
    }

    return values;
}

function hasClasses(classes)
{
    return !!classes && Object.values(classes).some((Class) => typeof Class === "function");
}

function isRawGr2Result(value)
{
    return !!value && typeof value === "object" && "fileInfo" in value &&
        typeof value.version === "number";
}

/**
 * Normalizes GR2 input into a Uint8Array. readGr2Raw indexes `.buffer`,
 * `.byteOffset`, `.byteLength` and calls `.subarray()`, so a raw
 * ArrayBuffer (e.g. from `fetch(...).then(r => r.arrayBuffer())`, which
 * is how ccpwgl's resource loader supplies bytes) must be wrapped in a
 * view before it reaches readGr2Raw, not passed straight through.
 *
 * @param {Uint8Array|ArrayBuffer|Buffer|DataView} input GR2 bytes.
 * @returns {Uint8Array} A Uint8Array view over the same bytes.
 */
function toBytes(input)
{
    if (input instanceof Uint8Array) return input;
    if (typeof ArrayBuffer !== "undefined" && input instanceof ArrayBuffer) return new Uint8Array(input);
    if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    throw new TypeError("CjsFormatGr2: input must be GR2 bytes (Uint8Array, Buffer, DataView or ArrayBuffer)");
}

export function readRawInput(input)
{
    return isRawGr2Result(input) ? input : readGr2Raw(toBytes(input));
}

function meshName(mesh, meshIndex)
{
    return mesh && mesh.name ? `"${mesh.name}"` : `#${meshIndex}`;
}

function vertexChannel(mesh, channel)
{
    return mesh && mesh.vertex && mesh.vertex[channel];
}

function hasVertexChannel(mesh, channel)
{
    const value = vertexChannel(mesh, channel);
    return !!value && value.length > 0;
}

function requireVertexChannel(mesh, meshIndex, channel, feature)
{
    const value = vertexChannel(mesh, channel);
    if (!value || value.length === 0)
    {
        throw new Error(`CjsFormatGr2 ${feature} requires mesh.vertex.${channel} for mesh ${meshName(mesh, meshIndex)}`);
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
        throw new Error(`CjsFormatGr2 ${feature} requires triangle indices for mesh ${meshName(mesh, meshIndex)}`);
    }

    return faces;
}

function shouldApplyMeshRule(reader, rule, context)
{
    const fullContext = { reader, ...context };

    if (typeof rule === "function")
    {
        const result = rule(fullContext);
        if (typeof result !== "boolean")
        {
            throw new TypeError(`CjsFormatGr2 ${context.feature} rule must return true or false`);
        }
        return result;
    }

    return rule;
}

function unpackMeshTangents(reader, json, raw, values)
{
    for (let meshIndex = 0; meshIndex < (json.meshes || []).length; meshIndex++)
    {
        const mesh = json.meshes[meshIndex];
        if (shouldApplyMeshRule(reader, values.unpackTangents, {
            options: values, raw, json, mesh, meshIndex,
            feature: "unpackTangents",
            channel: "tangent"
        }))
        {
            tangents.unpack(mesh);
        }
    }
}

function rebuildMeshNormals(mesh, meshIndex)
{
    const
        positions = requireVertexChannel(mesh, meshIndex, "position", "rebuildMissingNormals"),
        faces = triangleFaces(mesh, meshIndex, "rebuildMissingNormals");

    mesh.vertex.normal = Array.from(tangents.generateNormals(positions, faces));
}

function rebuildMeshTangents(mesh, meshIndex)
{
    const
        positions = requireVertexChannel(mesh, meshIndex, "position", "rebuildMissingTangents"),
        normals = requireVertexChannel(mesh, meshIndex, "normal", "rebuildMissingTangents"),
        uvs = requireVertexChannel(mesh, meshIndex, "texcoord0", "rebuildMissingTangents"),
        faces = triangleFaces(mesh, meshIndex, "rebuildMissingTangents");

    mesh.vertex.tangent = Array.from(tangents.generateTangents(positions, normals, uvs, faces));
}

function rebuildMeshBiNormals(mesh, meshIndex)
{
    const
        normals = requireVertexChannel(mesh, meshIndex, "normal", "rebuildMissingBiNormals"),
        tangentValues = requireVertexChannel(mesh, meshIndex, "tangent", "rebuildMissingBiNormals");

    mesh.vertex.binormal = tangents.generateBiNormals(normals, tangentValues);
}

function rebuildMissingMeshData(reader, json, raw, values)
{
    for (let meshIndex = 0; meshIndex < (json.meshes || []).length; meshIndex++)
    {
        const mesh = json.meshes[meshIndex];
        if (!hasVertexChannel(mesh, "normal") && shouldApplyMeshRule(
            reader,
            values.rebuildMissingNormals,
            { options: values, raw, json, mesh, meshIndex, feature: "rebuildMissingNormals", channel: "normal" }))
        {
            rebuildMeshNormals(mesh, meshIndex);
        }

        if (!hasVertexChannel(mesh, "tangent") && shouldApplyMeshRule(
            reader,
            values.rebuildMissingTangents,
            { options: values, raw, json, mesh, meshIndex, feature: "rebuildMissingTangents", channel: "tangent" }))
        {
            rebuildMeshTangents(mesh, meshIndex);
        }

        if (!hasVertexChannel(mesh, "binormal") && shouldApplyMeshRule(
            reader,
            values.rebuildMissingBiNormals,
            { options: values, raw, json, mesh, meshIndex, feature: "rebuildMissingBiNormals", channel: "binormal" }))
        {
            rebuildMeshBiNormals(mesh, meshIndex);
        }
    }
}

function processMeshData(reader, json, raw, values)
{
    unpackMeshTangents(reader, json, raw, values);
    rebuildMissingMeshData(reader, json, raw, values);
}

function buildJson(reader, raw, values)
{
    const json = emitJson(raw.fileInfo, raw.version, {
        classes: values.emit === OUTPUT_GR2 || ((values.emit === OUTPUT_JSON || values.emit === OUTPUT_GR2_JSON) && hasClasses(values.classes))
            ? values.classes
            : {}
    });

    if (values.decompressCurves)
    {
        decompressAnimationCurves(json);
    }

    processMeshData(reader, json, raw, values);

    return json;
}

export function readWithValues(reader, input, values)
{
    const parsed = readRawInput(input);
    if (values.emit === OUTPUT_RAW) return parsed;
    const json = buildJson(reader, parsed, values);
    return values.emit === OUTPUT_CMF
        ? hydrateCmf(buildCmfFromShared(json), values.classes, { source: values.source })
        : json;
}

export function toJsonValue(value, seen = new WeakSet())
{
    if (value === null || typeof value !== "object") return value;
    if (ArrayBuffer.isView(value)) return Array.from(value, item => toJsonValue(item, seen));
    if (Array.isArray(value)) return value.map(item => toJsonValue(item, seen));

    if (seen.has(value))
    {
        throw new TypeError("CjsFormatGr2.toJSON cannot convert circular data");
    }

    if (typeof value.toJSON === "function")
    {
        seen.add(value);
        const json = toJsonValue(value.toJSON(), seen);
        seen.delete(value);
        return json;
    }

    seen.add(value);
    const out = {};
    for (const key of Object.keys(value))
    {
        out[key] = toJsonValue(value[key], seen);
    }
    seen.delete(value);
    return out;
}

export function inspectRawGr2Result(parsed)
{
    const
        fileInfo = parsed.fileInfo || {},
        count = value => Array.isArray(value) ? value.filter(Boolean).length : 0;

    return {
        reader: "CjsFormatGr2",
        format: "gr2",
        version: parsed.version | 0,
        sectionCount: parsed.secCount | 0,
        source: fileInfo.FromFileName ?? "",
        counts: {
            meshes: count(fileInfo.Meshes),
            models: count(fileInfo.Models),
            animations: count(fileInfo.Animations),
            materials: count(fileInfo.Materials),
            textures: count(fileInfo.Textures)
        }
    };
}
