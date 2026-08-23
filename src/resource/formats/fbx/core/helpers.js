import {
    generateBiNormals,
    generateNormals,
    generateTangents
} from "#math/mesh";

export const OUTPUT_CMF = "cmf";
export const OUTPUT_GR2 = "gr2";
export const OUTPUT_RAW = "raw";
export const OUTPUT_JSON = "json";
export const OUTPUT_FBX_JSON = "fbxJson";

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

export const DEFAULT_VALUES = Object.freeze({
    emit: OUTPUT_RAW,
    inputType: "fbx",
    source: "",
    flipV: true,
    classes: Object.freeze({}),
    maxBytes: 256 * 1024 * 1024,
    maxNodes: 250000,
    maxDepth: 128,
    maxProperties: 4096,
    maxArrayLength: 20000000
});

const BINARY_SIGNATURE = "Kaydara FBX Binary  \u0000\u001a\u0000";
const BINARY_HEADER_SIZE = 27;
const NODE_HEADER_32_SIZE = 13;
const NODE_HEADER_64_SIZE = 25;
const ASCII_PREFIX_LENGTH = 8192;
const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const TEXT_DECODER = new TextDecoder("utf-8");
const OPTION_KEYS = new Set([
    "emit",
    "inputType",
    "source",
    "flipV",
    "classes",
    "maxBytes",
    "maxNodes",
    "maxDepth",
    "maxProperties",
    "maxArrayLength"
]);
const DEFLATE_CODE_LENGTH_ORDER = Object.freeze([ 16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15 ]);
const DEFLATE_LENGTH_BASE = Object.freeze([ 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258 ]);
const DEFLATE_LENGTH_EXTRA = Object.freeze([ 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0 ]);
const DEFLATE_DISTANCE_BASE = Object.freeze([ 1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577 ]);
const DEFLATE_DISTANCE_EXTRA = Object.freeze([ 0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13 ]);
const ADLER32_MOD = 65521;
const TRIANGULATION_EPSILON = 1e-10;
const IDENTITY_MATRIX4 = Object.freeze([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
]);
const DEFAULT_ROTATION_ORDER = "XYZ";
const FBX_ROTATION_ORDERS = Object.freeze([ "XYZ", "XZY", "YZX", "YXZ", "ZXY", "ZYX" ]);
const FBX_TICKS_PER_SECOND = 46186158000;
const CMF_VERTEX_CHANNELS = Object.freeze([
    [ "position", "Position", 3 ],
    [ "normal", "Normal", 3 ],
    [ "tangent", "Tangent", 3 ],
    [ "binormal", "Binormal", 3 ],
    [ "texcoord0", "TexCoord", 2, 0 ],
    [ "texcoord1", "TexCoord", 2, 1 ],
    [ "color0", "Color", 4, 0 ],
    [ "blendIndice", "BoneIndices", 4, 0, "UInt8" ],
    [ "blendWeight", "BoneWeights", 4, 0 ]
]);
const FEATURE_SCAN_ROOT_NODES = Object.freeze([ "GlobalSettings", "Objects", "Connections" ]);
const SUPPORTED_GEOMETRY_CLASSES = new Set([ "", "Mesh", "Shape" ]);
const SUPPORTED_LAYER_ELEMENTS = new Set([
    "LayerElementNormal",
    "LayerElementTangent",
    "LayerElementBinormal",
    "LayerElementUV",
    "LayerElementColor",
    "LayerElementMaterial"
]);
const SUPPORTED_LAYER_MAPPINGS = new Set([ "ByPolygonVertex", "ByControlPoint", "ByVertice", "ByVertex", "ByPolygon", "AllSame" ]);
const SUPPORTED_LAYER_REFERENCES = new Set([ "Direct", "IndexToDirect", "Index" ]);
const SUPPORTED_MATERIAL_MAPPINGS = new Set([ "AllSame", "ByPolygon" ]);

let fixedDeflateTables = null;

/**
 * Normalize reader values.
 *
 * @param {object} [base] Base values.
 * @param {object} [options] Override values.
 * @param {string} [readerName] Reader name for errors.
 * @returns {object} Normalized values.
 */
export function normalizeValues(base = DEFAULT_VALUES, options = {}, readerName = "CjsFbxFormat")
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

    const baseValues = { ...DEFAULT_VALUES, ...(base || {}) };
    const values = { ...baseValues, ...(options || {}) };
    values.inputType = values.inputType ? String(values.inputType).replace(/^\./u, "").toLowerCase() : "fbx";
    values.emit = normalizeEmit(values.emit, readerName);
    values.maxBytes = normalizeIntegerLimit(values.maxBytes, "maxBytes", readerName);
    values.maxNodes = normalizeIntegerLimit(values.maxNodes, "maxNodes", readerName);
    values.maxDepth = normalizeIntegerLimit(values.maxDepth, "maxDepth", readerName);
    values.maxProperties = normalizeIntegerLimit(values.maxProperties, "maxProperties", readerName);
    values.maxArrayLength = normalizeIntegerLimit(values.maxArrayLength, "maxArrayLength", readerName);
    values.flipV = normalizeBooleanOption(values.flipV, "flipV", readerName);
    values.classes = hasOwn(options, "classes")
        ? mergeClasses(baseValues.classes || {}, options.classes, readerName)
        : normalizeClasses(baseValues.classes || {}, readerName);
    if ((values.emit === OUTPUT_GR2 || values.emit === OUTPUT_CMF) && !hasClasses(values.classes))
    {
        throw new TypeError(`${readerName}: emit "${values.emit}" requires explicit classes`);
    }
    return values;
}

/**
 * Validate a node class key.
 *
 * @param {string} key Class key.
 * @param {string} [readerName] Reader name for errors.
 * @returns {string} The validated key.
 */
export function validateClassKey(key, readerName = "CjsFbxFormat")
{
    if (!CLASS_KEYS.includes(key))
    {
        throw new Error(`${readerName}: unknown class key ${JSON.stringify(key)}; expected one of ${CLASS_KEYS.join(", ")}`);
    }
    return key;
}

/**
 * Validate a node class constructor.
 *
 * @param {string} key Class key.
 * @param {Function} Class Constructor.
 * @param {string} [readerName] Reader name for errors.
 * @returns {Function} The validated constructor.
 */
export function validateClass(key, Class, readerName = "CjsFbxFormat")
{
    validateClassKey(key, readerName);
    if (typeof Class !== "function")
    {
        throw new TypeError(`${readerName}: class ${key} must be a constructor`);
    }
    return Class;
}

/**
 * Normalize an emit target.
 *
 * @param {string} emit Emit target.
 * @param {string} readerName Reader name for errors.
 * @returns {string} Normalized emit target.
 */
export function normalizeEmit(emit, readerName)
{
    if (emit === undefined || emit === null)
    {
        return OUTPUT_RAW;
    }
    if (emit === OUTPUT_JSON)
    {
        return OUTPUT_FBX_JSON;
    }
    if ([ OUTPUT_RAW, OUTPUT_FBX_JSON, OUTPUT_GR2, OUTPUT_CMF ].includes(emit))
    {
        return emit;
    }
    throw new TypeError(`${readerName}: unknown emit value ${JSON.stringify(emit)}`);
}

/**
 * Convert supported binary inputs to bytes.
 *
 * @param {Uint8Array|ArrayBuffer|DataView} input Binary input.
 * @returns {Uint8Array} Byte view.
 */
export function toBytes(input)
{
    if (input instanceof Uint8Array)
    {
        return input;
    }
    if (input instanceof ArrayBuffer)
    {
        return new Uint8Array(input);
    }
    if (ArrayBuffer.isView(input))
    {
        return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    }
    throw new TypeError("FBX input must be Uint8Array, ArrayBuffer, or DataView");
}

/**
 * Read FBX bytes with normalized values.
 *
 * @param {Uint8Array|ArrayBuffer|DataView} input FBX bytes.
 * @param {object} values Normalized reader values.
 * @returns {object} Raw or debug payload.
 */
export function readWithValues(input, values = DEFAULT_VALUES)
{
    const bytes = toBytes(input);

    if (values.emit === OUTPUT_RAW)
    {
        const metadata = inspectWithValues(bytes, values);
        return {
            payloadType: "raw",
            sourceFormat: "fbx",
            metadata,
            bytes
        };
    }

    if (values.emit === OUTPUT_FBX_JSON)
    {
        return parseWithValues(bytes, values);
    }

    if (values.emit === OUTPUT_GR2)
    {
        return readGr2WithValues(bytes, values);
    }

    return readCmfWithValues(bytes, values);
}

/**
 * Inspect FBX bytes.
 *
 * @param {Uint8Array|ArrayBuffer|DataView} input FBX bytes.
 * @param {object} values Normalized reader values.
 * @returns {object} Lightweight FBX metadata.
 */
export function inspectWithValues(input, values = DEFAULT_VALUES)
{
    const bytes = toBytes(input);
    const detected = inspectBytes(bytes);

    return {
        payloadType: "geometry",
        mediaTypes: [ "geometry" ],
        sourceFormat: "fbx",
        byteLength: bytes.byteLength,
        source: values.source || "",
        ...detected
    };
}

/**
 * Parse FBX bytes into a browser-safe debug document.
 *
 * @param {Uint8Array|ArrayBuffer|DataView} input FBX bytes.
 * @param {object} values Normalized reader values.
 * @returns {object} Parsed FBX document.
 */
export function parseWithValues(input, values = DEFAULT_VALUES)
{
    return {
        ...parseDocumentWithValues(input, values),
        payloadType: OUTPUT_FBX_JSON
    };
}

/**
 * Read static FBX mesh data into GR2-shaped caller classes.
 *
 * @param {Uint8Array|ArrayBuffer|DataView} input FBX bytes.
 * @param {object} values Normalized reader values.
 * @returns {object} Hydrated GR2-shaped root.
 */
export function readGr2WithValues(input, values = DEFAULT_VALUES)
{
    const document = parseGr2DocumentWithValues(input, values);
    return hydrateGr2(buildGr2FromFbxNodes(document.nodes, values), values.classes, { source: values.source });
}

/**
 * Read static FBX mesh data into CMF-shaped caller classes.
 *
 * @param {Uint8Array|ArrayBuffer|DataView} input FBX bytes.
 * @param {object} values Normalized reader values.
 * @returns {object} Hydrated CMF-shaped root.
 */
export function readCmfWithValues(input, values = DEFAULT_VALUES)
{
    const document = parseGr2DocumentWithValues(input, values);
    return hydrateCmf(buildCmfFromShared(buildGr2FromFbxNodes(document.nodes, values)), values.classes, { source: values.source });
}

function parseDocumentWithValues(input, values = DEFAULT_VALUES)
{
    const bytes = toBytes(input);
    if (bytes.byteLength > values.maxBytes)
    {
        throw new Error(`fbx: input exceeds maxBytes (${values.maxBytes})`);
    }
    const metadata = inspectWithValues(bytes, values);

    if (metadata.encoding === "binary")
    {
        return parseBinaryDocument(bytes, metadata, values);
    }

    if (metadata.encoding === "ascii")
    {
        return parseAsciiDocument(bytes, metadata, values);
    }

    const error = new Error("fbx: unrecognized FBX data");
    error.code = "CJS_FORMAT_UNRECOGNIZED";
    error.sourceFormat = "fbx";
    throw error;
}

function parseGr2DocumentWithValues(input, values)
{
    const bytes = toBytes(input);
    if (bytes.byteLength > values.maxBytes)
    {
        throw new Error(`fbx: input exceeds maxBytes (${values.maxBytes})`);
    }
    const metadata = inspectWithValues(bytes, values);

    if (metadata.encoding === "binary")
    {
        return {
            ...metadata,
            nodes: readBinaryTargetNodes(bytes, metadata, values, new Set([ "GlobalSettings", "Objects", "Connections" ]))
        };
    }

    if (metadata.encoding === "ascii")
    {
        return {
            ...metadata,
            nodes: readAsciiTargetNodes(bytes, values, new Set([ "GlobalSettings", "Objects", "Connections" ]))
        };
    }

    const error = new Error("fbx: unrecognized FBX data");
    error.code = "CJS_FORMAT_UNRECOGNIZED";
    error.sourceFormat = "fbx";
    throw error;
}

/**
 * Report FBX support for the current implementation.
 *
 * @param {Uint8Array|ArrayBuffer|DataView} input FBX bytes.
 * @param {object} values Normalized reader values.
 * @returns {object} Support report.
 */
export function probeSupportWithValues(input, values = DEFAULT_VALUES)
{
    try
    {
        const metadata = inspectWithValues(input, values);
        const recognized = metadata.encoding !== "";
        const diagnostics = recognized
            ? inspectFbxFeatureSupport(input, values, metadata)
            : { warnings: [], errors: [] };

        return {
            format: "fbx",
            source: values.source || "buffer",
            supported: recognized ? "partial" : "none",
            confidence: recognized ? metadata.confidence : 0,
            preferredOutput: recognized ? "gr2" : "",
            reason: recognized ? "FBX document parsing plus basic static/skinned/morphed GR2/CMF output and basic CMF animation curves are available; full CarbonEngine-equivalent import is not implemented yet." : "Unrecognized FBX data.",
            metadata,
            variants: [
                { kind: "document", codec: metadata.encoding || "unknown", supported: recognized },
                { kind: "gr2", codec: "gr2-geometry", supported: recognized, reason: recognized ? "Basic static/skinned/morphed geometry class output is available." : "Unrecognized FBX data." },
                { kind: "cmf", codec: "cmf-geometry-animation", supported: recognized, reason: recognized ? "Basic static/skinned/morphed geometry and basic morph/bone animation class output are available." : "Unrecognized FBX data." }
            ],
            warnings: diagnostics.warnings,
            errors: diagnostics.errors
        };
    }
    catch (error)
    {
        return {
            format: "fbx",
            source: values.source || "buffer",
            supported: "none",
            confidence: 0,
            preferredOutput: "",
            reason: error.message,
            metadata: null,
            variants: [],
            warnings: [],
            errors: [ error.message ]
        };
    }
}

function inspectFbxFeatureSupport(input, values, metadata)
{
    try
    {
        const
            bytes = toBytes(input),
            targetNames = new Set(FEATURE_SCAN_ROOT_NODES),
            nodes = metadata.encoding === "binary"
                ? readBinaryTargetNodes(bytes, metadata, values, targetNames)
                : readAsciiTargetNodes(bytes, values, targetNames);

        return collectFbxFeatureSupport(nodes);
    }
    catch (error)
    {
        return {
            warnings: [],
            errors: [ error.message ]
        };
    }
}

function collectFbxFeatureSupport(nodes)
{
    const
        warnings = [],
        objectsNode = findFirstNode(nodes, "Objects");

    if (!objectsNode)
    {
        return {
            warnings: [ "fbx: no Objects node; runtime GR2/CMF output requires mesh Geometry nodes." ],
            errors: []
        };
    }

    const
        objectIndex = indexObjectNodes(objectsNode),
        connections = readConnections(findFirstNode(nodes, "Connections"));

    collectGeometryFeatureWarnings(objectIndex, warnings);
    collectLayerElementFeatureWarnings(objectIndex, warnings);
    collectSkinFeatureWarnings(objectIndex, connections, warnings);
    collectBlendShapeFeatureWarnings(objectIndex, connections, warnings);

    return {
        warnings,
        errors: []
    };
}

function collectGeometryFeatureWarnings(objectIndex, warnings)
{
    for (const geometry of objectIndex.list.filter(entry => entry.nodeName === "Geometry"))
    {
        if (!SUPPORTED_GEOMETRY_CLASSES.has(geometry.className))
        {
            addWarning(warnings, `fbx: Geometry ${objectLabel(geometry)} class ${JSON.stringify(geometry.className)} is not imported by GR2/CMF output.`);
            continue;
        }

        if (geometry.className === "Shape")
        {
            continue;
        }

        if (!findFirstNode(geometry.node.children, "Vertices"))
        {
            addWarning(warnings, `fbx: Geometry ${objectLabel(geometry)} is missing Vertices and cannot be imported as a mesh.`);
        }
        if (!findFirstNode(geometry.node.children, "PolygonVertexIndex"))
        {
            addWarning(warnings, `fbx: Geometry ${objectLabel(geometry)} is missing PolygonVertexIndex and cannot be imported as a mesh.`);
        }
    }
}

function collectLayerElementFeatureWarnings(objectIndex, warnings)
{
    for (const geometry of objectIndex.list.filter(entry => entry.nodeName === "Geometry" && (!entry.className || entry.className === "Mesh")))
    {
        for (const layer of geometry.node.children.filter(child => child.name.startsWith("LayerElement")))
        {
            if (!SUPPORTED_LAYER_ELEMENTS.has(layer.name))
            {
                addWarning(warnings, `fbx: ${layer.name} on Geometry ${objectLabel(geometry)} is ignored by GR2/CMF output.`);
                continue;
            }

            if (layer.name === "LayerElementMaterial")
            {
                collectMaterialLayerFeatureWarnings(geometry, layer, warnings);
            }
            else
            {
                collectVertexLayerFeatureWarnings(geometry, layer, warnings);
            }
        }
    }
}

function collectVertexLayerFeatureWarnings(geometry, layer, warnings)
{
    const
        mapping = String(readFirstChildProperty(layer, "MappingInformationType") || "ByPolygonVertex"),
        reference = String(readFirstChildProperty(layer, "ReferenceInformationType") || "Direct");

    if (!SUPPORTED_LAYER_MAPPINGS.has(mapping))
    {
        addWarning(warnings, `fbx: ${layer.name} on Geometry ${objectLabel(geometry)} uses unsupported MappingInformationType ${JSON.stringify(mapping)}.`);
    }
    if (!SUPPORTED_LAYER_REFERENCES.has(reference))
    {
        addWarning(warnings, `fbx: ${layer.name} on Geometry ${objectLabel(geometry)} uses unsupported ReferenceInformationType ${JSON.stringify(reference)}.`);
    }
}

function collectMaterialLayerFeatureWarnings(geometry, layer, warnings)
{
    const mapping = String(readFirstChildProperty(layer, "MappingInformationType") || "AllSame");
    if (!SUPPORTED_MATERIAL_MAPPINGS.has(mapping))
    {
        addWarning(warnings, `fbx: LayerElementMaterial on Geometry ${objectLabel(geometry)} uses unsupported MappingInformationType ${JSON.stringify(mapping)}.`);
    }
}

function collectSkinFeatureWarnings(objectIndex, connections, warnings)
{
    for (const geometry of objectIndex.list.filter(entry => entry.nodeName === "Geometry" && (!entry.className || entry.className === "Mesh")))
    {
        const skins = connectedChildObjects(geometry, objectIndex, connections, "Deformer").filter(isSkinDeformer);
        if (skins.length > 1)
        {
            addWarning(warnings, `fbx: Geometry ${objectLabel(geometry)} has ${skins.length} Skin deformers; GR2/CMF output imports only the first skin.`);
        }
    }

    const skins = objectIndex.list
        .filter(entry => entry.nodeName === "Deformer" && isSkinDeformer(entry));

    for (const skin of skins)
    {
        const clusters = connectedChildObjects(skin, objectIndex, connections, "Deformer")
            .filter(isClusterDeformer);

        for (const cluster of clusters)
        {
            const
                bone = clusterBone(cluster, objectIndex, connections),
                indexes = readChildArray(cluster.node, "Indexes") || [],
                weights = readChildArray(cluster.node, "Weights") || [];

            if (!bone)
            {
                addWarning(warnings, `fbx: Skin cluster ${objectLabel(cluster)} is skipped because it has no linked bone Model.`);
            }
            else if (!indexes.length)
            {
                addWarning(warnings, `fbx: Skin cluster ${objectLabel(cluster)} is skipped because it has no Indexes.`);
            }
            else if (!hasPositiveClusterWeight(indexes, weights))
            {
                addWarning(warnings, `fbx: Skin cluster ${objectLabel(cluster)} is skipped because it has no positive Weights.`);
            }
        }

        if (hasControlPointInfluenceOverflow(buildSkinClusterRecords(clusters, objectIndex, connections)))
        {
            addWarning(warnings, `fbx: Skin ${objectLabel(skin)} has control points with more than four positive bone influences; GR2/CMF output keeps the strongest four and renormalizes them.`);
        }
    }
}

/**
 * Check whether an indexed FBX object is a Skin deformer.
 *
 * @param {object} entry Indexed object entry.
 * @returns {boolean} True when the entry is a Skin deformer.
 */
function isSkinDeformer(entry)
{
    return entry?.className === "Skin" || entry?.fullName?.startsWith("Deformer::Skin") || entry?.name === "Skin";
}

/**
 * Check whether an indexed FBX object is a Cluster deformer.
 *
 * @param {object} entry Indexed object entry.
 * @returns {boolean} True when the entry is a Cluster deformer.
 */
function isClusterDeformer(entry)
{
    return entry?.className === "Cluster" || entry?.fullName?.startsWith("SubDeformer::") || entry?.name?.includes("Cluster");
}

function hasControlPointInfluenceOverflow(records)
{
    const controlPointInfluences = buildControlPointInfluences(records);
    for (const influences of controlPointInfluences.values())
    {
        if (influences.filter(influence => influence.weight > 0).length > 4)
        {
            return true;
        }
    }
    return false;
}

function collectBlendShapeFeatureWarnings(objectIndex, connections, warnings)
{
    const channels = objectIndex.list
        .filter(entry => isBlendShapeChannel(entry));

    for (const channel of channels)
    {
        const shapes = readBlendShapeChannelShapes(channel, objectIndex, connections);
        if (isUnsupportedBlendShapeInBetween(channel, shapes))
        {
            addWarning(warnings, `fbx: BlendShapeChannel ${objectLabel(channel)} is skipped because in-between morph interpolation is not implemented.`);
        }
    }
}

function addWarning(warnings, message)
{
    if (!warnings.includes(message))
    {
        warnings.push(message);
    }
}

function objectLabel(entry)
{
    return JSON.stringify(entry?.name || entry?.fullName || entry?.key || "");
}

/**
 * Inspect raw bytes without normalized options.
 *
 * @param {Uint8Array} bytes FBX bytes.
 * @returns {object} Detected metadata.
 */
export function inspectBytes(bytes)
{
    if (isBinaryFBX(bytes))
    {
        return inspectBinaryBytes(bytes);
    }

    const text = decodeAsciiPrefix(bytes, ASCII_PREFIX_LENGTH);
    const ascii = isAsciiFBXText(text);
    return {
        encoding: ascii ? "ascii" : "",
        version: ascii ? readAsciiVersion(text) : 0,
        signature: ascii ? "FBX ASCII" : "",
        rootNodeCount: ascii ? countAsciiRootNodes(text) : 0,
        rootNodeNames: ascii ? collectAsciiRootNames(text) : [],
        confidence: ascii ? 0.85 : 0
    };
}

/**
 * Test whether bytes look like FBX.
 *
 * @param {Uint8Array|ArrayBuffer|DataView} input Candidate bytes.
 * @returns {boolean} True when the input appears to be FBX.
 */
export function isFBX(input)
{
    const bytes = toBytes(input);
    return isBinaryFBX(bytes) || isAsciiFBXText(decodeAsciiPrefix(bytes, ASCII_PREFIX_LENGTH));
}

/**
 * Convert format output into JSON-compatible debug data.
 *
 * @param {any} value Format output.
 * @returns {any} JSON-compatible value.
 */
export function toJsonValue(value)
{
    if (value instanceof Uint8Array)
    {
        return { byteLength: value.byteLength };
    }
    if (ArrayBuffer.isView(value))
    {
        return { type: value.constructor.name, length: value.length };
    }
    if (Array.isArray(value))
    {
        return value.map(toJsonValue);
    }
    if (value && typeof value === "object")
    {
        const output = {};
        for (const [ key, entry ] of Object.entries(value))
        {
            output[key] = toJsonValue(entry);
        }
        return output;
    }
    return value;
}

function inspectBinaryBytes(bytes)
{
    const version = readU32LE(bytes, 23);
    const headerSize = getBinaryNodeHeaderSize(version);
    const rootNodeNames = [];
    let rootNodeCount = 0;
    let offset = BINARY_HEADER_SIZE;

    while (offset + headerSize <= bytes.byteLength && !isNullRecord(bytes, offset, headerSize))
    {
        const header = readBinaryNodeHeader(bytes, offset, version);
        if (!header || header.endOffset <= offset || header.endOffset > bytes.byteLength)
        {
            break;
        }
        rootNodeNames.push(readString(bytes, header.nameOffset, header.nameLength));
        rootNodeCount++;
        offset = header.endOffset;
    }

    return {
        encoding: "binary",
        version,
        signature: "Kaydara FBX Binary",
        rootNodeCount,
        rootNodeNames,
        confidence: 1
    };
}

function parseBinaryDocument(bytes, metadata, values)
{
    const nodes = [];
    const headerSize = getBinaryNodeHeaderSize(metadata.version);
    let offset = BINARY_HEADER_SIZE;
    let nodeCount = 0;

    while (offset + headerSize <= bytes.byteLength)
    {
        if (isNullRecord(bytes, offset, headerSize))
        {
            break;
        }

        const result = readBinaryNode(bytes, offset, metadata.version, values, 0);
        nodes.push(result.node);
        nodeCount += result.count;
        if (nodeCount > values.maxNodes)
        {
            throw new Error(`fbx: node count exceeds maxNodes (${values.maxNodes})`);
        }
        offset = result.offset;
    }

    const document = {
        ...metadata,
        payloadType: OUTPUT_FBX_JSON,
        nodes,
        nodeCount,
        rootNodeCount: nodes.length,
        rootNodeNames: nodes.map(node => node.name)
    };
    document.root = buildFbxRoot(document.nodes);
    return document;
}

function readBinaryNode(bytes, offset, version, values, depth)
{
    if (depth > values.maxDepth)
    {
        throw new Error(`fbx: node depth exceeds maxDepth (${values.maxDepth})`);
    }

    const header = readBinaryNodeHeader(bytes, offset, version);
    if (!header)
    {
        throw new Error(`fbx: invalid node header at offset ${offset}`);
    }
    if (header.endOffset > bytes.byteLength)
    {
        throw new Error(`fbx: node ${header.name} extends beyond end of file`);
    }
    if (header.propertyCount > values.maxProperties)
    {
        throw new Error(`fbx: node ${header.name} exceeds maxProperties (${values.maxProperties})`);
    }

    let cursor = header.propertiesOffset;
    const properties = [];
    const propertyTypes = [];

    for (let i = 0; i < header.propertyCount; i++)
    {
        const result = readBinaryProperty(bytes, cursor, values);
        properties.push(result.value);
        propertyTypes.push(result.type);
        cursor = result.offset;
    }

    const propertyEnd = header.propertiesOffset + header.propertyListLength;
    if (cursor > propertyEnd)
    {
        throw new Error(`fbx: property list for node ${header.name} overflowed`);
    }
    cursor = propertyEnd;

    const children = [];
    let count = 1;
    const headerSize = getBinaryNodeHeaderSize(version);

    while (cursor + headerSize <= header.endOffset)
    {
        if (isNullRecord(bytes, cursor, headerSize))
        {
            cursor += headerSize;
            break;
        }
        if (cursor >= header.endOffset)
        {
            break;
        }

        const child = readBinaryNode(bytes, cursor, version, values, depth + 1);
        if (child.offset > header.endOffset)
        {
            throw new Error(`fbx: child node for ${header.name} overflowed`);
        }
        children.push(child.node);
        count += child.count;
        cursor = child.offset;
    }

    return {
        offset: header.endOffset,
        count,
        node: {
            name: header.name,
            properties,
            propertyTypes,
            children
        }
    };
}

function readBinaryNodeHeader(bytes, offset, version)
{
    const large = version >= 7500;
    const headerSize = getBinaryNodeHeaderSize(version);
    if (offset + headerSize > bytes.byteLength)
    {
        return null;
    }

    let cursor = offset;
    const endOffset = large ? readU64LEAsNumber(bytes, cursor) : readU32LE(bytes, cursor);
    cursor += large ? 8 : 4;
    const propertyCount = large ? readU64LEAsNumber(bytes, cursor) : readU32LE(bytes, cursor);
    cursor += large ? 8 : 4;
    const propertyListLength = large ? readU64LEAsNumber(bytes, cursor) : readU32LE(bytes, cursor);
    cursor += large ? 8 : 4;
    const nameLength = bytes[cursor++];
    const nameOffset = cursor;

    if (endOffset === 0 && propertyCount === 0 && propertyListLength === 0 && nameLength === 0)
    {
        return null;
    }
    if (!Number.isSafeInteger(endOffset) || !Number.isSafeInteger(propertyCount) || !Number.isSafeInteger(propertyListLength))
    {
        throw new Error("fbx: 64-bit node offsets exceed JavaScript safe integer range");
    }
    if (nameOffset + nameLength > bytes.byteLength)
    {
        throw new Error(`fbx: node name at offset ${offset} is truncated`);
    }

    return {
        endOffset,
        propertyCount,
        propertyListLength,
        nameLength,
        nameOffset,
        name: readString(bytes, nameOffset, nameLength),
        propertiesOffset: nameOffset + nameLength
    };
}

function readBinaryProperty(bytes, offset, values)
{
    ensureRange(bytes, offset, 1, "fbx: property type is truncated");
    const type = String.fromCharCode(bytes[offset]);
    let cursor = offset + 1;

    switch (type)
    {
    case "Y":
        ensureRange(bytes, cursor, 2, "fbx: int16 property is truncated");
        return { type, value: readI16LE(bytes, cursor), offset: cursor + 2 };
    case "C":
        ensureRange(bytes, cursor, 1, "fbx: bool property is truncated");
        return { type, value: bytes[cursor] !== 0, offset: cursor + 1 };
    case "I":
        ensureRange(bytes, cursor, 4, "fbx: int32 property is truncated");
        return { type, value: readI32LE(bytes, cursor), offset: cursor + 4 };
    case "F":
        ensureRange(bytes, cursor, 4, "fbx: float32 property is truncated");
        return { type, value: readF32LE(bytes, cursor), offset: cursor + 4 };
    case "D":
        ensureRange(bytes, cursor, 8, "fbx: float64 property is truncated");
        return { type, value: readF64LE(bytes, cursor), offset: cursor + 8 };
    case "L":
        ensureRange(bytes, cursor, 8, "fbx: int64 property is truncated");
        return { type, value: readI64LEValue(bytes, cursor), offset: cursor + 8 };
    case "R":
        return readBinaryBlobProperty(bytes, cursor, type, "bytes");
    case "S":
        return readBinaryBlobProperty(bytes, cursor, type, "string");
    case "f":
    case "d":
    case "i":
    case "l":
    case "b":
    case "c":
        return readBinaryArrayProperty(bytes, cursor, type, values);
    default:
        throw new Error(`fbx: unsupported property type ${JSON.stringify(type)} at offset ${offset}`);
    }
}

function readBinaryBlobProperty(bytes, offset, type, kind)
{
    ensureRange(bytes, offset, 4, `fbx: ${kind} property length is truncated`);
    const length = readU32LE(bytes, offset);
    const dataOffset = offset + 4;
    const endOffset = dataOffset + length;
    ensureRange(bytes, dataOffset, length, `fbx: ${kind} property is truncated`);

    return {
        type,
        value: kind === "string" ? readString(bytes, dataOffset, length) : bytes.subarray(dataOffset, endOffset),
        offset: endOffset
    };
}

function readBinaryArrayProperty(bytes, offset, type, values)
{
    ensureRange(bytes, offset, 12, "fbx: array property header is truncated");
    const length = readU32LE(bytes, offset);
    const encoding = readU32LE(bytes, offset + 4);
    const byteLength = readU32LE(bytes, offset + 8);
    const dataOffset = offset + 12;
    const endOffset = dataOffset + byteLength;
    ensureRange(bytes, dataOffset, byteLength, "fbx: array property is truncated");
    if (length > values.maxArrayLength)
    {
        throw new Error(`fbx: array property exceeds maxArrayLength (${values.maxArrayLength})`);
    }

    if (encoding === 0)
    {
        return {
            type,
            value: readUncompressedArray(bytes, dataOffset, type, length, byteLength),
            offset: endOffset
        };
    }

    if (encoding === 1)
    {
        const expectedByteLength = getArrayElementSize(type) * length;
        const expanded = inflateZlib(bytes.subarray(dataOffset, endOffset), expectedByteLength);
        return {
            type,
            value: readUncompressedArray(expanded, 0, type, length, expectedByteLength),
            offset: endOffset
        };
    }

    return {
        type,
        value: {
            arrayType: type,
            length,
            encoding,
            byteOffset: dataOffset,
            byteLength,
            compressed: true
        },
        offset: endOffset
    };
}

function readUncompressedArray(bytes, offset, type, length, byteLength)
{
    const expected = getArrayElementSize(type) * length;
    if (byteLength < expected)
    {
        throw new Error(`fbx: array property ${type} is truncated`);
    }

    if (type === "f")
    {
        const value = new Float32Array(length);
        for (let i = 0; i < length; i++)
        {
            value[i] = readF32LE(bytes, offset + i * 4);
        }
        return value;
    }
    if (type === "d")
    {
        const value = new Float64Array(length);
        for (let i = 0; i < length; i++)
        {
            value[i] = readF64LE(bytes, offset + i * 8);
        }
        return value;
    }
    if (type === "i")
    {
        const value = new Int32Array(length);
        for (let i = 0; i < length; i++)
        {
            value[i] = readI32LE(bytes, offset + i * 4);
        }
        return value;
    }
    if (type === "l")
    {
        const value = [];
        for (let i = 0; i < length; i++)
        {
            value.push(readI64LEValue(bytes, offset + i * 8));
        }
        return value;
    }

    const value = [];
    for (let i = 0; i < length; i++)
    {
        value.push(bytes[offset + i] !== 0);
    }
    return value;
}

function inflateZlib(source, expectedLength)
{
    if (source.byteLength < 6)
    {
        throw new Error("fbx: compressed array zlib stream is truncated");
    }

    const
        cmf = source[0],
        flg = source[1];

    if ((cmf & 0x0f) !== 8 || (cmf >> 4) > 7 || ((cmf << 8) + flg) % 31 !== 0)
    {
        throw new Error("fbx: compressed array has invalid zlib header");
    }
    if (flg & 0x20)
    {
        throw new Error("fbx: compressed array uses a preset zlib dictionary");
    }

    const
        expectedAdler = readU32BE(source, source.byteLength - 4),
        output = inflateDeflate(source.subarray(2, source.byteLength - 4), expectedLength),
        actualAdler = adler32(output);

    if (actualAdler !== expectedAdler)
    {
        throw new Error("fbx: compressed array zlib checksum mismatch");
    }

    return output;
}

function inflateDeflate(source, expectedLength)
{
    const
        reader = new DeflateBitReader(source),
        state = {
            output: new Uint8Array(expectedLength),
            offset: 0
        };

    let finalBlock = false;
    while (!finalBlock)
    {
        finalBlock = reader.readBits(1) === 1;
        const blockType = reader.readBits(2);
        if (blockType === 0)
        {
            inflateStoredBlock(reader, state);
        }
        else if (blockType === 1)
        {
            const tables = getFixedDeflateTables();
            inflateHuffmanBlock(reader, state, tables.literalLength, tables.distance);
        }
        else if (blockType === 2)
        {
            const tables = readDynamicDeflateTables(reader);
            inflateHuffmanBlock(reader, state, tables.literalLength, tables.distance);
        }
        else
        {
            throw new Error("fbx: compressed array uses reserved deflate block type");
        }
    }

    if (state.offset !== expectedLength)
    {
        throw new Error("fbx: compressed array decoded to unexpected length");
    }

    return state.output;
}

function inflateStoredBlock(reader, state)
{
    reader.alignByte();
    const
        length = reader.readAlignedU16LE(),
        inverseLength = reader.readAlignedU16LE();

    if (((length ^ 0xffff) & 0xffff) !== inverseLength)
    {
        throw new Error("fbx: compressed array stored block length mismatch");
    }

    for (let i = 0; i < length; i++)
    {
        writeInflatedByte(state, reader.readAlignedByte());
    }
}

function inflateHuffmanBlock(reader, state, literalLengthTable, distanceTable)
{
    for (;;)
    {
        const symbol = literalLengthTable.decode(reader);
        if (symbol < 256)
        {
            writeInflatedByte(state, symbol);
            continue;
        }
        if (symbol === 256)
        {
            return;
        }

        const lengthIndex = symbol - 257;
        if (lengthIndex < 0 || lengthIndex >= DEFLATE_LENGTH_BASE.length)
        {
            throw new Error("fbx: compressed array has invalid deflate length symbol");
        }

        const
            length = DEFLATE_LENGTH_BASE[lengthIndex] + reader.readBits(DEFLATE_LENGTH_EXTRA[lengthIndex]),
            distanceSymbol = distanceTable.decode(reader);

        if (distanceSymbol < 0 || distanceSymbol >= DEFLATE_DISTANCE_BASE.length)
        {
            throw new Error("fbx: compressed array has invalid deflate distance symbol");
        }

        const distance = DEFLATE_DISTANCE_BASE[distanceSymbol] + reader.readBits(DEFLATE_DISTANCE_EXTRA[distanceSymbol]);
        copyInflatedBytes(state, distance, length);
    }
}

function getFixedDeflateTables()
{
    if (!fixedDeflateTables)
    {
        const literalLengths = new Array(288).fill(0);
        for (let symbol = 0; symbol <= 143; symbol++)
        {
            literalLengths[symbol] = 8;
        }
        for (let symbol = 144; symbol <= 255; symbol++)
        {
            literalLengths[symbol] = 9;
        }
        for (let symbol = 256; symbol <= 279; symbol++)
        {
            literalLengths[symbol] = 7;
        }
        for (let symbol = 280; symbol <= 287; symbol++)
        {
            literalLengths[symbol] = 8;
        }

        fixedDeflateTables = {
            literalLength: new DeflateHuffmanTable(literalLengths),
            distance: new DeflateHuffmanTable(new Array(32).fill(5))
        };
    }
    return fixedDeflateTables;
}

function readDynamicDeflateTables(reader)
{
    const
        literalLengthCount = reader.readBits(5) + 257,
        distanceCount = reader.readBits(5) + 1,
        codeLengthCount = reader.readBits(4) + 4,
        codeLengthLengths = new Array(19).fill(0);

    for (let i = 0; i < codeLengthCount; i++)
    {
        codeLengthLengths[DEFLATE_CODE_LENGTH_ORDER[i]] = reader.readBits(3);
    }

    const
        codeLengthTable = new DeflateHuffmanTable(codeLengthLengths),
        totalCount = literalLengthCount + distanceCount,
        lengths = [];

    while (lengths.length < totalCount)
    {
        const symbol = codeLengthTable.decode(reader);
        if (symbol <= 15)
        {
            lengths.push(symbol);
        }
        else if (symbol === 16)
        {
            if (!lengths.length)
            {
                throw new Error("fbx: compressed array repeats missing deflate code length");
            }
            repeatCodeLength(lengths, lengths[lengths.length - 1], reader.readBits(2) + 3, totalCount);
        }
        else if (symbol === 17)
        {
            repeatCodeLength(lengths, 0, reader.readBits(3) + 3, totalCount);
        }
        else if (symbol === 18)
        {
            repeatCodeLength(lengths, 0, reader.readBits(7) + 11, totalCount);
        }
        else
        {
            throw new Error("fbx: compressed array has invalid code length symbol");
        }
    }

    return {
        literalLength: new DeflateHuffmanTable(lengths.slice(0, literalLengthCount)),
        distance: new DeflateHuffmanTable(lengths.slice(literalLengthCount))
    };
}

function repeatCodeLength(lengths, value, count, totalCount)
{
    if (lengths.length + count > totalCount)
    {
        throw new Error("fbx: compressed array code lengths overflow");
    }
    for (let i = 0; i < count; i++)
    {
        lengths.push(value);
    }
}

function writeInflatedByte(state, value)
{
    if (state.offset >= state.output.byteLength)
    {
        throw new Error("fbx: compressed array decoded past expected length");
    }
    state.output[state.offset++] = value & 0xff;
}

function copyInflatedBytes(state, distance, length)
{
    if (distance <= 0 || distance > state.offset)
    {
        throw new Error("fbx: compressed array has invalid deflate distance");
    }
    for (let i = 0; i < length; i++)
    {
        writeInflatedByte(state, state.output[state.offset - distance]);
    }
}

function adler32(bytes)
{
    let
        a = 1,
        b = 0;

    for (const byte of bytes)
    {
        a += byte;
        b += a;
        a %= ADLER32_MOD;
        b %= ADLER32_MOD;
    }

    return (((b << 16) >>> 0) | a) >>> 0;
}

/**
 * Bit reader over a zlib/deflate stream used to inflate compressed FBX
 * property arrays.
 */
class DeflateBitReader
{
    /**
     * Creates a DeflateBitReader over caller-provided FBX bytes and reader
     * options.
     */
    constructor(bytes)
    {
        this.bytes = bytes;
        this.byteOffset = 0;
        this.bitBuffer = 0;
        this.bitCount = 0;
    }

    /** Reads bits from the current FBX binary reader. */
    readBits(count)
    {
        let
            value = 0,
            shift = 0,
            remaining = count;

        while (remaining > 0)
        {
            if (this.bitCount === 0)
            {
                if (this.byteOffset >= this.bytes.byteLength)
                {
                    throw new Error("fbx: compressed array deflate stream is truncated");
                }
                this.bitBuffer = this.bytes[this.byteOffset++];
                this.bitCount = 8;
            }

            const take = Math.min(remaining, this.bitCount);
            value |= (this.bitBuffer & ((1 << take) - 1)) << shift;
            this.bitBuffer >>>= take;
            this.bitCount -= take;
            shift += take;
            remaining -= take;
        }

        return value;
    }

    /**
     * Moves the compressed-bit cursor to the next byte boundary for the FBX
     * binary reader.
     */
    alignByte()
    {
        this.bitBuffer = 0;
        this.bitCount = 0;
    }

    /** Reads aligned byte from the current FBX binary reader. */
    readAlignedByte()
    {
        if (this.byteOffset >= this.bytes.byteLength)
        {
            throw new Error("fbx: compressed array stored block is truncated");
        }
        return this.bytes[this.byteOffset++];
    }

    /** Reads aligned U16 LE from the current FBX binary reader. */
    readAlignedU16LE()
    {
        const
            low = this.readAlignedByte(),
            high = this.readAlignedByte();
        return low | (high << 8);
    }
}

/**
 * Canonical Huffman decode table built from deflate code lengths for
 * inflating compressed FBX property arrays.
 */
class DeflateHuffmanTable
{
    /** Creates a DeflateHuffmanTable with caller-provided initial state. */
    constructor(lengths)
    {
        this.tables = [];
        this.maxBits = 0;

        const counts = new Array(16).fill(0);
        for (const length of lengths)
        {
            if (length < 0 || length > 15)
            {
                throw new Error("fbx: compressed array has invalid deflate code length");
            }
            if (length)
            {
                counts[length]++;
                this.maxBits = Math.max(this.maxBits, length);
            }
        }

        let code = 0;
        const nextCodes = new Array(16).fill(0);
        for (let bits = 1; bits <= 15; bits++)
        {
            code = (code + counts[bits - 1]) << 1;
            nextCodes[bits] = code;
        }

        for (let symbol = 0; symbol < lengths.length; symbol++)
        {
            const length = lengths[symbol];
            if (!length)
            {
                continue;
            }

            const reversed = reverseBits(nextCodes[length], length);
            nextCodes[length]++;
            if (!this.tables[length])
            {
                this.tables[length] = [];
            }
            this.tables[length][reversed] = symbol;
        }
    }

    /**
     * Decodes one symbol through the canonical Deflate Huffman table for the FBX
     * decoder.
     */
    decode(reader)
    {
        let code = 0;
        for (let length = 1; length <= this.maxBits; length++)
        {
            code |= reader.readBits(1) << (length - 1);
            const table = this.tables[length];
            if (table && table[code] !== undefined)
            {
                return table[code];
            }
        }

        throw new Error("fbx: compressed array has invalid deflate code");
    }
}

function reverseBits(value, length)
{
    let reversed = 0;
    for (let i = 0; i < length; i++)
    {
        reversed = (reversed << 1) | (value & 1);
        value >>>= 1;
    }
    return reversed;
}

function parseAsciiDocument(bytes, metadata, values)
{
    const text = TEXT_DECODER.decode(bytes);
    const nodes = [];
    const stack = [ { children: nodes } ];
    let nodeCount = 0;

    for (const rawLine of text.split(/\r?\n/u))
    {
        const line = stripAsciiComment(rawLine).trim();
        if (!line)
        {
            continue;
        }

        if (line.startsWith("}"))
        {
            if (stack.length > 1)
            {
                stack.pop();
            }
            continue;
        }

        const node = parseAsciiLine(line, values);
        if (!node)
        {
            continue;
        }

        stack[stack.length - 1].children.push(node);
        nodeCount++;
        if (nodeCount > values.maxNodes)
        {
            throw new Error(`fbx: node count exceeds maxNodes (${values.maxNodes})`);
        }
        if (node.opensBlock)
        {
            if (stack.length >= values.maxDepth)
            {
                throw new Error(`fbx: node depth exceeds maxDepth (${values.maxDepth})`);
            }
            delete node.opensBlock;
            stack.push(node);
        }
        else
        {
            delete node.opensBlock;
        }
    }

    const document = {
        ...metadata,
        payloadType: OUTPUT_FBX_JSON,
        nodes,
        nodeCount,
        rootNodeCount: nodes.length,
        rootNodeNames: nodes.map(node => node.name)
    };
    document.root = buildFbxRoot(document.nodes);
    return document;
}

function readBinaryTargetNodes(bytes, metadata, values, targetNames)
{
    const nodes = [];
    const headerSize = getBinaryNodeHeaderSize(metadata.version);
    let offset = BINARY_HEADER_SIZE;
    let nodeCount = 0;

    while (offset + headerSize <= bytes.byteLength)
    {
        if (isNullRecord(bytes, offset, headerSize))
        {
            break;
        }

        const header = readBinaryNodeHeader(bytes, offset, metadata.version);
        if (!header)
        {
            throw new Error(`fbx: invalid root node header at offset ${offset}`);
        }
        if (header.endOffset <= offset || header.endOffset > bytes.byteLength)
        {
            throw new Error(`fbx: invalid root node ${header.name}`);
        }

        if (targetNames.has(header.name))
        {
            const result = readBinaryNode(bytes, offset, metadata.version, values, 0);
            nodes.push(result.node);
            nodeCount += result.count;
            if (nodeCount > values.maxNodes)
            {
                throw new Error(`fbx: node count exceeds maxNodes (${values.maxNodes})`);
            }
        }

        offset = header.endOffset;
    }

    return nodes;
}

function readAsciiTargetNodes(bytes, values, targetNames)
{
    const text = TEXT_DECODER.decode(bytes);
    const nodes = [];
    const stack = [ { children: nodes, collecting: true } ];
    let nodeCount = 0;

    for (const rawLine of text.split(/\r?\n/u))
    {
        const line = stripAsciiComment(rawLine).trim();
        if (!line)
        {
            continue;
        }

        if (line.startsWith("}"))
        {
            if (stack.length > 1)
            {
                stack.pop();
            }
            continue;
        }

        const node = parseAsciiLine(line, values);
        if (!node)
        {
            continue;
        }

        nodeCount++;
        if (nodeCount > values.maxNodes)
        {
            throw new Error(`fbx: node count exceeds maxNodes (${values.maxNodes})`);
        }

        const isRoot = stack.length === 1;
        const parent = stack[stack.length - 1];
        const collecting = isRoot ? targetNames.has(node.name) : parent.collecting;

        if (collecting)
        {
            parent.children.push(node);
        }

        if (node.opensBlock)
        {
            if (stack.length >= values.maxDepth)
            {
                throw new Error(`fbx: node depth exceeds maxDepth (${values.maxDepth})`);
            }
            delete node.opensBlock;
            stack.push(collecting ? { children: node.children, collecting: true } : { children: [], collecting: false });
        }
        else
        {
            delete node.opensBlock;
        }
    }

    return nodes;
}

function buildGr2FromFbxNodes(nodes, values)
{
    const objectsNode = findFirstNode(nodes, "Objects");
    if (!objectsNode)
    {
        throw new Error("fbx: GR2 output requires an Objects node");
    }

    const
        objectIndex = indexObjectNodes(objectsNode),
        connections = readConnections(findFirstNode(nodes, "Connections")),
        sceneTransform = buildSceneTransform(findFirstNode(nodes, "GlobalSettings")),
        modelWorldCache = new Map(),
        skeletonContext = buildSkeletonContext(objectIndex, connections, sceneTransform, modelWorldCache),
        meshes = [];

    for (const geometry of objectIndex.list.filter(entry => entry.nodeName === "Geometry" && (!entry.className || entry.className === "Mesh")))
    {
        const owners = connectedParentObjects(geometry, objectIndex, connections, "Model");
        for (const owner of owners.length ? owners : [ null ])
        {
            meshes.push(buildGr2MeshFromGeometry(geometry, owner, objectIndex, connections, sceneTransform, modelWorldCache, skeletonContext, values));
        }
    }

    if (!meshes.length)
    {
        throw new Error("fbx: no supported Geometry mesh nodes found");
    }

    return {
        grannyFileFormatRevision: 0,
        grannyFileSource: values.source || "memory",
        meshes,
        models: buildGr2Models(skeletonContext.skeletons, meshes),
        skeletons: skeletonContext.skeletons.map(skeleton => skeleton.cmfSkeleton),
        animations: [],
        cmfAnimations: readCmfAnimations(objectIndex, connections, meshes, skeletonContext, sceneTransform)
    };
}

function buildGr2MeshFromGeometry(geometry, owner, objectIndex, connections, sceneTransform, modelWorldCache, skeletonContext, values)
{
    const
        controlPoints = requireChildArray(geometry.node, "Vertices"),
        polygonVertexIndex = requireChildArray(geometry.node, "PolygonVertexIndex");

    if (controlPoints.length % 3 !== 0)
    {
        throw new Error(`fbx: geometry ${JSON.stringify(geometry.name || geometry.key)} has invalid Vertices length`);
    }

    const
        decoded = decodePolygonCorners(controlPoints, polygonVertexIndex, geometry),
        meshTransform = buildMeshGeometryToWorld(owner, objectIndex, connections, modelWorldCache),
        positions = transformPoints(decoded.positions, meshTransform, sceneTransform),
        normal = transformDirections(readLayerElementChannel(geometry.node, "LayerElementNormal", 0, [ "Normals" ], [ "NormalsIndex", "NormalIndex" ], 3, decoded, "Normals"), meshTransform, sceneTransform, true),
        explicitTangent = transformDirections(readLayerElementChannel(geometry.node, "LayerElementTangent", 0, [ "Tangents" ], [ "TangentsIndex", "TangentIndex" ], 3, decoded, "Tangents"), meshTransform, sceneTransform, true),
        explicitBinormal = transformDirections(readLayerElementChannel(geometry.node, "LayerElementBinormal", 0, [ "Binormals" ], [ "BinormalsIndex", "BinormalIndex" ], 3, decoded, "Binormals"), meshTransform, sceneTransform, true),
        texcoord0 = readUvLayerElementChannel(geometry.node, 0, decoded, values),
        texcoord1 = readUvLayerElementChannel(geometry.node, 1, decoded, values),
        color0 = readLayerElementChannel(geometry.node, "LayerElementColor", 0, [ "Colors" ], [ "ColorIndex", "ColorsIndex", "ColorIndices" ], 4, decoded, "Colors"),
        polygonTriangles = triangulatePolygonList(decoded.polygons, decoded.positions),
        triangleFaces = flattenPolygonTriangles(polygonTriangles),
        tangent = explicitTangent.length ? explicitTangent : generateBaseTangents(positions, normal, texcoord0, triangleFaces),
        binormal = explicitBinormal.length ? explicitBinormal : generateBaseBinormals(normal, tangent),
        materialNames = readPolygonMaterialNames(geometry, owner, objectIndex, connections, decoded.polygons.length),
        indices = buildIndexGroups(polygonTriangles, materialNames),
        skin = readSkinning(geometry, objectIndex, connections, decoded, positions, sceneTransform, modelWorldCache, skeletonContext),
        morphTargets = readMorphTargets(
            geometry,
            owner,
            objectIndex,
            connections,
            decoded,
            controlPoints,
            meshTransform,
            sceneTransform,
            positions,
            triangleFaces,
            { normal, tangent, binormal, texcoord0 }
        ),
        bounds = computeBounds(positions);

    return {
        name: meshNameFromFbx(geometry, owner),
        morphTargets,
        minBounds: bounds.minBounds,
        maxBounds: bounds.maxBounds,
        boneBindings: skin.boneBindings,
        vertex: createGr2Vertex(positions, { tangent, normal, texcoord0, texcoord1, binormal, color0, blendIndice: skin.blendIndice, blendWeight: skin.blendWeight }),
        indices,
        skeleton: skin.skeleton
    };
}

function readSkinning(geometry, objectIndex, connections, decoded, positions, sceneTransform, modelWorldCache, skeletonContext)
{
    const skin = connectedChildObjects(geometry, objectIndex, connections, "Deformer")
        .find(isSkinDeformer);

    if (!skin)
    {
        return emptySkinning();
    }

    const clusters = connectedChildObjects(skin, objectIndex, connections, "Deformer")
        .filter(isClusterDeformer);

    const clusterRecords = buildSkinClusterRecords(clusters, objectIndex, connections);
    if (!clusterRecords.length)
    {
        return emptySkinning();
    }

    const
        boneKeys = clusterRecords.map(record => record.boneKey),
        controlPointInfluences = buildControlPointInfluences(clusterRecords),
        outputInfluences = decoded.corners.map(corner => normalizeInfluences(controlPointInfluences.get(corner.controlPointIndex) || [])),
        blendIndice = [],
        blendWeight = [],
        boneBindings = buildBoneBindingsFromInfluences(clusterRecords, outputInfluences, positions, objectIndex, connections, sceneTransform, modelWorldCache),
        skeleton = findSkinSkeletonIndex(boneKeys, skeletonContext);

    for (const influences of outputInfluences)
    {
        for (let i = 0; i < 4; i++)
        {
            blendIndice.push(influences[i]?.boneIndex ?? 0);
        }
        for (let i = 0; i < 4; i++)
        {
            blendWeight.push(influences[i]?.weight ?? 0);
        }
    }

    return { boneBindings, blendIndice, blendWeight, boneKeys, skeleton };
}

function emptySkinning()
{
    return { boneBindings: [], blendIndice: [], blendWeight: [], boneKeys: [], skeleton: null };
}

/**
 * Generate base mesh tangents when normal and UV channels are available.
 *
 * @param {number[]} positions Expanded position channel.
 * @param {number[]} normal Expanded normal channel.
 * @param {number[]} texcoord0 Expanded primary UV channel.
 * @param {number[]} triangleFaces Triangulated index buffer.
 * @returns {number[]} Expanded tangent channel.
 */
function generateBaseTangents(positions, normal, texcoord0, triangleFaces)
{
    if (!hasArrayValues(normal) || !hasArrayValues(texcoord0))
    {
        return [];
    }
    return cleanNumericArray(generateTangents(positions, normal, texcoord0, triangleFaces));
}

/**
 * Generate base mesh binormals when normals and tangents are available.
 *
 * @param {number[]} normal Expanded normal channel.
 * @param {number[]} tangent Expanded tangent channel.
 * @returns {number[]} Expanded binormal channel.
 */
function generateBaseBinormals(normal, tangent)
{
    if (!hasArrayValues(normal) || !hasArrayValues(tangent))
    {
        return [];
    }
    return cleanNumericArray(generateBiNormals(normal, tangent));
}

function readMorphTargets(geometry, owner, objectIndex, connections, decoded, controlPoints, meshTransform, sceneTransform, basePositions, triangleFaces, baseVertex)
{
    const blendShapes = connectedChildObjects(geometry, objectIndex, connections, "Deformer")
        .filter(deformer => deformer.className === "BlendShape" || deformer.fullName.startsWith("Deformer::BlendShape") || deformer.name.includes("BlendShape"));

    const targets = [];
    for (const blendShape of blendShapes)
    {
        const channels = connectedChildObjects(blendShape, objectIndex, connections, "Deformer")
            .filter(deformer => deformer.className === "BlendShapeChannel" || deformer.fullName.startsWith("SubDeformer::") || deformer.name.includes("BlendShapeChannel"));

        for (const channel of channels)
        {
            const shapes = readBlendShapeChannelShapes(channel, objectIndex, connections);
            if (isUnsupportedBlendShapeInBetween(channel, shapes))
            {
                continue;
            }

            for (const shape of shapes)
            {
                const target = buildMorphTarget(shape, channel, geometry, owner, decoded, controlPoints, meshTransform, sceneTransform, basePositions, triangleFaces, baseVertex);
                if (target)
                {
                    targets.push(target);
                }
            }
        }
    }
    return targets;
}

function buildMorphTarget(shape, channel, geometry, owner, decoded, controlPoints, meshTransform, sceneTransform, basePositions, triangleFaces, baseVertex)
{
    const
        indexes = readChildArray(shape.node, "Indexes") || [],
        vertices = readChildArray(shape.node, "Vertices") || [];

    if (!indexes.length || !vertices.length)
    {
        return null;
    }
    if (vertices.length % 3 !== 0)
    {
        throw new Error(`fbx: morph target ${JSON.stringify(shape.name || shape.key)} has invalid Vertices length`);
    }
    if (vertices.length / 3 < indexes.length)
    {
        throw new Error(`fbx: morph target ${JSON.stringify(shape.name || shape.key)} has fewer Vertices than Indexes`);
    }

    const controlTargetPositions = controlPoints.slice();
    for (let i = 0; i < indexes.length; i++)
    {
        const
            controlPointIndex = integerNumber(indexes[i], "Indexes"),
            targetOffset = i * 3,
            controlOffset = controlPointIndex * 3;

        if (controlOffset < 0 || controlOffset + 2 >= controlTargetPositions.length)
        {
            throw new Error(`fbx: morph target ${JSON.stringify(shape.name || shape.key)} has Indexes value out of range`);
        }

        controlTargetPositions[controlOffset] = finiteNumber(controlPoints[controlOffset], "Vertices") + finiteNumber(vertices[targetOffset], "Vertices");
        controlTargetPositions[controlOffset + 1] = finiteNumber(controlPoints[controlOffset + 1], "Vertices") + finiteNumber(vertices[targetOffset + 1], "Vertices");
        controlTargetPositions[controlOffset + 2] = finiteNumber(controlPoints[controlOffset + 2], "Vertices") + finiteNumber(vertices[targetOffset + 2], "Vertices");
    }

    const expanded = [];
    for (const corner of decoded.corners)
    {
        const source = corner.controlPointIndex * 3;
        expanded.push(
            controlTargetPositions[source],
            controlTargetPositions[source + 1],
            controlTargetPositions[source + 2]
        );
    }

    const
        positions = transformPoints(expanded, meshTransform, sceneTransform),
        name = shape.name || channel.name || "morph_target",
        vertexChannels = buildMorphTargetVertexChannels(name, geometry, owner, decoded, meshTransform, sceneTransform, positions, triangleFaces, baseVertex);

    return {
        name,
        dataIsDeltas: false,
        maxDisplacement: computeMaxDisplacement(basePositions, positions),
        vertex: createGr2Vertex(positions, vertexChannels)
    };
}

function buildMorphTargetVertexChannels(name, geometry, owner, decoded, meshTransform, sceneTransform, positions, triangleFaces, baseVertex)
{
    let normal = readMorphTargetCustomNormals(name, geometry, owner, decoded, meshTransform, sceneTransform);
    if (!normal.length && hasArrayValues(baseVertex.normal))
    {
        normal = cleanNumericArray(generateNormals(positions, triangleFaces));
    }

    const tangent = normal.length && hasArrayValues(baseVertex.tangent) && hasArrayValues(baseVertex.texcoord0)
        ? cleanNumericArray(generateTangents(positions, normal, baseVertex.texcoord0, triangleFaces))
        : [];
    const binormal = normal.length && tangent.length && hasArrayValues(baseVertex.binormal)
        ? cleanNumericArray(generateBiNormals(normal, tangent))
        : [];

    return { normal, tangent, binormal };
}

function readMorphTargetCustomNormals(name, geometry, owner, decoded, meshTransform, sceneTransform)
{
    const encoded = readMorphTargetCustomNormalString(name, owner, geometry);
    if (!encoded)
    {
        return [];
    }

    return transformDirections(
        decodeBase64Float32Vector3Array(encoded, decoded.corners.length, `morph target custom normals ${JSON.stringify(name)}`),
        meshTransform,
        sceneTransform,
        true
    );
}

function readMorphTargetCustomNormalString(name, owner, geometry)
{
    const propertyName = `bsNormals_${name}`;
    for (const entry of [ owner, geometry ])
    {
        const value = readProperties70(entry?.node).properties[propertyName]?.value;
        if (typeof value === "string")
        {
            return value;
        }
    }
    return "";
}

function decodeBase64Float32Vector3Array(encoded, vertexCount, feature)
{
    const
        bytes = decodeBase64Bytes(encoded, feature),
        expectedByteLength = vertexCount * 3 * 4;

    if (bytes.byteLength !== expectedByteLength)
    {
        throw new Error(`fbx: ${feature} byte length ${bytes.byteLength} does not match expected ${expectedByteLength}`);
    }

    const
        view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
        values = [];

    for (let offset = 0; offset < bytes.byteLength; offset += 4)
    {
        values.push(finiteNumber(view.getFloat32(offset, true), feature));
    }
    return values;
}

function decodeBase64Bytes(encoded, feature)
{
    const bytes = [];
    let buffer = 0, bits = 0;

    for (const char of String(encoded))
    {
        if (/\s/u.test(char))
        {
            continue;
        }
        if (char === "=")
        {
            break;
        }

        const value = BASE64_ALPHABET.indexOf(char);
        if (value === -1)
        {
            throw new Error(`fbx: ${feature} contains invalid base64 data`);
        }

        buffer = (buffer << 6) | value;
        bits += 6;
        if (bits >= 8)
        {
            bits -= 8;
            bytes.push((buffer >> bits) & 0xff);
        }
    }

    return Uint8Array.from(bytes);
}

function computeMaxDisplacement(basePositions, targetPositions)
{
    let maxDisplacement = 0;
    for (let i = 0; i < Math.min(basePositions.length, targetPositions.length); i += 3)
    {
        maxDisplacement = Math.max(maxDisplacement, Math.hypot(
            targetPositions[i] - basePositions[i],
            targetPositions[i + 1] - basePositions[i + 1],
            targetPositions[i + 2] - basePositions[i + 2]
        ));
    }
    return cleanFloat(maxDisplacement);
}

function readCmfAnimations(objectIndex, connections, meshes, skeletonContext, sceneTransform)
{
    const
        morphTargetNames = buildMorphTargetNameSet(meshes),
        boneTargets = buildCmfBoneTargetMap(skeletonContext);

    const animations = [];
    for (const stack of objectIndex.list.filter(entry => entry.nodeName === "AnimationStack"))
    {
        const animation = readCmfAnimation(stack, objectIndex, connections, morphTargetNames, boneTargets, sceneTransform);
        if (animation)
        {
            animations.push(animation);
        }
    }
    return animations;
}

function buildMorphTargetNameSet(meshes)
{
    const names = new Set();
    for (const mesh of meshes)
    {
        for (const target of mesh.morphTargets ?? [])
        {
            if (target.name)
            {
                names.add(target.name);
            }
        }
    }
    return names;
}

function buildCmfBoneTargetMap(skeletonContext)
{
    const targets = new Map();
    for (const skeleton of skeletonContext.skeletons)
    {
        for (let i = 0; i < skeleton.boneKeys.length; i++)
        {
            targets.set(skeleton.boneKeys[i], {
                name: skeleton.cmfSkeleton.bones[i] || `bone_${i}`,
                isRoot: skeleton.cmfSkeleton.parents[i] === 0xffffffff
            });
        }
    }
    return targets;
}

function readCmfAnimation(stack, objectIndex, connections, morphTargetNames, boneTargets, sceneTransform)
{
    const
        layers = connectedChildObjects(stack, objectIndex, connections, "AnimationLayer"),
        curveNodeParents = layers.length ? layers : [ stack ],
        curveNodes = uniqueEntries(curveNodeParents.flatMap(parent => connectedChildObjects(parent, objectIndex, connections, "AnimationCurveNode"))),
        records = [];

    for (const curveNode of curveNodes)
    {
        records.push(...readMorphAnimationRecords(curveNode, objectIndex, connections, morphTargetNames));
        records.push(...readRootPropertyMorphAnimationRecords(curveNode, objectIndex, connections, morphTargetNames, boneTargets));

        const boneRecord = readBoneAnimationRecord(curveNode, objectIndex, connections, boneTargets, sceneTransform);
        if (boneRecord)
        {
            records.push(boneRecord);
        }
    }

    if (!records.length)
    {
        return null;
    }

    const stackTimeSpan = readAnimationStackTimeSpan(stack, records);

    const
        channels = [],
        curves = [];
    let duration = 0;

    for (const record of records)
    {
        const
            knots = record.curve.ticks.map(tick => cleanFloat((tick - stackTimeSpan.startTick) / FBX_TICKS_PER_SECOND)),
            values = record.curve.values.map(cleanFloat),
            curveIndex = curves.length;

        if (values.length !== knots.length * record.valueDimension)
        {
            throw new Error(`fbx: animation curve for ${JSON.stringify(record.target)} has mismatched value dimension`);
        }

        for (const knot of knots)
        {
            duration = Math.max(duration, knot);
        }
        curves.push({
            valueDimension: record.valueDimension,
            interpolation: "Linear",
            knotType: "Float32",
            valueType: "Float32",
            knotCount: knots.length,
            knots: packFloat32Values(knots),
            values: packFloat32Values(values)
        });
        channels.push({
            target: record.target,
            targetType: record.targetType,
            curveIndex
        });
    }

    return {
        name: stack.name || "fbx_animation",
        channels,
        curves,
        duration: cleanFloat(stackTimeSpan.duration ?? duration)
    };
}

function readAnimationStackTimeSpan(stack, records)
{
    const
        properties = readProperties70(stack.node).properties,
        start = propertyNumber(properties, "LocalStart", propertyNumber(properties, "ReferenceStart", null)),
        stop = propertyNumber(properties, "LocalStop", propertyNumber(properties, "ReferenceStop", null));

    if (start !== null && stop !== null && stop >= start)
    {
        return {
            startTick: start,
            duration: (stop - start) / FBX_TICKS_PER_SECOND
        };
    }

    let startTick = Infinity;
    for (const record of records)
    {
        for (const tick of record.curve.ticks)
        {
            startTick = Math.min(startTick, tick);
        }
    }
    return {
        startTick,
        duration: null
    };
}

function readMorphAnimationRecords(curveNode, objectIndex, connections, morphTargetNames)
{
    const
        targets = readMorphAnimationTargets(curveNode, objectIndex, connections, morphTargetNames),
        curve = readMorphAnimationCurve(curveNode, objectIndex, connections);

    if (!targets.length || !curve)
    {
        return [];
    }

    return targets.map(target => ({
        target,
        targetType: "MorphTarget",
        valueDimension: 1,
        curve
    }));
}

function readRootPropertyMorphAnimationRecords(curveNode, objectIndex, connections, morphTargetNames, boneTargets)
{
    const targetConnection = connections.list.find(connection =>
        connection.relation === "OP" &&
        connection.childKey === curveNode.key &&
        !isBoneAnimationProperty(connection.property) &&
        boneTargets.get(connection.parentKey)?.isRoot &&
        isBoneModel(objectIndex.byId[connection.parentKey]) &&
        isUserDefinedNumericProperty(objectIndex.byId[connection.parentKey], connection.property)
    );

    if (!targetConnection)
    {
        return [];
    }

    const target = String(targetConnection.property || "");
    if (!target || (morphTargetNames.size && !morphTargetNames.has(target)))
    {
        return [];
    }

    const curve = readAnyScalarAnimationCurve(curveNode, objectIndex, connections, 1);
    return curve
        ? [ {
            target,
            targetType: "MorphTarget",
            valueDimension: 1,
            curve
        } ]
        : [];
}

function readMorphAnimationTargets(curveNode, objectIndex, connections, morphTargetNames)
{
    const targets = [];
    for (const connection of connections.list)
    {
        if (connection.relation !== "OP" || connection.childKey !== curveNode.key || !isMorphAnimationProperty(connection.property))
        {
            continue;
        }

        const target = objectIndex.byId[connection.parentKey];
        if (!isBlendShapeChannel(target))
        {
            continue;
        }

        for (const name of readBlendShapeChannelMorphNames(target, objectIndex, connections))
        {
            if (!morphTargetNames.size || morphTargetNames.has(name))
            {
                targets.push(name);
            }
        }
    }
    return Array.from(new Set(targets));
}

function readBlendShapeChannelMorphNames(channel, objectIndex, connections)
{
    const shapes = readBlendShapeChannelShapes(channel, objectIndex, connections);
    if (isUnsupportedBlendShapeInBetween(channel, shapes))
    {
        return [];
    }

    const names = shapes
        .map(shape => shape.name || channel.name)
        .filter(Boolean);

    return names.length ? names : [ channel.name || "morph_target" ];
}

function readBlendShapeChannelShapes(channel, objectIndex, connections)
{
    return connectedChildObjects(channel, objectIndex, connections, "Geometry")
        .filter(shape => shape.className === "Shape" || shape.fullName.startsWith("Geometry::Shape") || shape.name);
}

function readBlendShapeChannelFullWeights(channel)
{
    return readChildArray(channel.node, "FullWeights") || [];
}

function isUnsupportedBlendShapeInBetween(channel, shapes)
{
    // Multiple shapes/weights under one FBX channel are in-between targets, not independent sliders.
    return shapes.length > 1 || readBlendShapeChannelFullWeights(channel).length > 1;
}

function readMorphAnimationCurve(curveNode, objectIndex, connections)
{
    return readAnyScalarAnimationCurve(curveNode, objectIndex, connections, 0.01, isMorphAnimationProperty);
}

function readAnyScalarAnimationCurve(curveNode, objectIndex, connections, scale, predicate = null)
{
    const curves = connections.list
        .filter(connection => connection.parentKey === curveNode.key)
        .map(connection => ({ connection, curve: objectIndex.byId[connection.childKey] }))
        .filter(item => item.curve?.nodeName === "AnimationCurve");

    const match = predicate
        ? curves.find(item => predicate(item.connection.property)) || curves[0]
        : curves.find(item => animationCurveAxis(item.connection.property) === 0) || curves[0];
    return match ? readScalarAnimationCurve(match.curve, scale) : null;
}

function readScalarAnimationCurve(curve, scale)
{
    const
        ticks = readChildArray(curve.node, "KeyTime") || [],
        keyValueFloat = readChildArray(curve.node, "KeyValueFloat"),
        keyValue = readChildArray(curve.node, "KeyValue"),
        valueFeature = hasArrayValues(keyValueFloat) ? "KeyValueFloat" : "KeyValue",
        values = hasArrayValues(keyValueFloat) ? keyValueFloat : hasArrayValues(keyValue) ? keyValue : [];

    if (!ticks.length || !values.length)
    {
        return null;
    }
    if (ticks.length !== values.length)
    {
        throw new Error(`fbx: animation curve ${JSON.stringify(curve.name || curve.key)} has mismatched KeyTime and ${valueFeature} lengths`);
    }

    const pairs = ticks.map((tick, index) => ({
        tick: finiteNumber(tick, "KeyTime"),
        value: finiteNumber(values[index], valueFeature) * scale
    })).sort((a, b) => a.tick - b.tick);

    return {
        ticks: pairs.map(pair => pair.tick),
        values: pairs.map(pair => pair.value)
    };
}

function readBoneAnimationRecord(curveNode, objectIndex, connections, boneTargets, sceneTransform)
{
    const targetConnection = connections.list.find(connection =>
        connection.relation === "OP" &&
        connection.childKey === curveNode.key &&
        isBoneAnimationProperty(connection.property) &&
        boneTargets.has(connection.parentKey) &&
        isBoneModel(objectIndex.byId[connection.parentKey])
    );

    if (!targetConnection)
    {
        return null;
    }

    const
        bone = objectIndex.byId[targetConnection.parentKey],
        target = boneTargets.get(bone.key),
        properties = readProperties70(bone.node).properties,
        property = normalizeBoneAnimationProperty(targetConnection.property);

    if (!property)
    {
        return null;
    }

    const vectorCurve = readVectorAnimationCurve(
        curveNode,
        objectIndex,
        connections,
        animationCurveNodeFallback(curveNode, boneAnimationFallback(properties, property))
    );
    if (!vectorCurve)
    {
        return null;
    }

    if (property === "position")
    {
        return {
            target: target.name,
            targetType: "BonePosition",
            valueDimension: 3,
            curve: {
                ticks: vectorCurve.ticks,
                values: packBonePositionValues(vectorCurve.values, sceneTransform, target.isRoot)
            }
        };
    }

    if (property === "rotation")
    {
        return {
            target: target.name,
            targetType: "BoneRotation",
            valueDimension: 4,
            curve: {
                ticks: vectorCurve.ticks,
                values: packBoneRotationValues(bone, vectorCurve.values, sceneTransform, target.isRoot)
            }
        };
    }

    return {
        target: target.name,
        targetType: "BoneScale",
        valueDimension: 3,
        curve: {
            ticks: vectorCurve.ticks,
            values: vectorCurve.values.map(cleanFloat)
        }
    };
}

function isBoneAnimationProperty(property)
{
    return !!normalizeBoneAnimationProperty(property);
}

function normalizeBoneAnimationProperty(property)
{
    const text = String(property || "").replace(/\s+/gu, "").toLowerCase();
    if (text.includes("translation") || text === "t")
    {
        return "position";
    }
    if (text.includes("rotation") || text === "r")
    {
        return "rotation";
    }
    if (text.includes("scaling") || text.includes("scale") || text === "s")
    {
        return "scale";
    }
    return "";
}

function boneAnimationFallback(properties, property)
{
    if (property === "position")
    {
        return propertyVector3(properties, "Lcl Translation", [ 0, 0, 0 ]);
    }
    if (property === "rotation")
    {
        return propertyVector3(properties, "Lcl Rotation", [ 0, 0, 0 ]);
    }
    return propertyVector3(properties, "Lcl Scaling", [ 1, 1, 1 ]);
}

function animationCurveNodeFallback(curveNode, fallback)
{
    const
        properties = readProperties70(curveNode.node).properties,
        axes = [ "d|X", "d|Y", "d|Z" ];

    return axes.map((axis, index) => propertyNumber(properties, axis, fallback[index]));
}

function readVectorAnimationCurve(curveNode, objectIndex, connections, fallback)
{
    const components = [ null, null, null ];
    for (const connection of connections.list.filter(item => item.parentKey === curveNode.key))
    {
        const
            curve = objectIndex.byId[connection.childKey],
            axis = animationCurveAxis(connection.property) ?? animationCurveAxis(curve?.name);

        if (curve?.nodeName !== "AnimationCurve" || axis === null)
        {
            continue;
        }
        components[axis] = readScalarAnimationCurve(curve, 1);
    }

    if (components.every(component => !component))
    {
        return null;
    }

    const ticks = uniqueSortedTicks(components);
    const values = [];
    for (const tick of ticks)
    {
        for (let axis = 0; axis < 3; axis++)
        {
            values.push(sampleScalarAnimationCurve(components[axis], tick, fallback[axis]));
        }
    }
    return { ticks, values };
}

function animationCurveAxis(property)
{
    const text = String(property || "").trim().toLowerCase();
    if (/(^|[|._])x$/u.test(text))
    {
        return 0;
    }
    if (/(^|[|._])y$/u.test(text))
    {
        return 1;
    }
    if (/(^|[|._])z$/u.test(text))
    {
        return 2;
    }
    return null;
}

function uniqueSortedTicks(components)
{
    const ticks = new Set();
    for (const component of components)
    {
        for (const tick of component?.ticks ?? [])
        {
            ticks.add(tick);
        }
    }
    return Array.from(ticks).sort((a, b) => a - b);
}

function sampleScalarAnimationCurve(curve, tick, fallback)
{
    if (!curve)
    {
        return fallback;
    }

    const { ticks, values } = curve;
    if (tick <= ticks[0])
    {
        return values[0];
    }
    if (tick >= ticks[ticks.length - 1])
    {
        return values[values.length - 1];
    }

    for (let i = 1; i < ticks.length; i++)
    {
        if (tick > ticks[i])
        {
            continue;
        }
        if (tick === ticks[i])
        {
            return values[i];
        }

        const amount = (tick - ticks[i - 1]) / (ticks[i] - ticks[i - 1]);
        return values[i - 1] + (values[i] - values[i - 1]) * amount;
    }
    return fallback;
}

function packBonePositionValues(values, sceneTransform, isRoot)
{
    const output = [];
    for (let i = 0; i < values.length; i += 3)
    {
        const position = isRoot
            ? transformScenePoint([ values[i], values[i + 1], values[i + 2] ], sceneTransform)
            : [ values[i] * sceneTransform.scale, values[i + 1] * sceneTransform.scale, values[i + 2] * sceneTransform.scale ];
        output.push(...cleanVector3(position));
    }
    return output;
}

function packBoneRotationValues(bone, values, sceneTransform, isRoot)
{
    const
        properties = readProperties70(bone.node).properties,
        output = [];

    for (let i = 0; i < values.length; i += 3)
    {
        const
            matrix = composeModelTransform(properties, {
                translation: [ 0, 0, 0 ],
                rotation: [ values[i], values[i + 1], values[i + 2] ],
                scale: [ 1, 1, 1 ]
            }),
            transformed = isRoot ? transformMatrixScene(matrix, sceneTransform) : matrix,
            rotation = decomposeMatrix4(transformed).rotation;

        output.push(...rotation);
    }
    return output;
}

function isBlendShapeChannel(entry)
{
    return !!entry && entry.nodeName === "Deformer" && (
        entry.className === "BlendShapeChannel" ||
        entry.fullName.startsWith("SubDeformer::") ||
        entry.name.includes("BlendShapeChannel")
    );
}

function isMorphAnimationProperty(property)
{
    return String(property || "").toLowerCase().includes("deformpercent");
}

function isUserDefinedNumericProperty(entry, property)
{
    if (!entry || !property)
    {
        return false;
    }

    const definition = readProperties70(entry.node).properties[property];
    if (!definition || !String(definition.flags || "").includes("U"))
    {
        return false;
    }
    return typeof definition.value === "number";
}

function uniqueEntries(entries)
{
    const
        seen = new Set(),
        unique = [];

    for (const entry of entries)
    {
        if (!entry || seen.has(entry.key))
        {
            continue;
        }
        seen.add(entry.key);
        unique.push(entry);
    }
    return unique;
}

function packFloat32Values(values)
{
    const
        bytes = new Uint8Array(values.length * 4),
        view = new DataView(bytes.buffer);

    values.forEach((value, index) => view.setFloat32(index * 4, value, true));
    return Array.from(bytes);
}

function buildSkinClusterRecords(clusters, objectIndex, connections)
{
    const records = [];
    for (const cluster of clusters)
    {
        const
            bone = clusterBone(cluster, objectIndex, connections),
            indexes = readChildArray(cluster.node, "Indexes") || [],
            weights = readChildArray(cluster.node, "Weights") || [];

        if (!bone || !indexes.length || !hasPositiveClusterWeight(indexes, weights))
        {
            continue;
        }

        records.push({
            cluster,
            bone,
            boneKey: bone.key,
            boneName: bone.name || cluster.name || `bone_${records.length}`,
            indexes,
            weights
        });
    }
    return records;
}

function hasPositiveClusterWeight(indexes, weights)
{
    for (let i = 0; i < indexes.length; i++)
    {
        if (finiteNumber(weights[i] ?? 0, "Weights") > 0)
        {
            return true;
        }
    }
    return false;
}

function buildControlPointInfluences(records)
{
    const controlPointInfluences = new Map();

    records.forEach((record, boneIndex) =>
    {
        const
            indexes = record.indexes,
            weights = record.weights;

        for (let i = 0; i < indexes.length; i++)
        {
            const
                controlPointIndex = integerNumber(indexes[i], "Indexes"),
                weight = Math.max(0, finiteNumber(weights[i] ?? 0, "Weights")),
                list = controlPointInfluences.get(controlPointIndex) || [];

            if (weight <= 0)
            {
                continue;
            }

            list.push({ boneIndex, boneKey: record.boneKey, boneName: record.boneName, weight });
            controlPointInfluences.set(controlPointIndex, list);
        }
    });

    return controlPointInfluences;
}

function normalizeInfluences(influences)
{
    const best = influences
        .filter(influence => influence.weight > 0)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 4);

    const total = best.reduce((sum, influence) => sum + influence.weight, 0);
    if (total <= 0)
    {
        return [];
    }

    return best.map(influence => ({
        ...influence,
        weight: cleanFloat(influence.weight / total)
    }));
}

function buildBoneBindingsFromInfluences(records, outputInfluences, positions, objectIndex, connections, sceneTransform, modelWorldCache)
{
    return records.map((record, boneIndex) =>
    {
        const
            name = record.boneName || `bone_${boneIndex}`,
            bindingMatrix = buildBoneBindingMatrix(record, objectIndex, connections, sceneTransform, modelWorldCache),
            bindingPositions = [];

        for (let vertexIndex = 0; vertexIndex < outputInfluences.length; vertexIndex++)
        {
            if (!outputInfluences[vertexIndex].some(influence => influence.boneIndex === boneIndex && influence.weight > 0))
            {
                continue;
            }

            const offset = vertexIndex * 3;
            bindingPositions.push(...transformPointMatrix4([ positions[offset], positions[offset + 1], positions[offset + 2] ], bindingMatrix));
        }

        const bounds = computeBounds(bindingPositions);
        return {
            name,
            minBounds: bounds.minBounds,
            maxBounds: bounds.maxBounds
        };
    });
}

function buildBoneBindingMatrix(record, objectIndex, connections, sceneTransform, modelWorldCache)
{
    return invertMatrix4(transformMatrixScene(
        buildMeshGeometryToWorld(record.bone, objectIndex, connections, modelWorldCache),
        sceneTransform
    ));
}

function clusterBone(cluster, objectIndex, connections)
{
    return connectedChildObjects(cluster, objectIndex, connections, "Model")[0] || null;
}

function findSkinSkeletonIndex(boneKeys, skeletonContext)
{
    if (!skeletonContext)
    {
        return null;
    }

    let skeletonIndex = null;
    for (const key of boneKeys)
    {
        if (!key)
        {
            return null;
        }

        const index = skeletonContext.boneToSkeletonIndex.get(key);
        if (index === undefined)
        {
            return null;
        }
        if (skeletonIndex === null)
        {
            skeletonIndex = index;
        }
        else if (skeletonIndex !== index)
        {
            return null;
        }
    }

    return skeletonIndex;
}

function buildSkeletonContext(objectIndex, connections, sceneTransform, modelWorldCache)
{
    const
        roots = objectIndex.list
            .filter(isBoneModel)
            .filter(bone => !connectedParentObjects(bone, objectIndex, connections, "Model").some(isBoneModel)),
        bindPoseMatrices = readBindPoseMatrices(objectIndex, sceneTransform),
        skeletons = [],
        boneToSkeletonIndex = new Map(),
        visited = new Set();

    for (const root of roots)
    {
        if (visited.has(root.key))
        {
            continue;
        }

        const skeleton = buildSkeleton(root, objectIndex, connections, sceneTransform, modelWorldCache, bindPoseMatrices, visited);
        if (!skeleton.cmfSkeleton.bones.length)
        {
            continue;
        }

        const skeletonIndex = skeletons.length;
        skeletons.push(skeleton);
        for (const key of skeleton.boneKeys)
        {
            boneToSkeletonIndex.set(key, skeletonIndex);
        }
    }

    return { skeletons, boneToSkeletonIndex };
}

function buildSkeleton(root, objectIndex, connections, sceneTransform, modelWorldCache, bindPoseMatrices, visited)
{
    const records = [];

    const importBone = (bone, parentIndex) =>
    {
        if (!bone || visited.has(bone.key))
        {
            return;
        }

        visited.add(bone.key);
        const
            localMatrix = buildBoneLocalMatrix(bone, parentIndex, objectIndex, connections, sceneTransform, modelWorldCache),
            transform = decomposeMatrix4(localMatrix),
            recordIndex = records.length;

        records.push({ bone, parentIndex, localMatrix, transform });

        for (const child of connectedChildObjects(bone, objectIndex, connections, "Model").filter(isBoneModel))
        {
            importBone(child, recordIndex);
        }
    };

    importBone(root, -1);

    const
        name = root.name || "fbx_skeleton",
        invBindTransforms = buildInvBindTransforms(records, bindPoseMatrices);

    return {
        name,
        boneKeys: records.map(record => record.bone.key),
        gr2Skeleton: {
            name,
            bones: records.map(record => buildGr2Bone(record))
        },
        cmfSkeleton: {
            name,
            bones: records.map(record => record.bone.name || "bone"),
            parents: records.map(record => record.parentIndex === -1 ? 0xffffffff : record.parentIndex),
            restTransforms: records.map(record => ({
                position: record.transform.position,
                rotation: record.transform.rotation,
                scale: record.transform.scale
            })),
            invBindTransforms,
            boneMasks: buildCmfBoneMasks(records)
        }
    };
}

/**
 * Build CMF bone masks from user-defined numeric bone properties.
 *
 * @param {object[]} records Imported skeleton bone records.
 * @returns {object[]} CMF bone masks.
 */
function buildCmfBoneMasks(records)
{
    const
        masks = [],
        byName = new Map();

    records.forEach((record, index) =>
    {
        const properties = readProperties70(record.bone.node).properties;
        for (const [ name, definition ] of Object.entries(properties))
        {
            if (!isUserDefinedNumericPropertyDefinition(definition))
            {
                continue;
            }

            let mask = byName.get(name);
            if (!mask)
            {
                mask = { name, weights: [] };
                byName.set(name, mask);
                masks.push(mask);
            }
            mask.weights.push({ index, weight: cleanFloat(clamp01(definition.value)) });
        }
    });

    return masks;
}

/**
 * Check whether a Properties70 definition should become a CMF bone-mask weight.
 *
 * @param {object} definition Parsed Properties70 definition.
 * @returns {boolean} True when the property is user-defined and numeric.
 */
function isUserDefinedNumericPropertyDefinition(definition)
{
    return !!definition && String(definition.flags || "").includes("U") && typeof definition.value === "number";
}

/**
 * Clamp a numeric value to the unit interval.
 *
 * @param {number} value Input value.
 * @returns {number} Clamped value.
 */
function clamp01(value)
{
    return Math.min(1, Math.max(0, finiteNumber(value, "bone mask weight")));
}

function buildGr2Models(skeletons, meshes)
{
    return skeletons.map((skeleton, skeletonIndex) => ({
        name: skeleton.name,
        skeleton: skeleton.gr2Skeleton,
        meshBindings: meshes
            .map((mesh, meshIndex) => mesh.skeleton === skeletonIndex ? meshIndex : -1)
            .filter(meshIndex => meshIndex !== -1)
    }));
}

function buildGr2Bone(record)
{
    const transform = record.transform;
    return {
        name: record.bone.name || "bone",
        parentIndex: record.parentIndex,
        flag: 7,
        position: transform.position,
        orientation: transform.rotation,
        scaleShear: [
            transform.scale[0], 0, 0,
            0, transform.scale[1], 0,
            0, 0, transform.scale[2]
        ]
    };
}

function buildBoneLocalMatrix(bone, parentIndex, objectIndex, connections, sceneTransform, modelWorldCache)
{
    if (parentIndex === -1)
    {
        return transformMatrixScene(
            buildModelTransformState(bone, objectIndex, connections, modelWorldCache).nodeToWorld,
            sceneTransform
        );
    }

    return scaleMatrixTranslation(buildModelLocalTransform(bone), sceneTransform.scale);
}

function buildInvBindTransforms(records, bindPoseMatrices)
{
    const poseMatrices = records.map(record => bindPoseMatrices.get(record.bone.key));
    if (poseMatrices.every(Boolean))
    {
        return poseMatrices.map(matrix => cleanMatrix4(invertMatrix4(matrix)));
    }

    const invBindTransforms = [];
    for (const record of records)
    {
        const
            parentInvTransform = record.parentIndex === -1 ? IDENTITY_MATRIX4 : invBindTransforms[record.parentIndex],
            invLocalTransform = invertMatrix4(record.localMatrix);

        invBindTransforms.push(cleanMatrix4(multiplyMatrix4(parentInvTransform, invLocalTransform)));
    }
    return invBindTransforms;
}

function readBindPoseMatrices(objectIndex, sceneTransform)
{
    const matrices = new Map();
    for (const pose of objectIndex.list.filter(entry => entry.nodeName === "Pose"))
    {
        const type = String(readFirstChildProperty(pose.node, "Type") || pose.className || pose.name || "");
        if (!/bindpose/iu.test(type))
        {
            continue;
        }

        for (const poseNode of pose.node.children.filter(child => child.name === "PoseNode"))
        {
            const
                nodeId = readFirstChildProperty(poseNode, "Node"),
                matrix = readChildArray(poseNode, "Matrix");

            if (nodeId === undefined || !Array.isArray(matrix) || matrix.length !== 16)
            {
                continue;
            }

            matrices.set(toObjectKey(nodeId), transformMatrixScene(matrix, sceneTransform));
        }
    }
    return matrices;
}

function isBoneModel(entry)
{
    return entry?.nodeName === "Model" && (entry.className === "LimbNode" || /LimbNode/iu.test(entry.fullName));
}

function buildSceneTransform(globalSettingsNode)
{
    const properties = readProperties70(globalSettingsNode).properties;
    const unitScaleFactor = propertyNumber(properties, "UnitScaleFactor", null);
    return {
        scale: unitScaleFactor === null ? 1 : unitScaleFactor * 0.01,
        right: axisVector(
            propertyNumber(properties, "CoordAxis", 0),
            propertyNumber(properties, "CoordAxisSign", 1)
        ),
        up: axisVector(
            propertyNumber(properties, "UpAxis", 1),
            propertyNumber(properties, "UpAxisSign", 1)
        ),
        forward: axisVector(
            propertyNumber(properties, "FrontAxis", 2),
            propertyNumber(properties, "FrontAxisSign", 1)
        )
    };
}

function buildMeshGeometryToWorld(owner, objectIndex, connections, modelWorldCache)
{
    if (!owner)
    {
        return IDENTITY_MATRIX4;
    }

    return multiplyMatrix4(
        buildModelTransformState(owner, objectIndex, connections, modelWorldCache).nodeToWorld,
        buildModelGeometricTransform(owner)
    );
}

function buildModelTransformState(model, objectIndex, connections, cache)
{
    if (cache.has(model.key))
    {
        return cache.get(model.key);
    }

    const
        local = buildModelLocalState(model),
        parents = connectedParentObjects(model, objectIndex, connections, "Model"),
        parent = parents[0],
        parentState = parent ? buildModelTransformState(parent, objectIndex, connections, cache) : null,
        state = parentState
            ? composeInheritedModelState(local, parentState)
            : {
                nodeToWorld: local.matrix,
                unscaledNodeToWorld: local.unscaledMatrix,
                inheritScale: local.scale
            };

    cache.set(model.key, state);
    return state;
}

function buildModelLocalTransform(model)
{
    const properties = readProperties70(model.node).properties;
    return composeModelTransform(properties);
}

function buildModelLocalState(model)
{
    const
        properties = readProperties70(model.node).properties,
        translation = propertyVector3(properties, "Lcl Translation", [ 0, 0, 0 ]),
        scale = propertyVector3(properties, "Lcl Scaling", [ 1, 1, 1 ]);

    return {
        properties,
        translation,
        scale,
        inheritType: propertyNumber(properties, "InheritType", 1),
        matrix: composeModelTransform(properties, { translation, scale }),
        unscaledMatrix: composeModelTransform(properties, { translation, scale: [ 1, 1, 1 ] })
    };
}

function composeInheritedModelState(local, parentState)
{
    const inheritType = integerNumber(local.inheritType, "InheritType");

    if (inheritType === 0 || inheritType === 2)
    {
        const
            translation = multiplyVector3(local.translation, parentState.inheritScale),
            scale = inheritType === 0 ? multiplyVector3(local.scale, parentState.inheritScale) : local.scale,
            matrix = composeModelTransform(local.properties, { translation, scale }),
            unscaledMatrix = composeModelTransform(local.properties, { translation, scale: [ 1, 1, 1 ] });

        return {
            nodeToWorld: multiplyMatrix4(parentState.unscaledNodeToWorld, matrix),
            unscaledNodeToWorld: multiplyMatrix4(parentState.unscaledNodeToWorld, unscaledMatrix),
            inheritScale: scale
        };
    }

    return {
        nodeToWorld: multiplyMatrix4(parentState.nodeToWorld, local.matrix),
        unscaledNodeToWorld: multiplyMatrix4(parentState.unscaledNodeToWorld, local.unscaledMatrix),
        inheritScale: multiplyVector3(parentState.inheritScale, local.scale)
    };
}

function buildModelGeometricTransform(model)
{
    const properties = readProperties70(model.node).properties;
    return composeSimpleTransform(
        propertyVector3(properties, "GeometricTranslation", [ 0, 0, 0 ]),
        propertyVector3(properties, "GeometricRotation", [ 0, 0, 0 ]),
        propertyVector3(properties, "GeometricScaling", [ 1, 1, 1 ]),
        DEFAULT_ROTATION_ORDER
    );
}

function composeModelTransform(properties, overrides = {})
{
    const
        rotationOrder = propertyRotationOrder(properties),
        rotationPivot = propertyVector3(properties, "RotationPivot", [ 0, 0, 0 ]),
        scalingPivot = propertyVector3(properties, "ScalingPivot", [ 0, 0, 0 ]);

    return multiplyMatrix4List([
        translationMatrix4(overrides.translation ?? propertyVector3(properties, "Lcl Translation", [ 0, 0, 0 ])),
        translationMatrix4(propertyVector3(properties, "RotationOffset", [ 0, 0, 0 ])),
        translationMatrix4(rotationPivot),
        rotationMatrix4(propertyVector3(properties, "PreRotation", [ 0, 0, 0 ]), rotationOrder),
        rotationMatrix4(overrides.rotation ?? propertyVector3(properties, "Lcl Rotation", [ 0, 0, 0 ]), rotationOrder),
        inverseRotationMatrix4(propertyVector3(properties, "PostRotation", [ 0, 0, 0 ]), rotationOrder),
        translationMatrix4(negateVector3(rotationPivot)),
        translationMatrix4(propertyVector3(properties, "ScalingOffset", [ 0, 0, 0 ])),
        translationMatrix4(scalingPivot),
        scaleMatrix4(overrides.scale ?? propertyVector3(properties, "Lcl Scaling", [ 1, 1, 1 ])),
        translationMatrix4(negateVector3(scalingPivot))
    ]);
}

function composeSimpleTransform(translation, rotationDegrees, scale, rotationOrder)
{
    return multiplyMatrix4(
        translationMatrix4(translation),
        multiplyMatrix4(rotationMatrix4(rotationDegrees, rotationOrder), scaleMatrix4(scale))
    );
}

function transformPoints(values, matrix, sceneTransform)
{
    const output = [];
    for (let i = 0; i < values.length; i += 3)
    {
        const point = transformPointMatrix4([ values[i], values[i + 1], values[i + 2] ], matrix);
        output.push(...transformScenePoint(point, sceneTransform));
    }
    return output;
}

function transformDirections(values, matrix, sceneTransform, useNormalMatrix)
{
    if (!values.length)
    {
        return values;
    }

    const
        normalMatrix = useNormalMatrix ? normalMatrix3(matrix) : null,
        output = [];

    for (let i = 0; i < values.length; i += 3)
    {
        const vector = useNormalMatrix
            ? transformVectorMatrix3([ values[i], values[i + 1], values[i + 2] ], normalMatrix)
            : transformVectorMatrix4([ values[i], values[i + 1], values[i + 2] ], matrix);
        output.push(...normalizeVector3(transformSceneVector(vector, sceneTransform)));
    }

    return output;
}

function transformScenePoint(point, sceneTransform)
{
    const vector = transformSceneVector(point, sceneTransform);
    return vector.map(value => value * sceneTransform.scale);
}

function transformSceneVector(vector, sceneTransform)
{
    return [
        dotVector3(vector, sceneTransform.right),
        dotVector3(vector, sceneTransform.up),
        dotVector3(vector, sceneTransform.forward)
    ];
}

function transformMatrixScene(matrix, sceneTransform)
{
    const
        column0 = transformSceneVector([ matrix[0], matrix[4], matrix[8] ], sceneTransform),
        column1 = transformSceneVector([ matrix[1], matrix[5], matrix[9] ], sceneTransform),
        column2 = transformSceneVector([ matrix[2], matrix[6], matrix[10] ], sceneTransform),
        translation = transformScenePoint([ matrix[3], matrix[7], matrix[11] ], sceneTransform);

    return cleanMatrix4([
        column0[0], column1[0], column2[0], translation[0],
        column0[1], column1[1], column2[1], translation[1],
        column0[2], column1[2], column2[2], translation[2],
        0, 0, 0, 1
    ]);
}

function scaleMatrixTranslation(matrix, scale)
{
    const output = matrix.slice();
    output[3] *= scale;
    output[7] *= scale;
    output[11] *= scale;
    return cleanMatrix4(output);
}

function decomposeMatrix4(matrix)
{
    const
        scale = [
            Math.hypot(matrix[0], matrix[4], matrix[8]) || 1,
            Math.hypot(matrix[1], matrix[5], matrix[9]) || 1,
            Math.hypot(matrix[2], matrix[6], matrix[10]) || 1
        ],
        rotationMatrix = [
            matrix[0] / scale[0], matrix[1] / scale[1], matrix[2] / scale[2],
            matrix[4] / scale[0], matrix[5] / scale[1], matrix[6] / scale[2],
            matrix[8] / scale[0], matrix[9] / scale[1], matrix[10] / scale[2]
        ];

    return {
        position: cleanVector3([ matrix[3], matrix[7], matrix[11] ]),
        rotation: matrixToQuaternion(rotationMatrix),
        scale: cleanVector3(scale)
    };
}

function matrixToQuaternion(matrix)
{
    const
        m00 = matrix[0],
        m01 = matrix[1],
        m02 = matrix[2],
        m10 = matrix[3],
        m11 = matrix[4],
        m12 = matrix[5],
        m20 = matrix[6],
        m21 = matrix[7],
        m22 = matrix[8],
        trace = m00 + m11 + m22;

    let x, y, z, w;
    if (trace > 0)
    {
        const s = Math.sqrt(trace + 1) * 2;
        w = 0.25 * s;
        x = (m21 - m12) / s;
        y = (m02 - m20) / s;
        z = (m10 - m01) / s;
    }
    else if (m00 > m11 && m00 > m22)
    {
        const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
        w = (m21 - m12) / s;
        x = 0.25 * s;
        y = (m01 + m10) / s;
        z = (m02 + m20) / s;
    }
    else if (m11 > m22)
    {
        const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
        w = (m02 - m20) / s;
        x = (m01 + m10) / s;
        y = 0.25 * s;
        z = (m12 + m21) / s;
    }
    else
    {
        const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
        w = (m10 - m01) / s;
        x = (m02 + m20) / s;
        y = (m12 + m21) / s;
        z = 0.25 * s;
    }

    return normalizeQuaternion([ x, y, z, w ]);
}

function propertyVector3(properties, name, fallback)
{
    const value = properties[name]?.value;
    if (Array.isArray(value))
    {
        return [
            finiteNumber(value[0] ?? fallback[0], name),
            finiteNumber(value[1] ?? fallback[1], name),
            finiteNumber(value[2] ?? fallback[2], name)
        ];
    }
    return fallback;
}

function propertyNumber(properties, name, fallback)
{
    const value = properties[name]?.value;
    if (value === undefined || value === null || Array.isArray(value))
    {
        return fallback;
    }
    return finiteNumber(value, name);
}

function propertyRotationOrder(properties)
{
    const value = propertyNumber(properties, "RotationOrder", null);
    if (value === null)
    {
        return DEFAULT_ROTATION_ORDER;
    }
    return FBX_ROTATION_ORDERS[value] || DEFAULT_ROTATION_ORDER;
}

function axisVector(axis, sign)
{
    const vector = [ 0, 0, 0 ];
    const index = Math.max(0, Math.min(2, integerNumber(axis, "Axis")));
    vector[index] = sign < 0 ? -1 : 1;
    return vector;
}

function translationMatrix4(translation)
{
    return [
        1, 0, 0, translation[0],
        0, 1, 0, translation[1],
        0, 0, 1, translation[2],
        0, 0, 0, 1
    ];
}

function scaleMatrix4(scale)
{
    return [
        scale[0], 0, 0, 0,
        0, scale[1], 0, 0,
        0, 0, scale[2], 0,
        0, 0, 0, 1
    ];
}

function rotationMatrix4(rotationDegrees, order)
{
    let matrix = IDENTITY_MATRIX4;
    for (let i = order.length - 1; i >= 0; i--)
    {
        const axis = order[i];
        const radians = degreesToRadians(rotationDegrees[axisIndex(axis)]);
        matrix = multiplyMatrix4(matrix, axisRotationMatrix4(axis, radians));
    }
    return matrix;
}

function inverseRotationMatrix4(rotationDegrees, order)
{
    let matrix = IDENTITY_MATRIX4;
    for (const axis of order)
    {
        const radians = degreesToRadians(-rotationDegrees[axisIndex(axis)]);
        matrix = multiplyMatrix4(matrix, axisRotationMatrix4(axis, radians));
    }
    return matrix;
}

function multiplyMatrix4List(matrices)
{
    return matrices.reduce((matrix, next) => multiplyMatrix4(matrix, next), IDENTITY_MATRIX4);
}

function negateVector3(vector)
{
    return [ -vector[0], -vector[1], -vector[2] ];
}

function multiplyVector3(a, b)
{
    return [ a[0] * b[0], a[1] * b[1], a[2] * b[2] ];
}

function axisIndex(axis)
{
    return axis === "X" ? 0 : axis === "Y" ? 1 : 2;
}

function axisRotationMatrix4(axis, radians)
{
    const
        c = Math.cos(radians),
        s = Math.sin(radians);

    switch (axis)
    {
    case "X":
        return [
            1, 0, 0, 0,
            0, c, -s, 0,
            0, s, c, 0,
            0, 0, 0, 1
        ];
    case "Y":
        return [
            c, 0, s, 0,
            0, 1, 0, 0,
            -s, 0, c, 0,
            0, 0, 0, 1
        ];
    default:
        return [
            c, -s, 0, 0,
            s, c, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ];
    }
}

function multiplyMatrix4(a, b)
{
    const output = new Array(16).fill(0);
    for (let row = 0; row < 4; row++)
    {
        for (let column = 0; column < 4; column++)
        {
            for (let k = 0; k < 4; k++)
            {
                output[row * 4 + column] += a[row * 4 + k] * b[k * 4 + column];
            }
        }
    }
    return output;
}

function invertMatrix4(matrix)
{
    const
        a = [
            matrix.slice(0, 4),
            matrix.slice(4, 8),
            matrix.slice(8, 12),
            matrix.slice(12, 16)
        ],
        inverse = [
            [ 1, 0, 0, 0 ],
            [ 0, 1, 0, 0 ],
            [ 0, 0, 1, 0 ],
            [ 0, 0, 0, 1 ]
        ];

    for (let column = 0; column < 4; column++)
    {
        let pivotRow = column;
        for (let row = column + 1; row < 4; row++)
        {
            if (Math.abs(a[row][column]) > Math.abs(a[pivotRow][column]))
            {
                pivotRow = row;
            }
        }

        const pivot = a[pivotRow][column];
        if (Math.abs(pivot) < Number.EPSILON)
        {
            throw new Error("fbx: transform matrix is not invertible");
        }

        if (pivotRow !== column)
        {
            [ a[column], a[pivotRow] ] = [ a[pivotRow], a[column] ];
            [ inverse[column], inverse[pivotRow] ] = [ inverse[pivotRow], inverse[column] ];
        }

        for (let i = 0; i < 4; i++)
        {
            a[column][i] /= pivot;
            inverse[column][i] /= pivot;
        }

        for (let row = 0; row < 4; row++)
        {
            if (row === column)
            {
                continue;
            }

            const factor = a[row][column];
            for (let i = 0; i < 4; i++)
            {
                a[row][i] -= factor * a[column][i];
                inverse[row][i] -= factor * inverse[column][i];
            }
        }
    }

    return cleanMatrix4(inverse.flat());
}

function transformPointMatrix4(point, matrix)
{
    return [
        matrix[0] * point[0] + matrix[1] * point[1] + matrix[2] * point[2] + matrix[3],
        matrix[4] * point[0] + matrix[5] * point[1] + matrix[6] * point[2] + matrix[7],
        matrix[8] * point[0] + matrix[9] * point[1] + matrix[10] * point[2] + matrix[11]
    ];
}

function transformVectorMatrix4(vector, matrix)
{
    return [
        matrix[0] * vector[0] + matrix[1] * vector[1] + matrix[2] * vector[2],
        matrix[4] * vector[0] + matrix[5] * vector[1] + matrix[6] * vector[2],
        matrix[8] * vector[0] + matrix[9] * vector[1] + matrix[10] * vector[2]
    ];
}

function normalMatrix3(matrix)
{
    const
        a00 = matrix[0],
        a01 = matrix[1],
        a02 = matrix[2],
        a10 = matrix[4],
        a11 = matrix[5],
        a12 = matrix[6],
        a20 = matrix[8],
        a21 = matrix[9],
        a22 = matrix[10],
        b01 = a22 * a11 - a12 * a21,
        b11 = -a22 * a10 + a12 * a20,
        b21 = a21 * a10 - a11 * a20,
        determinant = a00 * b01 + a01 * b11 + a02 * b21;

    if (Math.abs(determinant) < Number.EPSILON)
    {
        throw new Error("fbx: model transform is not invertible");
    }

    const inverseDeterminant = 1 / determinant;
    return [
        b01 * inverseDeterminant,
        (-a22 * a01 + a02 * a21) * inverseDeterminant,
        (a12 * a01 - a02 * a11) * inverseDeterminant,
        b11 * inverseDeterminant,
        (a22 * a00 - a02 * a20) * inverseDeterminant,
        (-a12 * a00 + a02 * a10) * inverseDeterminant,
        b21 * inverseDeterminant,
        (-a21 * a00 + a01 * a20) * inverseDeterminant,
        (a11 * a00 - a01 * a10) * inverseDeterminant
    ];
}

function transformVectorMatrix3(vector, matrix)
{
    return [
        matrix[0] * vector[0] + matrix[3] * vector[1] + matrix[6] * vector[2],
        matrix[1] * vector[0] + matrix[4] * vector[1] + matrix[7] * vector[2],
        matrix[2] * vector[0] + matrix[5] * vector[1] + matrix[8] * vector[2]
    ];
}

function normalizeVector3(vector)
{
    const length = Math.hypot(vector[0], vector[1], vector[2]);
    if (length === 0)
    {
        return [ 0, 0, 0 ];
    }
    return vector.map(value => cleanFloat(value / length));
}

function normalizeQuaternion(quaternion)
{
    const length = Math.hypot(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
    if (length === 0)
    {
        return [ 0, 0, 0, 1 ];
    }
    return quaternion.map(value => cleanFloat(value / length));
}

function dotVector3(a, b)
{
    return cleanFloat(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]);
}

function degreesToRadians(value)
{
    return value * Math.PI / 180;
}

function cleanFloat(value)
{
    return Math.abs(value) < 1e-12 ? 0 : value;
}

function cleanVector3(vector)
{
    return vector.map(cleanFloat);
}

function cleanNumericArray(values)
{
    return Array.from(values, cleanFloat);
}

function hasArrayValues(values)
{
    return (Array.isArray(values) || ArrayBuffer.isView(values)) && values.length > 0;
}

function cleanMatrix4(matrix)
{
    return matrix.map(cleanFloat);
}

function indexObjectNodes(objectsNode)
{
    const byId = {};
    const byType = {};
    const list = [];

    for (const node of objectsNode.children)
    {
        if (!node.properties.length)
        {
            continue;
        }

        const summary = readObjectEntry(node);
        const entry = { ...summary, node };
        list.push(entry);
        byId[entry.key] = entry;
        pushIndex(byType, entry.nodeName, entry);
    }

    return { list, byId, byType };
}

function connectedParentObjects(entry, objectIndex, connections, nodeName)
{
    return (connections.parentsByChild[entry.key] || [])
        .map(key => objectIndex.byId[key])
        .filter(parent => parent && parent.nodeName === nodeName);
}

function connectedChildObjects(entry, objectIndex, connections, nodeName)
{
    if (!entry)
    {
        return [];
    }

    return (connections.childrenByParent[entry.key] || [])
        .map(key => objectIndex.byId[key])
        .filter(child => child && child.nodeName === nodeName);
}

function requireChildArray(node, childName)
{
    const values = readChildArray(node, childName);
    if (!values)
    {
        throw new Error(`fbx: geometry is missing ${childName}`);
    }
    return values;
}

function readChildArray(node, childName)
{
    const child = findFirstNode(node.children, childName);
    return child ? readNodeArray(child, childName) : null;
}

function readNodeArray(node, feature)
{
    for (const property of node.properties)
    {
        const values = arrayPropertyToNumbers(property, feature);
        if (values)
        {
            return values;
        }
    }

    const asciiArray = findFirstNode(node.children, "a");
    return asciiArray ? asciiArray.properties.map(value => finiteNumber(value, feature)) : null;
}

function arrayPropertyToNumbers(property, feature)
{
    if (!property)
    {
        return null;
    }
    if (property.compressed)
    {
        const error = new Error(`fbx: GR2 output cannot read compressed ${feature} arrays yet`);
        error.code = "CJS_FORMAT_OUTPUT_NOT_SUPPORTED";
        error.sourceFormat = "fbx";
        error.emit = OUTPUT_GR2;
        error.feature = "compressed-array";
        throw error;
    }
    if (ArrayBuffer.isView(property))
    {
        return Array.from(property, value => finiteNumber(value, feature));
    }
    if (Array.isArray(property))
    {
        return property.map(value => finiteNumber(value, feature));
    }
    return null;
}

function decodePolygonCorners(controlPoints, polygonVertexIndex, geometry)
{
    const
        controlPointCount = controlPoints.length / 3,
        positions = [],
        corners = [],
        polygons = [];

    let polygon = [];

    for (const rawValue of polygonVertexIndex)
    {
        const raw = integerNumber(rawValue, "PolygonVertexIndex");
        const end = raw < 0;
        const controlPointIndex = end ? -raw - 1 : raw;
        if (controlPointIndex < 0 || controlPointIndex >= controlPointCount)
        {
            throw new Error(`fbx: geometry ${JSON.stringify(geometry.name || geometry.key)} has PolygonVertexIndex ${raw} out of range`);
        }

        const source = controlPointIndex * 3;
        const outputIndex = positions.length / 3;
        const polygonIndex = polygons.length;
        positions.push(
            finiteNumber(controlPoints[source], "Vertices"),
            finiteNumber(controlPoints[source + 1], "Vertices"),
            finiteNumber(controlPoints[source + 2], "Vertices")
        );
        corners.push({
            outputIndex,
            controlPointIndex,
            polygonIndex,
            polygonCornerIndex: polygon.length
        });
        polygon.push(outputIndex);

        if (end)
        {
            if (polygon.length < 3)
            {
                throw new Error(`fbx: geometry ${JSON.stringify(geometry.name || geometry.key)} has a polygon with fewer than three vertices`);
            }
            polygons.push(polygon);
            polygon = [];
        }
    }

    if (polygon.length)
    {
        throw new Error(`fbx: geometry ${JSON.stringify(geometry.name || geometry.key)} has an unterminated polygon`);
    }

    return { positions, corners, polygons };
}

function readLayerElementChannel(geometryNode, layerName, layerIndex, valueNames, indexNames, elementSize, decoded, feature)
{
    const layer = findLayerElementNode(geometryNode, layerName, layerIndex);
    if (!layer)
    {
        return [];
    }

    const values = readFirstChildArray(layer, valueNames);
    if (!values)
    {
        return [];
    }

    if (values.length % elementSize !== 0)
    {
        throw new Error(`fbx: ${feature} array length is not divisible by ${elementSize}`);
    }

    const
        indices = readFirstChildArray(layer, indexNames) || [],
        mapping = String(readFirstChildProperty(layer, "MappingInformationType") || "ByPolygonVertex"),
        reference = String(readFirstChildProperty(layer, "ReferenceInformationType") || "Direct"),
        output = [];

    for (const corner of decoded.corners)
    {
        const
            mappedIndex = resolveLayerMappingIndex(mapping, corner, feature),
            directIndex = resolveLayerReferenceIndex(reference, indices, mappedIndex, feature);

        appendLayerElement(output, values, directIndex, elementSize, feature);
    }

    return output;
}

/**
 * Read an FBX UV layer and apply the configured V-axis convention.
 *
 * @param {object} geometryNode Geometry node.
 * @param {number} layerIndex UV layer index.
 * @param {object} decoded Decoded polygon corner state.
 * @param {object} values Normalized reader values.
 * @returns {number[]} Expanded UV channel.
 */
function readUvLayerElementChannel(geometryNode, layerIndex, decoded, values)
{
    const texcoord = readLayerElementChannel(geometryNode, "LayerElementUV", layerIndex, [ "UV" ], [ "UVIndex", "UVIndices" ], 2, decoded, "UV");
    return values.flipV ? flipTexcoordV(texcoord) : texcoord;
}

/**
 * Flip the V coordinate of an expanded UV channel.
 *
 * @param {number[]} texcoord Expanded UV channel.
 * @returns {number[]} Flipped UV channel.
 */
function flipTexcoordV(texcoord)
{
    const flipped = texcoord.slice();
    for (let i = 1; i < flipped.length; i += 2)
    {
        flipped[i] = 1 - flipped[i];
    }
    return flipped;
}

function findLayerElementNode(geometryNode, layerName, layerIndex)
{
    const layers = geometryNode.children.filter(child => child.name === layerName);
    return layers.find((child, index) =>
    {
        const id = child.properties.length ? Number(child.properties[0]) : index;
        return Number.isFinite(id) && id === layerIndex;
    }) || layers[layerIndex] || null;
}

function readFirstChildArray(node, childNames)
{
    for (const childName of childNames)
    {
        const values = readChildArray(node, childName);
        if (values)
        {
            return values;
        }
    }
    return null;
}

function resolveLayerMappingIndex(mapping, corner, feature)
{
    switch (mapping)
    {
    case "ByPolygonVertex":
        return corner.outputIndex;
    case "ByControlPoint":
    case "ByVertice":
    case "ByVertex":
        return corner.controlPointIndex;
    case "ByPolygon":
        return corner.polygonIndex;
    case "AllSame":
        return 0;
    default:
        throw new Error(`fbx: unsupported ${feature} MappingInformationType ${JSON.stringify(mapping)}`);
    }
}

function resolveLayerReferenceIndex(reference, indices, mappedIndex, feature)
{
    switch (reference)
    {
    case "Direct":
        return mappedIndex;
    case "IndexToDirect":
    case "Index":
    {
        if (mappedIndex >= indices.length)
        {
            throw new Error(`fbx: ${feature} index array is too short`);
        }
        return integerNumber(indices[mappedIndex], feature);
    }
    default:
        throw new Error(`fbx: unsupported ${feature} ReferenceInformationType ${JSON.stringify(reference)}`);
    }
}

function appendLayerElement(output, values, directIndex, elementSize, feature)
{
    const offset = directIndex * elementSize;
    if (directIndex < 0 || offset + elementSize > values.length)
    {
        throw new Error(`fbx: ${feature} direct index ${directIndex} is out of range`);
    }

    for (let i = 0; i < elementSize; i++)
    {
        output.push(finiteNumber(values[offset + i], feature));
    }
}

function buildIndexGroups(polygonTriangles, materialNames)
{
    const groups = [];
    const groupByName = new Map();
    let maxIndex = 0;

    for (let polygonIndex = 0; polygonIndex < polygonTriangles.length; polygonIndex++)
    {
        const
            triangles = polygonTriangles[polygonIndex],
            name = materialNames[polygonIndex] || "default",
            group = getIndexGroup(groups, groupByName, name);

        for (const triangle of triangles)
        {
            group.faces.push(triangle[0], triangle[1], triangle[2]);
            maxIndex = Math.max(maxIndex, triangle[0], triangle[1], triangle[2]);
        }
    }

    const bytesPerIndex = maxIndex > 0xffff ? 4 : 2;
    for (const group of groups)
    {
        group.bytesPerIndex = bytesPerIndex;
    }
    return groups;
}

function triangulatePolygonList(polygons, positions)
{
    return polygons.map(polygon => triangulatePolygon(polygon, positions));
}

function triangulatePolygon(polygon, positions)
{
    if (polygon.length === 3)
    {
        return [ polygon.slice() ];
    }

    const projected = projectPolygonTo2D(polygon, positions);
    if (!projected)
    {
        return triangulatePolygonFan(polygon);
    }

    const area = signedArea2D(projected);
    if (Math.abs(area) <= TRIANGULATION_EPSILON)
    {
        return triangulatePolygonFan(polygon);
    }
    if (isConvexPolygon2D(projected, area))
    {
        return triangulatePolygonFan(polygon);
    }

    const
        triangles = [],
        remaining = polygon.map((value, index) => index);

    let guard = polygon.length * polygon.length;
    while (remaining.length > 3 && guard-- > 0)
    {
        let clipped = false;
        for (let index = 0; index < remaining.length; index++)
        {
            const
                previous = remaining[(index + remaining.length - 1) % remaining.length],
                current = remaining[index],
                next = remaining[(index + 1) % remaining.length];

            if (!isEar2D(previous, current, next, remaining, projected, area))
            {
                continue;
            }

            triangles.push([ polygon[previous], polygon[current], polygon[next] ]);
            remaining.splice(index, 1);
            clipped = true;
            break;
        }

        if (!clipped)
        {
            return triangulatePolygonFan(polygon);
        }
    }

    if (remaining.length === 3)
    {
        triangles.push([ polygon[remaining[0]], polygon[remaining[1]], polygon[remaining[2]] ]);
    }

    return triangles.length ? triangles : triangulatePolygonFan(polygon);
}

function flattenPolygonTriangles(polygonTriangles)
{
    const faces = [];
    for (const triangles of polygonTriangles)
    {
        for (const triangle of triangles)
        {
            faces.push(triangle[0], triangle[1], triangle[2]);
        }
    }
    return faces;
}

function triangulatePolygonFan(polygon)
{
    const triangles = [];
    for (let i = 1; i < polygon.length - 1; i++)
    {
        triangles.push([ polygon[0], polygon[i], polygon[i + 1] ]);
    }
    return triangles;
}

function projectPolygonTo2D(polygon, positions)
{
    const normal = computePolygonNormal(polygon, positions);
    const
        absX = Math.abs(normal[0]),
        absY = Math.abs(normal[1]),
        absZ = Math.abs(normal[2]);

    if (Math.max(absX, absY, absZ) <= TRIANGULATION_EPSILON)
    {
        return null;
    }

    const dropAxis = absX > absY && absX > absZ ? 0 : absY > absZ ? 1 : 2;
    return polygon.map(index =>
    {
        const offset = index * 3;
        if (dropAxis === 0)
        {
            return [ positions[offset + 1], positions[offset + 2] ];
        }
        if (dropAxis === 1)
        {
            return [ positions[offset], positions[offset + 2] ];
        }
        return [ positions[offset], positions[offset + 1] ];
    });
}

function computePolygonNormal(polygon, positions)
{
    const normal = [ 0, 0, 0 ];
    for (let i = 0; i < polygon.length; i++)
    {
        const
            current = polygon[i] * 3,
            next = polygon[(i + 1) % polygon.length] * 3,
            x0 = positions[current],
            y0 = positions[current + 1],
            z0 = positions[current + 2],
            x1 = positions[next],
            y1 = positions[next + 1],
            z1 = positions[next + 2];

        normal[0] += (y0 - y1) * (z0 + z1);
        normal[1] += (z0 - z1) * (x0 + x1);
        normal[2] += (x0 - x1) * (y0 + y1);
    }
    return normal;
}

function signedArea2D(points)
{
    let area = 0;
    for (let i = 0; i < points.length; i++)
    {
        const
            current = points[i],
            next = points[(i + 1) % points.length];

        area += current[0] * next[1] - next[0] * current[1];
    }
    return area * 0.5;
}

function isEar2D(previous, current, next, remaining, points, area)
{
    const cross = cross2D(points[previous], points[current], points[next]);
    if (area > 0 ? cross <= TRIANGULATION_EPSILON : cross >= -TRIANGULATION_EPSILON)
    {
        return false;
    }

    for (const pointIndex of remaining)
    {
        if (pointIndex === previous || pointIndex === current || pointIndex === next)
        {
            continue;
        }
        if (pointInTriangle2D(points[pointIndex], points[previous], points[current], points[next]))
        {
            return false;
        }
    }
    return true;
}

function isConvexPolygon2D(points, area)
{
    for (let i = 0; i < points.length; i++)
    {
        const cross = cross2D(points[i], points[(i + 1) % points.length], points[(i + 2) % points.length]);
        if (Math.abs(cross) <= TRIANGULATION_EPSILON)
        {
            continue;
        }
        if (area > 0 ? cross < -TRIANGULATION_EPSILON : cross > TRIANGULATION_EPSILON)
        {
            return false;
        }
    }
    return true;
}

function cross2D(a, b, c)
{
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function pointInTriangle2D(point, a, b, c)
{
    const
        ab = cross2D(a, b, point),
        bc = cross2D(b, c, point),
        ca = cross2D(c, a, point),
        hasNegative = ab < -TRIANGULATION_EPSILON || bc < -TRIANGULATION_EPSILON || ca < -TRIANGULATION_EPSILON,
        hasPositive = ab > TRIANGULATION_EPSILON || bc > TRIANGULATION_EPSILON || ca > TRIANGULATION_EPSILON;

    return !(hasNegative && hasPositive);
}

function getIndexGroup(groups, groupByName, name)
{
    let group = groupByName.get(name);
    if (!group)
    {
        group = { name, bytesPerIndex: 2, faces: [] };
        groupByName.set(name, group);
        groups.push(group);
    }
    return group;
}

function readPolygonMaterialNames(geometry, owner, objectIndex, connections, polygonCount)
{
    const materialSlots = readMaterialSlotNames(geometry, owner, objectIndex, connections);
    if (!materialSlots.length)
    {
        return new Array(polygonCount).fill("default");
    }

    const layer = findFirstNode(geometry.node.children, "LayerElementMaterial");
    if (!layer)
    {
        return new Array(polygonCount).fill(materialSlots[0] || "default");
    }

    const
        mapping = String(readFirstChildProperty(layer, "MappingInformationType") || "AllSame"),
        materials = readChildArray(layer, "Materials") || [],
        names = [];

    for (let i = 0; i < polygonCount; i++)
    {
        const slot = mapping === "ByPolygon"
            ? integerNumber(materials[i] ?? 0, "Materials")
            : integerNumber(materials[0] ?? 0, "Materials");
        names.push(slot >= 0 ? materialSlots[slot] || `material_${slot}` : "default");
    }

    return names;
}

function readMaterialSlotNames(geometry, owner, objectIndex, connections)
{
    const materials = [
        ...connectedChildObjects(owner, objectIndex, connections, "Material"),
        ...connectedChildObjects(geometry, objectIndex, connections, "Material")
    ];
    const seen = new Set();
    const names = [];

    for (const material of materials)
    {
        if (seen.has(material.key))
        {
            continue;
        }
        seen.add(material.key);
        names.push(material.name || `material_${names.length}`);
    }

    return names;
}

function meshNameFromFbx(geometry, owner)
{
    return owner?.name || geometry.name || "fbx_mesh";
}

function createGr2Vertex(position, channels = {})
{
    return {
        position,
        blendIndice: channels.blendIndice || [],
        tangent: channels.tangent || [],
        normal: channels.normal || [],
        texcoord0: channels.texcoord0 || [],
        texcoord1: channels.texcoord1 || [],
        color0: channels.color0 || [],
        binormal: channels.binormal || [],
        blendWeight: channels.blendWeight || []
    };
}

function computeBounds(positions)
{
    if (!positions.length)
    {
        return { minBounds: [ 0, 0, 0 ], maxBounds: [ 0, 0, 0 ] };
    }

    const
        minBounds = [ positions[0], positions[1], positions[2] ],
        maxBounds = [ positions[0], positions[1], positions[2] ];

    for (let i = 3; i < positions.length; i += 3)
    {
        for (let c = 0; c < 3; c++)
        {
            const value = positions[i + c];
            if (value < minBounds[c])
            {
                minBounds[c] = value;
            }
            if (value > maxBounds[c])
            {
                maxBounds[c] = value;
            }
        }
    }

    return { minBounds, maxBounds };
}

function hydrateGr2(root, classes, hydrationOptions = {})
{
    const hydrationClasses = createHydrationClasses(classes, hydrationOptions);
    return hydrate("Root", {
        grannyFileFormatRevision: root.grannyFileFormatRevision,
        grannyFileSource: root.grannyFileSource,
        meshes: root.meshes.map(mesh => hydrate("Mesh", {
            name: mesh.name,
            morphTargets: mesh.morphTargets.map(target => hydrate("MorphTarget", target, hydrationClasses)),
            minBounds: mesh.minBounds,
            maxBounds: mesh.maxBounds,
            boneBindings: mesh.boneBindings.map(binding => hydrate("BoneBinding", binding, hydrationClasses)),
            vertex: mesh.vertex,
            indices: mesh.indices.map(group => hydrate("IndexGroup", group, hydrationClasses))
        }, hydrationClasses)),
        models: root.models.map(model => hydrateGr2Model(model, hydrationClasses)),
        animations: root.animations
    }, hydrationClasses, hydrationOptions);
}

function hydrateGr2Model(model, classes)
{
    return hydrate("Model", {
        ...model,
        skeleton: hydrateGr2Skeleton(model.skeleton, classes)
    }, classes);
}

function hydrateGr2Skeleton(skeleton, classes)
{
    return hydrate("Skeleton", {
        ...skeleton,
        bones: skeleton.bones.map(bone => hydrate("Bone", bone, classes))
    }, classes);
}

function buildCmfFromShared(root)
{
    return {
        version: 1,
        metadata: buildCmfMetadata(root),
        meshes: (root.meshes ?? []).map(mesh => buildCmfMesh(mesh)),
        skeletons: root.skeletons ?? [],
        animations: root.cmfAnimations ?? []
    };
}

function buildCmfMetadata(root)
{
    const
        source = String(root.grannyFileSource || ""),
        entries = [];

    if (source && source !== "memory")
    {
        entries.push({ key: "source", value: source });
    }

    entries.push(
        { key: "sourceFormat", value: "fbx" },
        { key: "generator", value: "CjsFbxFormat" }
    );

    return { entries };
}

function buildCmfMesh(mesh)
{
    const
        vertex = mesh.vertex ?? {},
        indices = mesh.indices ?? [],
        boneBindings = (mesh.boneBindings ?? []).map(binding => buildCmfBoneBinding(binding)),
        morphTargets = buildCmfMorphTargets(mesh),
        areas = indices.map(group => buildCmfMeshArea(group, mesh, morphTargets)),
        stride = estimateVertexStride(vertex),
        vertexCount = stride === 0 ? 0 : Math.floor((vertex.position ?? []).length / 3);

    return {
        name: mesh.name ?? "",
        decl: buildCmfDecl(vertex),
        lods: [ {
            vb: { index: 1, offset: 0, size: vertexCount * stride, stride },
            ib: { index: 2, offset: 0, size: totalIndexCount(indices) * cmfBytesPerIndex(indices), stride: cmfBytesPerIndex(indices) },
            areas: indices.map((group, index) => ({
                firstElement: firstTriangle(indices, index),
                elementCount: Math.floor((group.faces ?? []).length / 3)
            })),
            morphTargets: morphTargets.lods,
            threshold: 0xffffffff,
            vertex,
            indices
        } ],
        areas,
        boneBindings,
        morphTargets: {
            decl: morphTargets.decl,
            targets: morphTargets.targets
        },
        uvDensities: [],
        bounds: cmfBounds(mesh),
        audioOcclusionMesh: {
            vertices: [],
            indices: [],
            bounds: { min: [ 0, 0, 0 ], max: [ 0, 0, 0 ] }
        },
        topology: "TriangleList",
        skeleton: mesh.skeleton ?? null,
        vertex,
        indices
    };
}

function buildCmfMeshArea(group, mesh, morphTargets)
{
    const bones = buildCmfAreaBones(group, mesh.vertex ?? {});
    return {
        name: group.name ?? "",
        bounds: cmfAreaBounds(group, mesh),
        bones,
        affectedByBones: bones.length > 0,
        affectedByMorphTargets: isCmfAreaAffectedByMorphTargets(group, mesh.vertex ?? {}, morphTargets.lods)
    };
}

function buildCmfAreaBones(group, vertex)
{
    const
        boneIndices = vertex.blendIndice ?? [],
        boneWeights = vertex.blendWeight ?? [],
        hasWeights = hasArrayValues(boneWeights),
        bones = new Set();

    if (!hasArrayValues(boneIndices))
    {
        return [];
    }

    for (const vertexIndex of group.faces ?? [])
    {
        const offset = vertexIndex * 4;
        for (let i = 0; i < 4; i++)
        {
            const weight = hasWeights ? boneWeights[offset + i] ?? 0 : i === 0 ? 1 : 0;
            if (weight > 0)
            {
                bones.add(boneIndices[offset + i] ?? 0);
            }
        }
    }

    return Array.from(bones);
}

function isCmfAreaAffectedByMorphTargets(group, baseVertex, morphLods)
{
    const basePositions = baseVertex.position ?? [];
    for (const lod of morphLods)
    {
        const positions = lod.vertex?.position ?? [];
        for (const vertexIndex of group.faces ?? [])
        {
            const offset = vertexIndex * 3;
            if (
                positions[offset] !== basePositions[offset] ||
                positions[offset + 1] !== basePositions[offset + 1] ||
                positions[offset + 2] !== basePositions[offset + 2]
            )
            {
                return true;
            }
        }
    }
    return false;
}

function buildCmfMorphTargets(mesh)
{
    const targets = mesh.morphTargets ?? [];
    if (!targets.length)
    {
        return { decl: [], targets: [], lods: [] };
    }

    const
        targetVertices = targets.map(target => target.vertex ?? {}),
        decl = buildCmfDeclFromVertices(targetVertices),
        stride = estimateStrideFromDecl(decl);

    return {
        decl,
        targets: targets.map(target => ({
            name: target.name ?? "",
            maxDisplacement: target.maxDisplacement ?? computeMaxDisplacement(mesh.vertex?.position ?? [], target.vertex?.position ?? [])
        })),
        lods: targets.map(target =>
        {
            const
                morphVertex = target.vertex ?? {},
                vertexCount = Math.floor((morphVertex.position ?? []).length / 3);

            return {
                vb: { index: 0, offset: 0, size: vertexCount * stride, stride },
                vertex: normalizeCmfVertexForDecl(morphVertex, decl, vertexCount)
            };
        })
    };
}

function buildCmfBoneBinding(binding)
{
    return {
        name: binding.name ?? "",
        bounds: {
            min: binding.minBounds ?? binding.bounds?.min ?? [ 0, 0, 0 ],
            max: binding.maxBounds ?? binding.bounds?.max ?? [ 0, 0, 0 ]
        }
    };
}

function buildCmfDecl(vertex)
{
    return buildCmfDeclFromVertices([ vertex ]);
}

function buildCmfDeclFromVertices(vertices)
{
    const decl = [];
    let offset = 0;
    for (const channel of CMF_VERTEX_CHANNELS)
    {
        const [ name, usage, elementCount, usageIndex = 0, type = "Float32" ] = channel;
        if (!vertices.some(vertex => hasArrayValues(vertex[name])))
        {
            continue;
        }
        decl.push({ usage, usageIndex, type, elementCount, offset });
        offset += elementCount * cmfElementTypeSize(type);
    }
    return decl;
}

function normalizeCmfVertexForDecl(vertex, decl, vertexCount)
{
    const normalized = { ...vertex };
    for (const channel of CMF_VERTEX_CHANNELS)
    {
        const [ name, usage, elementCount, usageIndex = 0 ] = channel;
        if (!decl.some(element => element.usage === usage && element.usageIndex === usageIndex))
        {
            continue;
        }
        if (!hasArrayValues(normalized[name]))
        {
            normalized[name] = new Array(vertexCount * elementCount).fill(0);
        }
    }
    return normalized;
}

function estimateVertexStride(vertex)
{
    return estimateStrideFromDecl(buildCmfDecl(vertex));
}

function estimateStrideFromDecl(decl)
{
    return decl.reduce((stride, element) => Math.max(stride, element.offset + element.elementCount * cmfElementTypeSize(element.type)), 0);
}

function cmfElementTypeSize(type)
{
    return type === "Float32" ? 4 : type.includes("16") ? 2 : 1;
}

function totalIndexCount(indices)
{
    return indices.reduce((total, group) => total + (group.faces?.length ?? 0), 0);
}

function cmfBytesPerIndex(indices)
{
    return indices.some(group => group.bytesPerIndex === 4 || (group.faces ?? []).some(index => index > 0xffff)) ? 4 : 2;
}

function firstTriangle(indices, areaIndex)
{
    let first = 0;
    for (let i = 0; i < areaIndex; i++)
    {
        first += Math.floor((indices[i].faces ?? []).length / 3);
    }
    return first;
}

function cmfBounds(mesh)
{
    return {
        min: mesh.minBounds ?? [ 0, 0, 0 ],
        max: mesh.maxBounds ?? [ 0, 0, 0 ]
    };
}

function cmfAreaBounds(group, mesh)
{
    const
        positions = mesh.vertex?.position ?? [],
        areaPositions = [];

    for (const vertexIndex of group.faces ?? [])
    {
        const offset = vertexIndex * 3;
        if (offset + 2 < positions.length)
        {
            areaPositions.push(positions[offset], positions[offset + 1], positions[offset + 2]);
        }
    }

    const bounds = computeBounds(areaPositions);
    return {
        min: bounds.minBounds,
        max: bounds.maxBounds
    };
}

function hydrateCmf(root, classes, hydrationOptions = {})
{
    const hydrationClasses = createHydrationClasses(classes, hydrationOptions);
    return hydrate("Root", {
        ...root,
        metadata: root.metadata ? hydrateCmfMetadata(root.metadata, hydrationClasses) : null,
        meshes: root.meshes.map(mesh => hydrateCmfMesh(mesh, hydrationClasses)),
        skeletons: root.skeletons.map(skeleton => hydrateCmfSkeleton(skeleton, hydrationClasses)),
        animations: root.animations.map(animation => hydrateCmfAnimation(animation, hydrationClasses))
    }, hydrationClasses, hydrationOptions);
}

function hydrateCmfMetadata(metadata, classes)
{
    return hydrate("Metadata", {
        entries: (metadata.entries ?? []).map(entry => hydrate("MetadataEntry", entry, classes))
    }, classes);
}

function hydrateCmfMesh(mesh, classes)
{
    return hydrate("Mesh", {
        ...mesh,
        decl: mesh.decl.map(element => hydrate("VertexElement", element, classes)),
        lods: mesh.lods.map(lod => hydrate("MeshLod", {
            ...lod,
            areas: lod.areas.map(area => hydrate("LodMeshArea", area, classes)),
            morphTargets: lod.morphTargets.map(target => hydrate("LodMorphTarget", target, classes))
        }, classes)),
        areas: mesh.areas.map(area => hydrate("MeshArea", area, classes)),
        boneBindings: mesh.boneBindings.map(binding => hydrate("BoneBinding", binding, classes)),
        morphTargets: hydrate("MorphTargets", {
            decl: mesh.morphTargets.decl.map(element => hydrate("VertexElement", element, classes)),
            targets: mesh.morphTargets.targets.map(target => hydrate("MorphTarget", target, classes))
        }, classes),
        audioOcclusionMesh: hydrate("AudioOcclusionMesh", mesh.audioOcclusionMesh, classes)
    }, classes);
}

function hydrateCmfSkeleton(skeleton, classes)
{
    return hydrate("Skeleton", {
        ...skeleton,
        boneMasks: skeleton.boneMasks.map(mask => hydrate("BoneMask", {
            ...mask,
            weights: mask.weights.map(weight => hydrate("BoneWeight", weight, classes))
        }, classes))
    }, classes);
}

function hydrateCmfAnimation(animation, classes)
{
    return hydrate("Animation", {
        ...animation,
        channels: animation.channels.map(channel => hydrate("AnimationChannel", channel, classes)),
        curves: animation.curves.map(curve => hydrate("AnimationCurve", curve, classes))
    }, classes);
}

function hydrate(type, fields, classes, hydrationOptions = {})
{
    const Class = classes?.[type];
    if (!Class)
    {
        return fields;
    }

    const options = Object.keys(hydrationOptions).length > 0 ? hydrationOptions : classes?.__hydrationOptions || {};
    return populate(new Class(), fields, options);
}

function populate(instance, fields, hydrationOptions = {})
{
    if (!instance || typeof instance.SetValues !== "function")
    {
        throw new TypeError("CjsFbxFormat class population requires classes to implement SetValues(values)");
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

function buildFbxRoot(nodes)
{
    const headerNode = findFirstNode(nodes, "FBXHeaderExtension");
    const globalSettingsNode = findFirstNode(nodes, "GlobalSettings");
    const definitionsNode = findFirstNode(nodes, "Definitions");
    const objectsNode = findFirstNode(nodes, "Objects");
    const connectionsNode = findFirstNode(nodes, "Connections");

    return {
        rootNodeNames: nodes.map(node => node.name),
        header: readHeader(headerNode),
        globalSettings: readProperties70(globalSettingsNode),
        definitions: readDefinitions(definitionsNode),
        objects: readObjects(objectsNode),
        connections: readConnections(connectionsNode)
    };
}

function readHeader(node)
{
    if (!node)
    {
        return {};
    }

    return {
        fbxHeaderVersion: readFirstChildProperty(node, "FBXHeaderVersion"),
        fbxVersion: readFirstChildProperty(node, "FBXVersion"),
        creator: readFirstChildProperty(node, "Creator")
    };
}

function readDefinitions(node)
{
    if (!node)
    {
        return {
            version: 0,
            count: 0,
            objectTypes: []
        };
    }

    return {
        version: readFirstChildProperty(node, "Version") || 0,
        count: readFirstChildProperty(node, "Count") || 0,
        objectTypes: node.children
            .filter(child => child.name === "ObjectType")
            .map(readObjectType)
    };
}

function readObjectType(node)
{
    return {
        type: node.properties[0] || "",
        count: readFirstChildProperty(node, "Count") || 0
    };
}

function readObjects(node)
{
    const byId = {};
    const byType = {};
    const list = [];

    if (!node)
    {
        return { count: 0, list, byId, byType };
    }

    for (const child of node.children)
    {
        if (child.properties.length === 0)
        {
            continue;
        }

        const entry = readObjectEntry(child);
        list.push(entry);
        byId[entry.key] = entry;
        if (!byType[entry.nodeName])
        {
            byType[entry.nodeName] = [];
        }
        byType[entry.nodeName].push(entry.key);
    }

    return {
        count: list.length,
        list,
        byId,
        byType
    };
}

function readObjectEntry(node)
{
    const id = node.properties[0];
    const fullName = node.properties[1] || "";
    const className = node.properties[2] || "";

    return {
        id,
        key: toObjectKey(id),
        nodeName: node.name,
        name: getShortObjectName(fullName),
        fullName,
        className,
        propertyCount: node.properties.length,
        childCount: node.children.length,
        attributeNames: node.children.map(child => child.name)
    };
}

function readConnections(node)
{
    const list = [];
    const parentsByChild = {};
    const childrenByParent = {};

    if (node)
    {
        for (const child of node.children)
        {
            if (child.name !== "C")
            {
                continue;
            }

            const entry = {
                relation: child.properties[0] || "",
                childId: child.properties[1],
                parentId: child.properties[2],
                property: child.properties[3] || ""
            };
            entry.childKey = toObjectKey(entry.childId);
            entry.parentKey = toObjectKey(entry.parentId);
            list.push(entry);
            pushIndex(parentsByChild, entry.childKey, entry.parentKey);
            pushIndex(childrenByParent, entry.parentKey, entry.childKey);
        }
    }

    return {
        count: list.length,
        list,
        parentsByChild,
        childrenByParent
    };
}

function readProperties70(node)
{
    const properties = {};
    const properties70 = node ? findFirstNode(node.children, "Properties70") : null;

    if (!properties70)
    {
        return { properties };
    }

    for (const child of properties70.children)
    {
        if (child.name !== "P" || child.properties.length === 0)
        {
            continue;
        }

        const key = child.properties[0];
        properties[key] = {
            type: child.properties[1] || "",
            label: child.properties[2] || "",
            flags: child.properties[3] || "",
            value: getProperty70Value(child.properties)
        };
    }

    return { properties };
}

function getProperty70Value(properties)
{
    if (properties.length <= 5)
    {
        return properties[4];
    }
    return properties.slice(4);
}

function readFirstChildProperty(node, childName)
{
    const child = findFirstNode(node.children, childName);
    return child ? child.properties[0] : undefined;
}

function findFirstNode(nodes, name)
{
    return nodes.find(node => node.name === name) || null;
}

function getShortObjectName(fullName)
{
    if (typeof fullName !== "string")
    {
        return "";
    }
    const
        fbxClassMarker = fullName.indexOf("\u0000\u0001"),
        objectName = fbxClassMarker === -1 ? fullName : fullName.slice(0, fbxClassMarker),
        namespaceMarker = objectName.lastIndexOf("::");

    return namespaceMarker === -1 ? objectName : objectName.slice(namespaceMarker + 2);
}

function pushIndex(index, key, value)
{
    if (!index[key])
    {
        index[key] = [];
    }
    index[key].push(value);
}

function toObjectKey(value)
{
    return value === undefined || value === null ? "" : String(value);
}

function parseAsciiLine(line, values)
{
    const match = /^([A-Za-z_][\w.]*)\s*:\s*(.*)$/u.exec(line);
    if (!match)
    {
        return null;
    }

    let body = match[2].trim();
    const opensBlock = body.endsWith("{");
    if (opensBlock)
    {
        body = body.slice(0, -1).trim();
    }

    const properties = body ? parseAsciiProperties(body) : [];
    if (properties.length > values.maxProperties)
    {
        throw new Error(`fbx: ASCII node ${match[1]} exceeds maxProperties (${values.maxProperties})`);
    }

    return {
        name: match[1],
        properties,
        propertyTypes: [],
        children: [],
        opensBlock
    };
}

function parseAsciiProperties(body)
{
    return splitAsciiProperties(body).map(parseAsciiValue);
}

function splitAsciiProperties(body)
{
    const parts = [];
    let current = "";
    let quoted = false;
    let escaped = false;

    for (let i = 0; i < body.length; i++)
    {
        const char = body[i];
        if (escaped)
        {
            current += char;
            escaped = false;
            continue;
        }
        if (char === "\\")
        {
            current += char;
            escaped = true;
            continue;
        }
        if (char === "\"")
        {
            quoted = !quoted;
            current += char;
            continue;
        }
        if (char === "," && !quoted)
        {
            parts.push(current.trim());
            current = "";
            continue;
        }
        current += char;
    }

    if (current.trim() || body.endsWith(","))
    {
        parts.push(current.trim());
    }

    return parts;
}

function parseAsciiValue(value)
{
    if (/^".*"$/u.test(value))
    {
        return value.slice(1, -1).replace(/\\"/gu, "\"").replace(/\\\\/gu, "\\");
    }
    if (/^(true|false)$/iu.test(value))
    {
        return value.toLowerCase() === "true";
    }
    if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/iu.test(value))
    {
        return Number(value);
    }
    return value;
}

function stripAsciiComment(line)
{
    let quoted = false;
    let escaped = false;
    for (let i = 0; i < line.length; i++)
    {
        const char = line[i];
        if (escaped)
        {
            escaped = false;
            continue;
        }
        if (char === "\\")
        {
            escaped = true;
            continue;
        }
        if (char === "\"")
        {
            quoted = !quoted;
            continue;
        }
        if (char === ";" && !quoted)
        {
            return line.slice(0, i);
        }
    }
    return line;
}

function isBinaryFBX(bytes)
{
    if (bytes.byteLength < BINARY_HEADER_SIZE)
    {
        return false;
    }
    for (let i = 0; i < BINARY_SIGNATURE.length; i++)
    {
        if (bytes[i] !== BINARY_SIGNATURE.charCodeAt(i))
        {
            return false;
        }
    }
    return true;
}

function isAsciiFBXText(text)
{
    return /(^|\n)\s*FBXHeaderExtension\s*:/u.test(text) ||
        /(^|\n)\s*Objects\s*:/u.test(text) ||
        /;\s*FBX\s+\d+\.\d+\.\d+/iu.test(text);
}

function countAsciiRootNodes(text)
{
    return collectAsciiRootNames(text).length;
}

function collectAsciiRootNames(text)
{
    const names = [];
    let depth = 0;

    for (const rawLine of text.split(/\r?\n/u))
    {
        const line = stripAsciiComment(rawLine).trim();
        if (!line)
        {
            continue;
        }
        if (line.startsWith("}"))
        {
            depth = Math.max(depth - 1, 0);
            continue;
        }

        const match = /^([A-Za-z_][\w.]*)\s*:/u.exec(line);
        if (match && depth === 0)
        {
            names.push(match[1]);
        }
        if (line.endsWith("{"))
        {
            depth++;
        }
    }

    return names;
}

function readAsciiVersion(text)
{
    const direct = /FBXVersion\s*:\s*(\d+)/u.exec(text);
    if (direct)
    {
        return Number(direct[1]);
    }

    const comment = /;\s*FBX\s+(\d+)\.(\d+)\.(\d+)/iu.exec(text);
    if (!comment)
    {
        return 0;
    }
    return Number(`${comment[1]}${comment[2].padStart(2, "0")}${comment[3].padStart(2, "0")}`);
}

function decodeAsciiPrefix(bytes, length)
{
    let text = "";
    const count = Math.min(bytes.byteLength, length);
    for (let i = 0; i < count; i++)
    {
        const byte = bytes[i];
        if (byte === 0)
        {
            break;
        }
        text += String.fromCharCode(byte);
    }
    return text;
}

function getBinaryNodeHeaderSize(version)
{
    return version >= 7500 ? NODE_HEADER_64_SIZE : NODE_HEADER_32_SIZE;
}

function isNullRecord(bytes, offset, length)
{
    if (offset + length > bytes.byteLength)
    {
        return false;
    }
    for (let i = 0; i < length; i++)
    {
        if (bytes[offset + i] !== 0)
        {
            return false;
        }
    }
    return true;
}

function getArrayElementSize(type)
{
    if (type === "d" || type === "l")
    {
        return 8;
    }
    if (type === "f" || type === "i")
    {
        return 4;
    }
    return 1;
}

function normalizeIntegerLimit(value, fieldName, readerName)
{
    if (!Number.isInteger(value) || value < 1)
    {
        throw new TypeError(`${readerName}: ${fieldName} must be a positive integer`);
    }
    return value;
}

/**
 * Normalize a boolean reader option.
 *
 * @param {boolean|0|1} value Option value.
 * @param {string} fieldName Option name.
 * @param {string} readerName Reader name for errors.
 * @returns {boolean} Normalized boolean.
 */
function normalizeBooleanOption(value, fieldName, readerName)
{
    if (typeof value === "boolean")
    {
        return value;
    }
    if (value === 0 || value === 1)
    {
        return Boolean(value);
    }
    throw new TypeError(`${readerName}: ${fieldName} must be a boolean`);
}

function hasOwn(value, key)
{
    return Object.prototype.hasOwnProperty.call(value, key);
}

function normalizeClasses(classes, readerName)
{
    if (!classes)
    {
        return {};
    }
    if (typeof classes !== "object" || Array.isArray(classes))
    {
        throw new TypeError(`${readerName}: classes must be an object map`);
    }

    const normalized = {};
    for (const [ key, Class ] of Object.entries(classes))
    {
        validateClass(key, Class, readerName);
        normalized[key] = Class;
    }
    return normalized;
}

function mergeClasses(base, classes, readerName)
{
    if (!classes || typeof classes !== "object" || Array.isArray(classes))
    {
        throw new TypeError(`${readerName}: classes must be an object map`);
    }

    const normalized = normalizeClasses(base, readerName);
    for (const [ key, Class ] of Object.entries(classes))
    {
        if (Class === null || Class === undefined)
        {
            validateClassKey(key, readerName);
            delete normalized[key];
            continue;
        }
        validateClass(key, Class, readerName);
        normalized[key] = Class;
    }
    return normalized;
}

function hasClasses(classes)
{
    return !!classes && Object.values(classes).some(Class => typeof Class === "function");
}

function finiteNumber(value, feature)
{
    const number = Number(value);
    if (!Number.isFinite(number))
    {
        throw new Error(`fbx: ${feature} contains a non-finite number`);
    }
    return number;
}

function integerNumber(value, feature)
{
    const number = finiteNumber(value, feature);
    if (!Number.isInteger(number))
    {
        throw new Error(`fbx: ${feature} contains a non-integer value`);
    }
    return number;
}

function ensureRange(bytes, offset, length, message)
{
    if (offset + length > bytes.byteLength)
    {
        throw new Error(message);
    }
}

function readString(bytes, offset, length)
{
    ensureRange(bytes, offset, length, "fbx: string is truncated");
    return TEXT_DECODER.decode(bytes.subarray(offset, offset + length));
}

function readU32LE(bytes, offset)
{
    return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] * 0x1000000)) >>> 0;
}

function readU32BE(bytes, offset)
{
    return (((bytes[offset] << 24) >>> 0) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function readI16LE(bytes, offset)
{
    const value = bytes[offset] | (bytes[offset + 1] << 8);
    return value & 0x8000 ? value - 0x10000 : value;
}

function readI32LE(bytes, offset)
{
    return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
}

function readU64LEAsNumber(bytes, offset)
{
    const low = readU32LE(bytes, offset);
    const high = readU32LE(bytes, offset + 4);
    return high * 0x100000000 + low;
}

function readI64LEValue(bytes, offset)
{
    const low = readU32LE(bytes, offset);
    const highUnsigned = readU32LE(bytes, offset + 4);
    const negative = !!(highUnsigned & 0x80000000);
    let value = highUnsigned * 0x100000000 + low;

    if (negative)
    {
        value -= 0x10000000000000000;
    }

    return Number.isSafeInteger(value) ? value : String(value);
}

function readF32LE(bytes, offset)
{
    return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getFloat32(0, true);
}

function readF64LE(bytes, offset)
{
    return new DataView(bytes.buffer, bytes.byteOffset + offset, 8).getFloat64(0, true);
}
