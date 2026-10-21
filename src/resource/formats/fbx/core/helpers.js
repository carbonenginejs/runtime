import { CjsSchema } from "#schema/CjsSchema";

import { adler32 } from "#utils/checksum";
import { asUint8Array, getArrayBufferViewName } from "#utils/bytes";
import {
    generateBiNormals,
    generateNormals,
    generateTangents
} from "#math/mesh";
import { CMF_CLASS_KEYS, GR2_CLASS_KEYS } from "../../cmf/core/constants.js";
import { buildGr2Animations } from "../../cmf/core/gr2Compat.js";
import { buildCmfFromShared as buildCanonicalCmfFromShared } from "../../cmf/core/shared.js";
import { hydrateCmf } from "../../cmf/core/utils/hydration.js";
import {
    invertMatrix4 as invertSharedMatrix4,
    multiplyMatrix4,
    transposeMatrix4
} from "../../cmf/core/utils/matrix.js";
import {
    normalizeQuaternionSeries,
    normalizedLerpQuaternion,
    quaternionAngularDifference,
    quaternionSegmentMidpointTick,
    quaternionSegmentNeedsSubdivision
} from "../../cmf/core/utils/quaternion.js";

export { CMF_CLASS_KEYS, GR2_CLASS_KEYS };

export const OUTPUT_CMF = "cmf";
export const OUTPUT_GR2 = "gr2";
export const OUTPUT_RAW = "raw";
export const OUTPUT_JSON = "json";
export const OUTPUT_FBX_JSON = "fbxJson";
export const COMPATIBILITY_SOURCE = "source";
export const COMPATIBILITY_CARBON = "carbon";

export const CLASS_KEYS = Array.from(new Set([
    ...GR2_CLASS_KEYS,
    ...CMF_CLASS_KEYS
]));

export const DEFAULT_VALUES = {
    emit: OUTPUT_RAW,
    inputType: "fbx",
    source: "",
    flipV: true,
    compatibility: COMPATIBILITY_SOURCE,
    classes: {},
    maxBytes: 256 * 1024 * 1024,
    maxNodes: 250000,
    maxDepth: 128,
    maxProperties: 4096,
    maxArrayLength: 20000000
};

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
    "compatibility",
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
const CMF_VERTEX_CHANNELS = [
    [ "position", "Position", 3 ],
    [ "normal", "Normal", 3 ],
    [ "tangent", "Tangent", 3 ],
    [ "binormal", "Binormal", 3 ],
    [ "texcoord0", "TexCoord", 2, 0 ],
    [ "texcoord1", "TexCoord", 2, 1 ],
    [ "color0", "Color", 4, 0 ],
    [ "blendIndice", "BoneIndices", 4, 0, "UInt8" ],
    [ "blendWeight", "BoneWeights", 4, 0 ]
];
const CMF_MORPH_CHANNELS = CMF_VERTEX_CHANNELS.slice(0, 4);
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
 * Normalized FBX reader values.
 *
 * @typedef {object} FbxReaderValues
 * @property {string} emit Emit target: "raw", "fbxJson", "gr2" or "cmf".
 * @property {string} inputType Input type, lower case without a leading dot.
 * @property {string} source Resource path or label.
 * @property {boolean} flipV Whether imported UV V coordinates are flipped.
 * @property {string} compatibility "source" or "carbon".
 * @property {Object<string, Function>} classes Output node constructors by class key.
 * @property {number} maxBytes Maximum input byte length.
 * @property {number} maxNodes Maximum node count.
 * @property {number} maxDepth Maximum node depth.
 * @property {number} maxProperties Maximum properties per node.
 * @property {number} maxArrayLength Maximum array property length.
 */

/**
 * Encoding detection for FBX bytes.
 *
 * @typedef {object} FbxDetection
 * @property {string} encoding "binary", "ascii", or "" when unrecognized.
 * @property {number} version FBX version, or 0 when unknown.
 * @property {string} signature Detected signature text.
 * @property {number} rootNodeCount Root node count.
 * @property {string[]} rootNodeNames Root node names.
 * @property {number} confidence Detection confidence from 0 to 1.
 */

/**
 * Lightweight FBX metadata.
 *
 * @typedef {FbxDetection & {sourceFormat: string, byteLength: number, source: string}} FbxMetadata
 */

/**
 * Raw read payload.
 *
 * @typedef {object} FbxRawPayload
 * @property {string} sourceFormat Always "fbx".
 * @property {FbxMetadata} metadata Inspected metadata.
 * @property {Uint8Array} bytes Input bytes.
 */

/**
 * FBX support report.
 *
 * @typedef {object} FbxSupportReport
 * @property {string} format Always "fbx".
 * @property {string} source Resource path, or "buffer".
 * @property {string} supported "partial" or "none".
 * @property {number} confidence Detection confidence.
 * @property {string} preferredOutput Preferred emit target, or "".
 * @property {string} reason Support summary or error message.
 * @property {FbxMetadata|null} metadata Inspected metadata, or null on error.
 * @property {Array<{kind: string, codec: string, supported: boolean, reason?: string}>} variants Output variants.
 * @property {string[]} warnings Feature warnings.
 * @property {string[]} errors Errors.
 */

/**
 * Feature-support warnings and errors.
 *
 * @typedef {object} FbxDiagnostics
 * @property {string[]} warnings Warning messages.
 * @property {string[]} errors Error messages.
 */

/**
 * Compressed array property left undecoded.
 *
 * @typedef {object} FbxCompressedArray
 * @property {string} arrayType Array type code.
 * @property {number} length Element count.
 * @property {number} encoding Array encoding value.
 * @property {number} byteOffset Byte offset of the array data.
 * @property {number} byteLength Byte length of the array data.
 * @property {boolean} compressed Always true.
 */

/**
 * Decoded FBX property value.
 *
 * @typedef {number|string|boolean|Uint8Array|Float32Array|Float64Array|Int32Array|Array<number|string|boolean>|FbxCompressedArray} FbxPropertyValue
 */

/**
 * Parsed FBX node.
 *
 * @typedef {object} FbxNode
 * @property {string} name Node name.
 * @property {FbxPropertyValue[]} properties Property values.
 * @property {string[]} propertyTypes Binary property type codes; empty for ASCII nodes.
 * @property {FbxNode[]} children Child nodes.
 */

/**
 * Parsed FBX document.
 *
 * @typedef {FbxMetadata & {nodes: FbxNode[], nodeCount: number, root: object}} FbxDocument
 */

/**
 * Binary node header.
 *
 * @typedef {object} FbxBinaryNodeHeader
 * @property {number} endOffset Byte offset after the node.
 * @property {number} propertyCount Property count.
 * @property {number} propertyListLength Property list byte length.
 * @property {number} nameLength Name byte length.
 * @property {number} nameOffset Name byte offset.
 * @property {string} name Node name.
 * @property {number} propertiesOffset Byte offset of the first property.
 */

/**
 * Binary property read result.
 *
 * @typedef {object} FbxBinaryPropertyResult
 * @property {string} type Property type code.
 * @property {FbxPropertyValue} value Decoded value.
 * @property {number} offset Byte offset after the property.
 */

/**
 * Inflate output state.
 *
 * @typedef {object} FbxInflateState
 * @property {Uint8Array} output Output bytes.
 * @property {number} offset Next output offset.
 */

/**
 * Deflate literal/length and distance tables.
 *
 * @typedef {object} FbxDeflateTables
 * @property {DeflateHuffmanTable} literalLength Literal/length table.
 * @property {DeflateHuffmanTable} distance Distance table.
 */

/**
 * Object summary read from an Objects child node.
 *
 * @typedef {object} FbxObjectSummary
 * @property {FbxPropertyValue} id Object id.
 * @property {string} key Object id as a string key.
 * @property {string} nodeName Object node name, such as "Geometry".
 * @property {string} name Short object name.
 * @property {string} fullName Full object name property.
 * @property {string} className Object class property.
 * @property {number} propertyCount Property count.
 * @property {number} childCount Child node count.
 * @property {string[]} attributeNames Child node names.
 */

/**
 * Indexed object entry with its source node.
 *
 * @typedef {FbxObjectSummary & {node: FbxNode}} FbxObjectEntry
 */

/**
 * Objects indexed by key and node name.
 *
 * @typedef {object} FbxObjectIndex
 * @property {FbxObjectEntry[]} list Entries in document order.
 * @property {Object<string, FbxObjectEntry>} byId Entries by key.
 * @property {Object<string, FbxObjectEntry[]>} byType Entries by node name.
 */

/**
 * One FBX connection.
 *
 * @typedef {object} FbxConnection
 * @property {string} relation Relation, such as "OO" or "OP".
 * @property {FbxPropertyValue} childId Child object id.
 * @property {FbxPropertyValue} parentId Parent object id.
 * @property {string} property Connected property name, or "".
 * @property {string} childKey Child object key.
 * @property {string} parentKey Parent object key.
 */

/**
 * Connections indexed in both directions.
 *
 * @typedef {object} FbxConnections
 * @property {number} count Connection count.
 * @property {FbxConnection[]} list Connections in document order.
 * @property {Object<string, string[]>} parentsByChild Parent keys by child key.
 * @property {Object<string, string[]>} childrenByParent Child keys by parent key.
 */

/**
 * One Properties70 definition.
 *
 * @typedef {object} FbxProperty70
 * @property {FbxPropertyValue} type Property type.
 * @property {FbxPropertyValue} label Property label.
 * @property {FbxPropertyValue} flags Property flags.
 * @property {FbxPropertyValue|FbxPropertyValue[]|undefined} value Single value, or an array for multiple values.
 */

/**
 * Scene axis and unit conversion from GlobalSettings.
 *
 * @typedef {object} FbxSceneTransform
 * @property {number} scale Unit scale.
 * @property {number[]} right Right axis vector.
 * @property {number[]} up Up axis vector.
 * @property {number[]} forward Forward axis vector.
 */

/**
 * World transform state of a Model.
 *
 * @typedef {object} FbxModelTransformState
 * @property {number[]} nodeToWorld Node-to-world matrix.
 * @property {number[]} unscaledNodeToWorld Node-to-world matrix without local scale.
 * @property {number[]} inheritScale Scale inherited by children.
 */

/**
 * Local transform state of a Model.
 *
 * @typedef {object} FbxModelLocalState
 * @property {Object<string, FbxProperty70>} properties Model Properties70.
 * @property {number[]} translation Local translation.
 * @property {number[]} scale Local scale.
 * @property {number} inheritType InheritType property.
 * @property {number[]} matrix Local matrix.
 * @property {number[]} unscaledMatrix Local matrix with unit scale.
 */

/**
 * Translation, quaternion rotation and scale.
 *
 * @typedef {object} FbxTransform
 * @property {number[]} position Translation.
 * @property {number[]} rotation Quaternion as [x, y, z, w].
 * @property {number[]} scale Scale.
 */

/**
 * One polygon corner of decoded geometry.
 *
 * @typedef {object} FbxPolygonCorner
 * @property {number} outputIndex Expanded vertex index.
 * @property {number} controlPointIndex Control point index.
 * @property {number} polygonIndex Polygon index.
 * @property {number} polygonCornerIndex Corner index within the polygon.
 */

/**
 * Geometry decoded to polygon corners.
 *
 * @typedef {object} FbxDecodedPolygons
 * @property {number[]} positions Expanded corner positions.
 * @property {FbxPolygonCorner[]} corners Corners in order.
 * @property {number[][]} polygons Expanded vertex indices per polygon.
 */

/**
 * Axis-aligned bounds.
 *
 * @typedef {object} FbxBounds
 * @property {number[]} minBounds Minimum corner.
 * @property {number[]} maxBounds Maximum corner.
 */

/**
 * Mesh bone binding.
 *
 * @typedef {FbxBounds & {name: string}} FbxBoneBinding
 */

/**
 * Skin cluster data merged per linked bone.
 *
 * @typedef {object} FbxSkinClusterRecord
 * @property {FbxObjectEntry} cluster First Cluster deformer for the bone.
 * @property {FbxObjectEntry} bone Linked bone Model.
 * @property {string} boneKey Bone object key.
 * @property {string} boneName Bone name.
 * @property {number[]} indexes Control point indexes.
 * @property {number[]} weights Weights.
 */

/**
 * One bone influence on a control point.
 *
 * @typedef {object} FbxInfluence
 * @property {number} boneIndex Bone binding index.
 * @property {string} boneKey Bone object key.
 * @property {string} boneName Bone name.
 * @property {number} weight Weight.
 */

/**
 * Skin data for one mesh.
 *
 * @typedef {object} FbxSkinning
 * @property {FbxBoneBinding[]} boneBindings Bone bindings.
 * @property {number[]} blendIndice Four binding indices per vertex.
 * @property {number[]} blendWeight Four weights per vertex.
 * @property {string[]} boneKeys Bone object keys per binding.
 * @property {number|null} skeleton Skeleton index, or null.
 */

/**
 * GR2 bone.
 *
 * @typedef {object} FbxGr2Bone
 * @property {string} name Bone name.
 * @property {number} parentIndex Parent bone index, or -1.
 * @property {number} flag Bone flags.
 * @property {number[]} position Translation.
 * @property {number[]} orientation Quaternion as [x, y, z, w].
 * @property {number[]} scaleShear 3x3 scale/shear matrix.
 */

/**
 * CMF bone mask.
 *
 * @typedef {object} FbxBoneMask
 * @property {string} name Mask name.
 * @property {Array<{index: number, weight: number}>} weights Weight per bone index.
 */

/**
 * CMF skeleton.
 *
 * @typedef {object} FbxCmfSkeleton
 * @property {string} name Skeleton name.
 * @property {string[]} bones Bone names.
 * @property {number[]} parents Parent indices; 0xffffffff marks a root.
 * @property {FbxTransform[]} restTransforms Rest transform per bone.
 * @property {number[][]} invBindTransforms Inverse bind matrix per bone.
 * @property {FbxBoneMask[]} boneMasks Bone masks.
 */

/**
 * Imported bone record.
 *
 * @typedef {object} FbxBoneRecord
 * @property {FbxObjectEntry} bone Bone Model.
 * @property {number} parentIndex Parent record index, or -1.
 * @property {number[]} localMatrix Local matrix.
 * @property {FbxTransform} transform Local transform.
 */

/**
 * Imported skeleton in GR2 and CMF form.
 *
 * @typedef {object} FbxImportedSkeleton
 * @property {string} name Skeleton name.
 * @property {string[]} boneKeys Bone object keys.
 * @property {{name: string, bones: FbxGr2Bone[]}} gr2Skeleton GR2 skeleton.
 * @property {FbxCmfSkeleton} cmfSkeleton CMF skeleton.
 */

/**
 * Imported skeletons and bone lookup.
 *
 * @typedef {object} FbxSkeletonContext
 * @property {FbxImportedSkeleton[]} skeletons Skeletons.
 * @property {Map<string, number>} boneToSkeletonIndex Skeleton index by bone key.
 */

/**
 * Index group of one material slot.
 *
 * @typedef {object} FbxIndexGroup
 * @property {string} name Material name.
 * @property {number} bytesPerIndex 2 or 4.
 * @property {number[]} faces Triangle indices.
 */

/**
 * Material slot.
 *
 * @typedef {object} FbxMaterialSlot
 * @property {string} key Material key.
 * @property {string} name Material name.
 */

/**
 * Material slots and per-polygon slot selection.
 *
 * @typedef {object} FbxMaterialSelection
 * @property {FbxMaterialSlot[]} slots Material slots.
 * @property {number[]} polygonSlots Slot index per polygon.
 */

/**
 * Imported morph target.
 *
 * @typedef {object} FbxMorphTarget
 * @property {string} name Target name.
 * @property {boolean} dataIsDeltas Always false; positions are absolute.
 * @property {number} maxDisplacement Largest position displacement.
 * @property {Object<string, number[]>} vertex Vertex channels.
 */

/**
 * Imported GR2-shaped mesh.
 *
 * @typedef {object} FbxGr2Mesh
 * @property {string} name Mesh name.
 * @property {FbxMorphTarget[]} morphTargets Morph targets.
 * @property {number[]} minBounds Minimum corner.
 * @property {number[]} maxBounds Maximum corner.
 * @property {FbxBoneBinding[]} boneBindings Bone bindings.
 * @property {Object<string, number[]>} vertex Vertex channels.
 * @property {FbxIndexGroup[]} indices Index groups.
 * @property {number|null} skeleton Skeleton index, or null.
 */

/**
 * GR2 model.
 *
 * @typedef {object} FbxGr2Model
 * @property {string} name Model name.
 * @property {{name: string, bones: FbxGr2Bone[]}} skeleton GR2 skeleton.
 * @property {number[]} meshBindings Bound mesh indices.
 */

/**
 * Imported animation curve sampled at FBX ticks.
 *
 * @typedef {object} FbxAnimationCurve
 * @property {number[]} ticks Key times in FBX ticks.
 * @property {number[]} values Key values, `valueDimension` per key.
 * @property {string} interpolation "Linear", "Step" or "Mixed".
 * @property {string[]} [interpolations] Interpolation per key.
 */

/**
 * Bone animation target.
 *
 * @typedef {object} FbxBoneTarget
 * @property {string} name Bone name.
 * @property {boolean} isRoot Whether the bone is a skeleton root.
 */

/**
 * Imported animation channel before CMF packing.
 *
 * @typedef {object} FbxAnimationRecord
 * @property {string} target Target name.
 * @property {string} targetType "MorphTarget", "BonePosition", "BoneRotation" or "BoneScale".
 * @property {number} valueDimension Values per key.
 * @property {FbxAnimationCurve} curve Curve.
 * @property {string} [source] Morph source: "deformPercent" or "rootProperty".
 * @property {FbxObjectEntry} [_bone] Bone Model of a bone record.
 * @property {FbxBoneTarget} [_boneTarget] Bone target of a bone record.
 * @property {string} [_property] "position", "rotation" or "scale".
 * @property {FbxAnimationCurve} [_vectorCurve] Source vector curve.
 */

/**
 * CMF animation curve.
 *
 * @typedef {object} FbxCmfCurve
 * @property {number} valueDimension Values per key.
 * @property {string} interpolation Interpolation.
 * @property {string} knotType Knot element type.
 * @property {string} valueType Value element type.
 * @property {number} knotCount Knot count.
 * @property {number[]} knots Packed float32 knot bytes.
 * @property {number[]} values Packed float32 value bytes.
 */

/**
 * CMF animation.
 *
 * @typedef {object} FbxCmfAnimation
 * @property {string} name Animation name.
 * @property {Array<{target: string, targetType: string, curveIndex: number}>} channels Channels.
 * @property {FbxCmfCurve[]} curves Curves.
 * @property {number} duration Duration in seconds.
 */

/**
 * Imported GR2-shaped root.
 *
 * @typedef {object} FbxGr2Root
 * @property {number} grannyFileFormatRevision Granny file format revision.
 * @property {string} grannyFileSource Source label.
 * @property {FbxGr2Mesh[]} meshes Meshes.
 * @property {FbxGr2Model[]} models Models.
 * @property {FbxCmfSkeleton[]} skeletons CMF skeletons.
 * @property {object[]} animations GR2 animations.
 * @property {FbxCmfAnimation[]} cmfAnimations CMF animations.
 */

/**
 * Node record for the binary FBX writer.
 *
 * @typedef {object} FbxWriteNode
 * @property {string} name Node name.
 * @property {FbxWriteProperty[]} properties Properties.
 * @property {FbxWriteNode[]} children Child nodes.
 * @property {boolean} forceSentinel Whether to write the null sentinel record even without children.
 */

/**
 * Property record for the binary FBX writer.
 *
 * @typedef {object} FbxWriteProperty
 * @property {string} type Property type code.
 * @property {number|bigint|string|Uint8Array} [value] Scalar, string or raw value.
 * @property {ArrayLike<number|bigint>} [values] Array values.
 */

/**
 * Decoded CMF curve for the FBX writer.
 *
 * @typedef {object} FbxWriteCurve
 * @property {string} interpolation "Step" or "Linear".
 * @property {number} valueDimension Values per key.
 * @property {number} knotCount Knot count.
 * @property {number[]} knots Knot times in seconds.
 * @property {number[]} ticks Knot times in FBX ticks.
 * @property {number[]} values Key values.
 */

/**
 * Normalized FBX write options.
 *
 * @typedef {object} FbxWriteOptions
 * @property {number} version FBX version.
 * @property {string} compatibility "source" or "carbon".
 * @property {number|string|null|undefined} morphAnimationRoot Carbon morph animation carrier skeleton index or name.
 * @property {boolean} [flipV] When not false, UV V coordinates are written as `1 - v`.
 */

/**
 * Skeleton root that carries Carbon morph animation properties.
 *
 * @typedef {object} FbxMorphCarrier
 * @property {number} skeletonIndex Skeleton index.
 * @property {number} rootBoneIndex Root bone index.
 * @property {string[]} names Animated morph target names.
 */

/**
 * Normalize reader values.
 *
 * @param {Partial<FbxReaderValues>} [base] Base values.
 * @param {Partial<FbxReaderValues>} [options] Override values.
 * @param {string} [readerName] Reader name for errors.
 * @returns {FbxReaderValues} Normalized values.
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
    values.compatibility = normalizeCompatibility(values.compatibility, readerName);
    values.classes = Object.hasOwn(options, "classes")
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
 * Read FBX bytes with normalized values.
 *
 * @param {Uint8Array|ArrayBuffer|DataView} input FBX bytes.
 * @param {FbxReaderValues} [values=DEFAULT_VALUES] Normalized reader values.
 * @returns {FbxRawPayload|FbxDocument|object} Raw or debug payload.
 */
export function readWithValues(input, values = DEFAULT_VALUES)
{
    const bytes = asUint8Array(input, "Fbx input");

    if (values.emit === OUTPUT_RAW)
    {
        const metadata = inspectWithValues(bytes, values);
        return {
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
 * @param {FbxReaderValues} [values=DEFAULT_VALUES] Normalized reader values.
 * @returns {FbxMetadata} Lightweight FBX metadata.
 */
export function inspectWithValues(input, values = DEFAULT_VALUES)
{
    const bytes = asUint8Array(input, "Fbx input");
    const detected = inspectBytes(bytes);

    return {
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
 * @param {FbxReaderValues} [values=DEFAULT_VALUES] Normalized reader values.
 * @returns {FbxDocument} Parsed FBX document.
 */
export function parseWithValues(input, values = DEFAULT_VALUES)
{
    return {
        ...parseDocumentWithValues(input, values),
    };
}

/**
 * Read static FBX mesh data into GR2-shaped caller classes.
 *
 * @param {Uint8Array|ArrayBuffer|DataView} input FBX bytes.
 * @param {FbxReaderValues} [values=DEFAULT_VALUES] Normalized reader values.
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
 * @param {FbxReaderValues} [values=DEFAULT_VALUES] Normalized reader values.
 * @returns {object} Hydrated CMF-shaped root.
 */
export function readCmfWithValues(input, values = DEFAULT_VALUES)
{
    const document = parseGr2DocumentWithValues(input, values);
    const source = buildGr2FromFbxNodes(document.nodes, values);
    return hydrateCmf(
        buildCanonicalCmfFromShared({
            metadata: buildCmfMetadata(source),
            meshes: source.meshes,
            skeletons: source.skeletons,
            animations: source.cmfAnimations
        }, { boneIndexType: "UInt8" }),
        values.classes,
        { source: values.source },
        "CjsFbxFormat"
    );
}

/**
 * Build CMF metadata entries for an imported FBX root.
 *
 * @param {FbxGr2Root} root Imported GR2-shaped root.
 * @returns {{entries: Array<{key: string, value: string}>}} CMF metadata.
 */
function buildCmfMetadata(root)
{
    const source = String(root.grannyFileSource || "");
    const entries = source && source !== "memory" ? [ { key: "source", value: source } ] : [];
    entries.push(
        { key: "sourceFormat", value: "fbx" },
        { key: "generator", value: "CjsFbxFormat" }
    );
    return { entries };
}

/**
 * Parse every node of binary or ASCII FBX bytes into a debug document.
 *
 * @param {Uint8Array|ArrayBuffer|DataView} input FBX bytes.
 * @param {FbxReaderValues} [values=DEFAULT_VALUES] Normalized reader values.
 * @returns {FbxDocument} Parsed document.
 * @throws {Error} When the input exceeds `maxBytes` or is not FBX.
 */
function parseDocumentWithValues(input, values = DEFAULT_VALUES)
{
    const bytes = asUint8Array(input, "Fbx input");
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

/**
 * Parse only the GlobalSettings, Objects and Connections root nodes needed for GR2/CMF output.
 *
 * @param {Uint8Array|ArrayBuffer|DataView} input FBX bytes.
 * @param {FbxReaderValues} values Normalized reader values.
 * @returns {FbxMetadata & {nodes: FbxNode[]}} Metadata and the selected root nodes.
 * @throws {Error} When the input exceeds `maxBytes` or is not FBX.
 */
function parseGr2DocumentWithValues(input, values)
{
    const bytes = asUint8Array(input, "Fbx input");
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
 * @param {FbxReaderValues} [values=DEFAULT_VALUES] Normalized reader values.
 * @returns {FbxSupportReport} Support report.
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

/**
 * Scan FBX bytes for features GR2/CMF output does not import, reporting errors instead of throwing.
 *
 * @param {Uint8Array|ArrayBuffer|DataView} input FBX bytes.
 * @param {FbxReaderValues} values Normalized reader values.
 * @param {FbxMetadata} metadata Inspected metadata.
 * @returns {FbxDiagnostics} Warnings and errors.
 */
function inspectFbxFeatureSupport(input, values, metadata)
{
    try
    {
        const
            bytes = asUint8Array(input, "Fbx input"),
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

/**
 * Collect feature-support warnings from parsed root nodes.
 *
 * @param {FbxNode[]} nodes Root nodes.
 * @returns {FbxDiagnostics} Warnings and errors.
 */
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
    collectAnimationFeatureWarnings(objectIndex, connections, warnings);

    return {
        warnings,
        errors: []
    };
}

/**
 * Warn about Geometry objects that cannot be imported as meshes.
 *
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {string[]} warnings Warnings list to append to.
 */
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

/**
 * Warn about unsupported layer elements on mesh Geometry objects.
 *
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {string[]} warnings Warnings list to append to.
 */
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

/**
 * Warn about unsupported mapping or reference modes on a vertex layer element.
 *
 * @param {FbxObjectEntry} geometry Geometry object.
 * @param {FbxNode} layer Layer element node.
 * @param {string[]} warnings Warnings list to append to.
 */
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

/**
 * Warn about an unsupported mapping mode on a material layer element.
 *
 * @param {FbxObjectEntry} geometry Geometry object.
 * @param {FbxNode} layer LayerElementMaterial node.
 * @param {string[]} warnings Warnings list to append to.
 */
function collectMaterialLayerFeatureWarnings(geometry, layer, warnings)
{
    const mapping = String(readFirstChildProperty(layer, "MappingInformationType") || "AllSame");
    if (!SUPPORTED_MATERIAL_MAPPINGS.has(mapping))
    {
        addWarning(warnings, `fbx: LayerElementMaterial on Geometry ${objectLabel(geometry)} uses unsupported MappingInformationType ${JSON.stringify(mapping)}.`);
    }
}

/**
 * Warn about extra skins, skipped clusters and control points with more than four influences.
 *
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @param {string[]} warnings Warnings list to append to.
 */
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
 * @param {FbxObjectEntry|null|undefined} entry Indexed object entry.
 * @returns {boolean} True when the entry is a Skin deformer.
 */
function isSkinDeformer(entry)
{
    return entry?.className === "Skin" || entry?.fullName?.startsWith("Deformer::Skin") || entry?.name === "Skin";
}

/**
 * Check whether an indexed FBX object is a Cluster deformer.
 *
 * @param {FbxObjectEntry|null|undefined} entry Indexed object entry.
 * @returns {boolean} True when the entry is a Cluster deformer.
 */
function isClusterDeformer(entry)
{
    return entry?.className === "Cluster" || entry?.fullName?.startsWith("SubDeformer::") || entry?.name?.includes("Cluster");
}

/**
 * Check whether any control point has more than four positive influences.
 *
 * @param {FbxSkinClusterRecord[]} records Skin cluster records.
 * @returns {boolean} True when a control point has more than four positive influences.
 */
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

/**
 * Warn about BlendShapeChannels with in-between targets.
 *
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @param {string[]} warnings Warnings list to append to.
 */
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

/**
 * Warn about layered stacks, unsupported layer settings and unsupported curve interpolation.
 *
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @param {string[]} warnings Warnings list to append to.
 */
function collectAnimationFeatureWarnings(objectIndex, connections, warnings)
{
    for (const stack of objectIndex.list.filter(entry => entry.nodeName === "AnimationStack"))
    {
        const layers = connectedChildObjects(stack, objectIndex, connections, "AnimationLayer");
        if (layers.length > 1)
        {
            addWarning(warnings, `fbx: AnimationStack ${objectLabel(stack)} has ${layers.length} layers; GR2/CMF output does not evaluate layered animation.`);
        }
        for (const layer of layers)
        {
            try
            {
                validateAnimationLayer(layer);
            }
            catch (error)
            {
                addWarning(warnings, `${error.message}.`);
            }
        }
    }

    for (const curve of objectIndex.list.filter(entry => entry.nodeName === "AnimationCurve"))
    {
        const keyCount = (readChildArray(curve.node, "KeyTime") || []).length;
        try
        {
            readAnimationCurveInterpolation(curve.node, keyCount);
        }
        catch (error)
        {
            addWarning(warnings, `${error.message} AnimationCurve ${objectLabel(curve)} is not imported by GR2/CMF output.`);
        }
    }
}

/**
 * Append a warning unless it is already present.
 *
 * @param {string[]} warnings Warnings list.
 * @param {string} message Warning message.
 */
function addWarning(warnings, message)
{
    if (!warnings.includes(message))
    {
        warnings.push(message);
    }
}

/**
 * Format an object's name, full name or key for messages.
 *
 * @param {FbxObjectSummary|null|undefined} entry Object entry.
 * @returns {string} JSON-quoted label.
 */
function objectLabel(entry)
{
    return JSON.stringify(entry?.name || entry?.fullName || entry?.key || "");
}

/**
 * Inspect raw bytes without normalized options.
 *
 * @param {Uint8Array} bytes FBX bytes.
 * @returns {FbxDetection} Detected metadata.
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
    const bytes = asUint8Array(input, "Fbx input");
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
        return { type: getArrayBufferViewName(value), length: value.length };
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

/**
 * Inspect binary FBX bytes by walking the root node headers.
 *
 * @param {Uint8Array} bytes Binary FBX bytes.
 * @returns {FbxDetection} Detected metadata.
 */
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

/**
 * Parse every root node of binary FBX bytes.
 *
 * @param {Uint8Array} bytes Binary FBX bytes.
 * @param {FbxMetadata} metadata Inspected metadata.
 * @param {FbxReaderValues} values Normalized reader values.
 * @returns {FbxDocument} Parsed document.
 * @throws {Error} When the node count exceeds `maxNodes`.
 */
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
        nodes,
        nodeCount,
        rootNodeCount: nodes.length,
        rootNodeNames: nodes.map(node => node.name)
    };
    document.root = buildFbxRoot(document.nodes);
    return document;
}

/**
 * Read one binary node and its children.
 *
 * @param {Uint8Array} bytes Binary FBX bytes.
 * @param {number} offset Node byte offset.
 * @param {number} version FBX version.
 * @param {FbxReaderValues} values Normalized reader values.
 * @param {number} depth Node depth.
 * @returns {{offset: number, count: number, node: FbxNode}} End offset, node count and node.
 * @throws {Error} When the node is malformed or exceeds a reader limit.
 */
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

/**
 * Read a binary node header.
 *
 * @param {Uint8Array} bytes Binary FBX bytes.
 * @param {number} offset Node byte offset.
 * @param {number} version FBX version; 7500 and later use 64-bit header fields.
 * @returns {FbxBinaryNodeHeader|null} The header, or null for a null record or a truncated header.
 * @throws {Error} When offsets exceed the safe integer range or the name is truncated.
 */
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

/**
 * Read one binary property.
 *
 * @param {Uint8Array} bytes Binary FBX bytes.
 * @param {number} offset Property byte offset.
 * @param {FbxReaderValues} values Normalized reader values.
 * @returns {FbxBinaryPropertyResult} Type, value and end offset.
 * @throws {Error} When the property is truncated or of an unsupported type.
 */
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

/**
 * Read a length-prefixed string or raw property.
 *
 * @param {Uint8Array} bytes Binary FBX bytes.
 * @param {number} offset Byte offset of the length field.
 * @param {string} type Property type code.
 * @param {string} kind "string" or "bytes".
 * @returns {FbxBinaryPropertyResult} Type, value and end offset.
 */
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

/**
 * Read an array property, inflating zlib-encoded data.
 *
 * @param {Uint8Array} bytes Binary FBX bytes.
 * @param {number} offset Byte offset of the array header.
 * @param {string} type Array type code.
 * @param {FbxReaderValues} values Normalized reader values.
 * @returns {FbxBinaryPropertyResult} Type, value and end offset; unknown encodings give an FbxCompressedArray value.
 * @throws {Error} When the array exceeds `maxArrayLength`.
 */
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

/**
 * Decode uncompressed array elements.
 *
 * @param {Uint8Array} bytes Source bytes.
 * @param {number} offset Byte offset of the first element.
 * @param {string} type Array type code.
 * @param {number} length Element count.
 * @param {number} byteLength Available byte length.
 * @returns {Float32Array|Float64Array|Int32Array|Array<number|string>|boolean[]} Decoded elements.
 * @throws {Error} When the data is shorter than the element count needs.
 */
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

// THE ONE HAND-ROLLED INFLATE IN THIS PACKAGE, AND WHY IT STAYS. Everywhere else
// that meets a deflate stream uses the shared `decompressBytes` over the
// platform's `DecompressionStream` — `formats/vta` and `formats/png` both do.
// FBX cannot: `DecompressionStream` is asynchronous by specification and there is
// no synchronous platform inflate, while a compressed FBX array is decoded INLINE
// during a synchronous recursive node walk (`readBinaryArrayProperty` at :1037,
// which calls this at :1063). Making this await would make the whole node walk
// async and take `CjsFbxFormat.read` — the synchronous entry point — with it.
//
// So this is a platform constraint, not an oversight, and not a preference for
// hand-rolled code. If a SECOND synchronous inflate is ever needed, this moves to
// a shared home rather than being copied; one caller is not yet a shared module.
//
// Carbon offers no donor either way: `mesh` vendors ufbx
// (`mesh/vendor/github.com/ufbx`), so Carbon's FBX decompression lives inside
// third-party C rather than in code there is anything to port.
/**
 * Inflate a zlib stream and verify its Adler-32 checksum.
 *
 * @param {Uint8Array} source Zlib stream bytes.
 * @param {number} expectedLength Expected output length.
 * @returns {Uint8Array} Inflated bytes.
 * @throws {Error} When the header, data or checksum is invalid.
 */
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

/**
 * Inflate a raw deflate stream.
 *
 * @param {Uint8Array} source Deflate stream bytes.
 * @param {number} expectedLength Expected output length.
 * @returns {Uint8Array} Inflated bytes.
 * @throws {Error} When a block type is reserved or the output length differs.
 */
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

/**
 * Copy a stored deflate block to the output.
 *
 * @param {DeflateBitReader} reader Bit reader.
 * @param {FbxInflateState} state Output state.
 * @throws {Error} When the block length check fails.
 */
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

/**
 * Decode a Huffman-coded deflate block to the output.
 *
 * @param {DeflateBitReader} reader Bit reader.
 * @param {FbxInflateState} state Output state.
 * @param {DeflateHuffmanTable} literalLengthTable Literal/length table.
 * @param {DeflateHuffmanTable} distanceTable Distance table.
 * @throws {Error} When a length or distance symbol is invalid.
 */
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

/**
 * Get the fixed deflate Huffman tables, building them once.
 *
 * @returns {FbxDeflateTables} Fixed tables.
 */
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

/**
 * Read the dynamic Huffman tables of a deflate block.
 *
 * @param {DeflateBitReader} reader Bit reader.
 * @returns {FbxDeflateTables} Dynamic tables.
 * @throws {Error} When the code lengths are invalid.
 */
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

/**
 * Append a repeated code length.
 *
 * @param {number[]} lengths Code lengths to append to.
 * @param {number} value Code length to repeat.
 * @param {number} count Repeat count.
 * @param {number} totalCount Total code length count.
 * @throws {Error} When the repeat overflows the total count.
 */
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

/**
 * Write one inflated byte.
 *
 * @param {FbxInflateState} state Output state.
 * @param {number} value Byte value.
 * @throws {Error} When the output is already full.
 */
function writeInflatedByte(state, value)
{
    if (state.offset >= state.output.byteLength)
    {
        throw new Error("fbx: compressed array decoded past expected length");
    }
    state.output[state.offset++] = value & 0xff;
}

/**
 * Copy a back-reference from earlier output.
 *
 * @param {FbxInflateState} state Output state.
 * @param {number} distance Back-reference distance.
 * @param {number} length Byte count.
 * @throws {Error} When the distance is invalid.
 */
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


/**
 * Bit reader over a zlib/deflate stream used to inflate compressed FBX
 * property arrays.
 */
class DeflateBitReader
{
    /**
     * Raw deflate stream bytes; set by the constructor.
     * @type {Uint8Array|null}
     */
    bytes = null;

    /**
     * Next byte to load into the bit buffer.
     * @type {number}
     */
    byteOffset = 0;

    /**
     * Pending bits, least significant first.
     * @type {number}
     */
    bitBuffer = 0;

    /**
     * Number of pending bits in the bit buffer.
     * @type {number}
     */
    bitCount = 0;

    /**
     * Creates a DeflateBitReader over caller-provided FBX bytes and reader
     * options.
     *
     * @param {Uint8Array} bytes Raw deflate stream bytes.
     */
    constructor(bytes)
    {
        this.bytes = bytes;
    }

    /**
     * Reads bits from the current FBX binary reader.
     *
     * @param {number} count Number of bits to read, least significant first.
     * @returns {number} The bits as an unsigned value.
     * @throws {Error} When the deflate stream is truncated.
     */
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

    /**
     * Reads aligned byte from the current FBX binary reader.
     *
     * @returns {number} The byte value.
     * @throws {Error} When the stored block is truncated.
     */
    readAlignedByte()
    {
        if (this.byteOffset >= this.bytes.byteLength)
        {
            throw new Error("fbx: compressed array stored block is truncated");
        }
        return this.bytes[this.byteOffset++];
    }

    /**
     * Reads aligned U16 LE from the current FBX binary reader.
     *
     * @returns {number} The unsigned 16-bit value.
     */
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
    /**
     * Symbols by code length, then by bit-reversed code.
     * @type {Array<number[]>}
     */
    tables = [];

    /**
     * Longest code length in use.
     * @type {number}
     */
    maxBits = 0;

    /**
     * Creates a DeflateHuffmanTable with caller-provided initial state.
     *
     * @param {number[]} lengths Code length per symbol; 0 marks an unused symbol.
     * @throws {Error} When a code length is outside 0..15.
     */
    constructor(lengths)
    {
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
     *
     * @param {DeflateBitReader} reader Bit reader positioned at the code.
     * @returns {number} The decoded symbol.
     * @throws {Error} When no code matches.
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

/**
 * Reverse the low bits of a value.
 *
 * @param {number} value Value to reverse.
 * @param {number} length Bit count.
 * @returns {number} Reversed value.
 */
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

/**
 * Parse every node of ASCII FBX bytes.
 *
 * @param {Uint8Array} bytes ASCII FBX bytes.
 * @param {FbxMetadata} metadata Inspected metadata.
 * @param {FbxReaderValues} values Normalized reader values.
 * @returns {FbxDocument} Parsed document.
 * @throws {Error} When the node count or depth exceeds a reader limit.
 */
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
            appendAsciiArrayContinuation(stack, line, values);
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
        nodes,
        nodeCount,
        rootNodeCount: nodes.length,
        rootNodeNames: nodes.map(node => node.name)
    };
    document.root = buildFbxRoot(document.nodes);
    return document;
}

/**
 * Read the named binary root nodes, skipping the rest.
 *
 * @param {Uint8Array} bytes Binary FBX bytes.
 * @param {FbxMetadata} metadata Inspected metadata.
 * @param {FbxReaderValues} values Normalized reader values.
 * @param {Set<string>} targetNames Root node names to read.
 * @returns {FbxNode[]} Selected root nodes.
 * @throws {Error} When a root node is invalid or the node count exceeds `maxNodes`.
 */
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

/**
 * Read the named ASCII root nodes, skipping the rest.
 *
 * @param {Uint8Array} bytes ASCII FBX bytes.
 * @param {FbxReaderValues} values Normalized reader values.
 * @param {Set<string>} targetNames Root node names to read.
 * @returns {FbxNode[]} Selected root nodes.
 * @throws {Error} When the node count or depth exceeds a reader limit.
 */
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
            appendAsciiArrayContinuation(stack, line, values);
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

/**
 * Build a GR2-shaped root with CMF animations from parsed root nodes.
 *
 * @param {FbxNode[]} nodes GlobalSettings, Objects and Connections root nodes.
 * @param {FbxReaderValues} values Normalized reader values.
 * @param {string} values.emit When "gr2", GR2 animations are built too.
 * @param {string} values.source Source label.
 * @returns {FbxGr2Root} Imported root.
 * @throws {Error} When there is no Objects node or no supported mesh.
 */
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
        skeletonContext = buildSkeletonContext(objectIndex, connections, sceneTransform, modelWorldCache, values),
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

    const cmfAnimations = readCmfAnimations(
        objectIndex,
        connections,
        meshes,
        skeletonContext,
        sceneTransform,
        values
    );
    const root = {
        grannyFileFormatRevision: 0,
        grannyFileSource: values.source || "memory",
        meshes,
        models: buildGr2Models(skeletonContext.skeletons, meshes),
        skeletons: skeletonContext.skeletons.map(skeleton => skeleton.cmfSkeleton),
        animations: [],
        cmfAnimations
    };
    if (values.emit === OUTPUT_GR2)
    {
        root.animations = buildGr2Animations({
            skeletons: root.skeletons,
            animations: cmfAnimations
        });
    }
    return root;
}

/**
 * Build a GR2-shaped mesh from a Geometry object and its owning Model.
 *
 * @param {FbxObjectEntry} geometry Geometry object.
 * @param {FbxObjectEntry|null} owner Owning Model, or null.
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @param {Map<string, FbxModelTransformState>} modelWorldCache Model transform cache.
 * @param {FbxSkeletonContext} skeletonContext Imported skeletons.
 * @param {FbxReaderValues} values Normalized reader values.
 * @param {string} values.compatibility In "carbon" mode, authored binormals are not imported.
 * @returns {FbxGr2Mesh} The mesh.
 * @throws {Error} When the Vertices length is invalid.
 */
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
        layerChannels = readGeometryLayerChannels(geometry.node, decoded, values, meshTransform, sceneTransform),
        normal = layerChannels.normal ?? [],
        explicitTangent = layerChannels.tangent ?? [],
        explicitBinormal = values.compatibility === COMPATIBILITY_CARBON ? [] : layerChannels.binormal ?? [],
        texcoord0 = layerChannels.texcoord0 ?? [],
        polygonTriangles = orientPolygonTriangles(
            triangulatePolygonList(decoded.polygons, decoded.positions),
            isReflectedTransform(meshTransform, sceneTransform)
        ),
        triangleFaces = flattenPolygonTriangles(polygonTriangles),
        tangent = explicitTangent.length ? explicitTangent : generateBaseTangents(positions, normal, texcoord0, triangleFaces),
        binormal = explicitBinormal.length ? explicitBinormal : generateBaseBinormals(normal, tangent),
        materialSelection = readPolygonMaterials(geometry, owner, objectIndex, connections, decoded.polygons.length),
        indices = buildIndexGroups(polygonTriangles, materialSelection),
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
        bounds = computeBounds(positions),
        vertex = createGr2Vertex(positions, {
            ...layerChannels,
            tangent,
            normal,
            binormal,
            blendIndice: skin.blendIndice,
            blendWeight: skin.blendWeight
        });

    deriveIndexedBinormals(vertex);

    if (!hasArrayValues(vertex.normal) && morphTargets.some(target => hasArrayValues(target.vertex?.normal)))
    {
        // Carbon imports normals by default. A custom morph-normal payload
        // therefore requires the corresponding base declaration too.
        vertex.normal = cleanNumericArray(generateNormals(positions, triangleFaces));
    }

    return {
        name: meshNameFromFbx(geometry, owner),
        morphTargets,
        minBounds: bounds.minBounds,
        maxBounds: bounds.maxBounds,
        boneBindings: skin.boneBindings,
        vertex,
        indices,
        skeleton: skin.skeleton
    };
}

/**
 * Generate missing indexed binormal channels from matching indexed normals and tangents.
 *
 * @param {Object<string, number[]>} vertex Vertex channels, updated in place.
 */
function deriveIndexedBinormals(vertex)
{
    for (const name of Object.keys(vertex))
    {
        const match = /^tangent([1-9][0-9]*)$/u.exec(name);
        if (!match) continue;
        const normal = vertex[`normal${match[1]}`] ?? [];
        const binormalName = `binormal${match[1]}`;
        if (!(vertex[binormalName]?.length)) vertex[binormalName] = generateBaseBinormals(normal, vertex[name]);
    }
}

/**
 * Read the first Skin deformer of a Geometry into per-vertex blend indices, weights and bone bindings.
 *
 * @param {FbxObjectEntry} geometry Geometry object.
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @param {FbxDecodedPolygons} decoded Decoded polygons.
 * @param {number[]} positions Expanded scene-space positions.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @param {Map<string, FbxModelTransformState>} modelWorldCache Model transform cache.
 * @param {FbxSkeletonContext} skeletonContext Imported skeletons.
 * @returns {FbxSkinning} Skin data, empty when the geometry is not skinned.
 */
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

/**
 * Create empty skin data.
 *
 * @returns {FbxSkinning} Skin data with no bindings.
 */
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
    return cleanNumericArray(generateTangents(positions, normal, texcoord0, triangleFaces).tangents);
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

/**
 * Read the morph targets of a Geometry's BlendShape deformers, skipping in-between channels.
 *
 * @param {FbxObjectEntry} geometry Geometry object.
 * @param {FbxObjectEntry|null} owner Owning Model, or null.
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @param {FbxDecodedPolygons} decoded Decoded polygons.
 * @param {number[]} controlPoints Geometry control points.
 * @param {number[]} meshTransform Geometry-to-world matrix.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @param {number[]} basePositions Expanded base positions.
 * @param {number[]} triangleFaces Triangle indices.
 * @param {Object<string, number[]>} baseVertex Base normal, tangent, binormal and texcoord0 channels.
 * @returns {FbxMorphTarget[]} Morph targets.
 */
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

/**
 * Build one morph target from a Shape geometry.
 *
 * @param {FbxObjectEntry} shape Shape geometry.
 * @param {FbxObjectEntry} channel BlendShapeChannel.
 * @param {FbxObjectEntry} geometry Base Geometry object.
 * @param {FbxObjectEntry|null} owner Owning Model, or null.
 * @param {FbxDecodedPolygons} decoded Decoded polygons.
 * @param {number[]} controlPoints Base control points.
 * @param {number[]} meshTransform Geometry-to-world matrix.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @param {number[]} basePositions Expanded base positions.
 * @param {number[]} triangleFaces Triangle indices.
 * @param {Object<string, number[]>} baseVertex Base normal, tangent, binormal and texcoord0 channels.
 * @returns {FbxMorphTarget|null} The target, or null when the shape has no Indexes or Vertices.
 * @throws {Error} When Vertices or Indexes are invalid.
 */
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
        vertexChannels = buildMorphTargetVertexChannels(
            name,
            shape,
            indexes,
            geometry,
            owner,
            decoded,
            meshTransform,
            sceneTransform,
            positions,
            triangleFaces,
            baseVertex
        );

    return {
        name,
        dataIsDeltas: false,
        maxDisplacement: computeMaxDisplacement(basePositions, positions),
        vertex: createGr2Vertex(positions, vertexChannels)
    };
}

/**
 * Build a morph target's normal, tangent and binormal channels.
 *
 * @param {string} name Morph target name.
 * @param {FbxObjectEntry} shape Shape geometry.
 * @param {number[]} indexes Shape control point indexes.
 * @param {FbxObjectEntry} geometry Base Geometry object.
 * @param {FbxObjectEntry|null} owner Owning Model, or null.
 * @param {FbxDecodedPolygons} decoded Decoded polygons.
 * @param {number[]} meshTransform Geometry-to-world matrix.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @param {number[]} positions Expanded target positions.
 * @param {number[]} triangleFaces Triangle indices.
 * @param {Object<string, number[]>} baseVertex Base normal, tangent, binormal and texcoord0 channels.
 * @returns {{normal: number[], tangent: number[], binormal: number[]}} Target channels; empty arrays when absent.
 */
function buildMorphTargetVertexChannels(name, shape, indexes, geometry, owner, decoded, meshTransform, sceneTransform, positions, triangleFaces, baseVertex)
{
    let normal = readMorphTargetShapeNormals(shape, indexes, decoded, meshTransform, sceneTransform, baseVertex);
    if (!normal.length)
    {
        normal = readMorphTargetCustomNormals(name, geometry, owner, decoded, meshTransform, sceneTransform);
    }
    if (!normal.length && hasArrayValues(baseVertex.normal))
    {
        normal = cleanNumericArray(generateNormals(positions, triangleFaces));
    }

    const tangent = normal.length && hasArrayValues(baseVertex.tangent) && hasArrayValues(baseVertex.texcoord0)
        ? cleanNumericArray(generateTangents(positions, normal, baseVertex.texcoord0, triangleFaces).tangents)
        : [];
    const binormal = normal.length && tangent.length && hasArrayValues(baseVertex.binormal)
        ? cleanNumericArray(generateBiNormals(normal, tangent))
        : [];

    return { normal, tangent, binormal };
}

/**
 * Read a Shape's Normals deltas and add them to the base normals.
 *
 * @param {FbxObjectEntry} shape Shape geometry.
 * @param {number[]} indexes Shape control point indexes.
 * @param {FbxDecodedPolygons} decoded Decoded polygons.
 * @param {number[]} meshTransform Geometry-to-world matrix.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @param {Object<string, number[]>} baseVertex Base channels.
 * @returns {number[]} Expanded target normals, or an empty array when the shape has none.
 * @throws {Error} When the base has no normals or the Normals length does not match Indexes.
 */
function readMorphTargetShapeNormals(shape, indexes, decoded, meshTransform, sceneTransform, baseVertex)
{
    const values = readChildArray(shape.node, "Normals") || [];
    if (!values.length) return [];
    if (!hasArrayValues(baseVertex.normal))
    {
        throw new Error(`fbx: morph target ${JSON.stringify(shape.name || shape.key)} has Normals without base normals`);
    }
    if (values.length !== indexes.length * 3)
    {
        throw new Error(`fbx: morph target ${JSON.stringify(shape.name || shape.key)} Normals length does not match Indexes`);
    }
    const byControlPoint = new Map();
    for (let index = 0; index < indexes.length; index++)
    {
        byControlPoint.set(integerNumber(indexes[index], "Indexes"), [
            finiteNumber(values[index * 3], "Normals"),
            finiteNumber(values[index * 3 + 1], "Normals"),
            finiteNumber(values[index * 3 + 2], "Normals")
        ]);
    }
    const expanded = [];
    for (const corner of decoded.corners)
    {
        expanded.push(...(byControlPoint.get(corner.controlPointIndex) || [ 0, 0, 0 ]));
    }
    const deltas = transformDirectionDeltas(expanded, meshTransform, sceneTransform);
    return baseVertex.normal.map((value, index) => value + deltas[index]);
}

/**
 * Read a morph target's custom `bsNormals_` property normals.
 *
 * @param {string} name Morph target name.
 * @param {FbxObjectEntry} geometry Base Geometry object.
 * @param {FbxObjectEntry|null} owner Owning Model, or null.
 * @param {FbxDecodedPolygons} decoded Decoded polygons.
 * @param {number[]} meshTransform Geometry-to-world matrix.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @returns {number[]} Expanded scene-space normals, or an empty array when absent.
 */
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
        sceneTransform
    );
}

/**
 * Find a morph target's `bsNormals_` string on the owning Model or the Geometry.
 *
 * @param {string} name Morph target name.
 * @param {FbxObjectEntry|null} owner Owning Model, or null.
 * @param {FbxObjectEntry} geometry Base Geometry object.
 * @returns {string} Base64 text, or "" when absent.
 */
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

/**
 * Decode base64 little-endian float32 vec3 values.
 *
 * @param {string} encoded Base64 text.
 * @param {number} vertexCount Expected vec3 count.
 * @param {string} feature Feature name for errors.
 * @returns {number[]} Decoded values.
 * @throws {Error} When the byte length does not match the vertex count.
 */
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

/**
 * Decode base64 text, ignoring whitespace and stopping at padding.
 *
 * @param {string} encoded Base64 text.
 * @param {string} feature Feature name for errors.
 * @returns {Uint8Array} Decoded bytes.
 * @throws {Error} When the text contains an invalid character.
 */
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

/**
 * Compute the largest distance between matching base and target positions.
 *
 * @param {number[]} basePositions Base positions.
 * @param {number[]} targetPositions Target positions.
 * @returns {number} Largest displacement.
 */
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

/**
 * Read every AnimationStack into a CMF animation.
 *
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @param {FbxGr2Mesh[]} meshes Imported meshes.
 * @param {FbxSkeletonContext} skeletonContext Imported skeletons.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @param {FbxReaderValues} values Normalized reader values.
 * @param {string} values.compatibility In "carbon" mode, the animation order is reversed.
 * @returns {FbxCmfAnimation[]} CMF animations.
 */
function readCmfAnimations(objectIndex, connections, meshes, skeletonContext, sceneTransform, values)
{
    const
        morphTargetNames = buildMorphTargetNameSet(meshes),
        boneTargets = buildCmfBoneTargetMap(skeletonContext);

    const animations = [];
    for (const stack of objectIndex.list.filter(entry => entry.nodeName === "AnimationStack"))
    {
        const animation = readCmfAnimation(
            stack,
            objectIndex,
            connections,
            morphTargetNames,
            boneTargets,
            sceneTransform,
            values
        );
        if (animation)
        {
            animations.push(animation);
        }
    }
    return values.compatibility === COMPATIBILITY_CARBON ? animations.reverse() : animations;
}

/**
 * Collect the morph target names of imported meshes.
 *
 * @param {FbxGr2Mesh[]} meshes Imported meshes.
 * @returns {Set<string>} Morph target names.
 */
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

/**
 * Map bone keys to their CMF bone names and root flags.
 *
 * @param {FbxSkeletonContext} skeletonContext Imported skeletons.
 * @returns {Map<string, FbxBoneTarget>} Bone targets by bone key.
 */
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

/**
 * Read one AnimationStack into a CMF animation.
 *
 * @param {FbxObjectEntry} stack AnimationStack object.
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @param {Set<string>} morphTargetNames Imported morph target names.
 * @param {Map<string, FbxBoneTarget>} boneTargets Bone targets by bone key.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @param {FbxReaderValues} values Normalized reader values.
 * @param {string} values.compatibility "source" or "carbon".
 * @returns {FbxCmfAnimation|null} The animation, or null when it has no channels.
 * @throws {Error} When the stack has several layers or a curve lies outside the stack time span.
 */
function readCmfAnimation(stack, objectIndex, connections, morphTargetNames, boneTargets, sceneTransform, values)
{
    const layers = connectedChildObjects(stack, objectIndex, connections, "AnimationLayer");
    if (layers.length > 1)
    {
        throw new Error(`fbx: animation stack ${JSON.stringify(stack.name || stack.key)} has multiple layers`);
    }
    if (layers.length) validateAnimationLayer(layers[0]);
    const
        curveNodeParents = layers.length ? layers : [ stack ],
        curveNodes = uniqueEntries(curveNodeParents.flatMap(parent => connectedChildObjects(parent, objectIndex, connections, "AnimationCurveNode"))),
        records = [];

    for (const curveNode of curveNodes)
    {
        if (values.compatibility !== COMPATIBILITY_CARBON)
        {
            records.push(...readMorphAnimationRecords(curveNode, objectIndex, connections, morphTargetNames));
        }
        records.push(...readRootPropertyMorphAnimationRecords(
            curveNode,
            objectIndex,
            connections,
            values.compatibility === COMPATIBILITY_CARBON ? new Set() : morphTargetNames,
            boneTargets
        ));

        const boneRecord = readBoneAnimationRecord(
            curveNode,
            objectIndex,
            connections,
            boneTargets,
            sceneTransform,
            values.compatibility
        );
        if (boneRecord)
        {
            records.push(boneRecord);
        }
    }

    const compatibleRecords = values.compatibility === COMPATIBILITY_CARBON
        ? bakeCarbonBoneAnimationRecords(records, sceneTransform, objectIndex)
        : records;
    const normalizedRecords = deduplicateMorphAnimationRecords(compatibleRecords);
    if (!normalizedRecords.length)
    {
        return null;
    }

    const stackTimeSpan = readAnimationStackTimeSpan(stack, normalizedRecords);
    for (const record of normalizedRecords)
    {
        if (record.curve.ticks.some(tick => tick < stackTimeSpan.startTick ||
            stackTimeSpan.stopTick !== null && tick > stackTimeSpan.stopTick))
        {
            throw new Error(`fbx: animation curve for ${JSON.stringify(record.target)} lies outside its stack time span`);
        }
    }

    const
        channels = [],
        curves = [];
    let duration = 0;

    for (const record of normalizedRecords)
    {
        const
            sourceCurve = values.compatibility === COMPATIBILITY_CARBON || record.curve.interpolation === "Mixed"
                ? carbonLinearizeStepCurve(record.curve, record.valueDimension)
                : record.curve,
            knots = sourceCurve.ticks.map(tick => cleanFloat((tick - stackTimeSpan.startTick) / FBX_TICKS_PER_SECOND)),
            curveValues = sourceCurve.values.map(cleanFloat),
            curveIndex = curves.length;

        if (curveValues.length !== knots.length * record.valueDimension)
        {
            throw new Error(`fbx: animation curve for ${JSON.stringify(record.target)} has mismatched value dimension`);
        }

        for (const knot of knots)
        {
            duration = Math.max(duration, knot);
        }
        curves.push({
            valueDimension: record.valueDimension,
            interpolation: sourceCurve.interpolation ?? "Linear",
            knotType: "Float32",
            valueType: "Float32",
            knotCount: knots.length,
            knots: packFloat32Values(knots),
            values: packFloat32Values(curveValues)
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

/**
 * Rewrite Step and Mixed curves as Linear curves with duplicated keys at each step.
 *
 * @param {FbxAnimationCurve} curve Source curve.
 * @param {number} dimension Values per key.
 * @returns {FbxAnimationCurve} Linear curve, or the source curve when it is not stepped.
 */
function carbonLinearizeStepCurve(curve, dimension)
{
    if (curve.interpolation === "Mixed")
    {
        const ticks = [ curve.ticks[0] ];
        const values = curve.values.slice(0, dimension);
        for (let index = 1; index < curve.ticks.length; index++)
        {
            if (curve.interpolations[index - 1] === "Step")
            {
                ticks.push(curve.ticks[index]);
                values.push(...curve.values.slice((index - 1) * dimension, index * dimension));
            }
            ticks.push(curve.ticks[index]);
            values.push(...curve.values.slice(index * dimension, (index + 1) * dimension));
        }
        return { ...curve, ticks, values, interpolation: "Linear" };
    }
    if (curve.interpolation !== "Step") return curve;
    if (curve.ticks.length < 2) return { ...curve, interpolation: "Linear" };
    const ticks = [ curve.ticks[0] ];
    const values = curve.values.slice(0, dimension);
    for (let index = 1; index < curve.ticks.length; index++)
    {
        ticks.push(curve.ticks[index], curve.ticks[index]);
        values.push(
            ...curve.values.slice((index - 1) * dimension, index * dimension),
            ...curve.values.slice(index * dimension, (index + 1) * dimension)
        );
    }
    return { ...curve, ticks, values, interpolation: "Linear" };
}

/**
 * Validate that an AnimationLayer uses only default weight, blend and accumulation settings.
 *
 * @param {FbxObjectEntry} layer AnimationLayer object.
 * @throws {Error} When the layer uses an unsupported setting.
 */
function validateAnimationLayer(layer)
{
    const properties = readProperties70(layer.node).properties;
    const weight = propertyNumber(properties, "Weight", 100);
    if (weight !== 100)
    {
        throw new Error(`fbx: animation layer ${JSON.stringify(layer.name || layer.key)} has unsupported weight ${weight}`);
    }
    for (const name of [ "Mute", "Solo", "Lock" ])
    {
        if (propertyNumber(properties, name, 0))
        {
            throw new Error(`fbx: animation layer ${JSON.stringify(layer.name || layer.key)} uses ${name}`);
        }
    }
    for (const name of [ "BlendMode", "RotationAccumulationMode", "ScaleAccumulationMode" ])
    {
        if (propertyNumber(properties, name, 0) !== 0)
        {
            throw new Error(`fbx: animation layer ${JSON.stringify(layer.name || layer.key)} uses unsupported ${name}`);
        }
    }
}

/**
 * Read a stack's start and stop ticks, or derive the start from its curves.
 *
 * @param {FbxObjectEntry} stack AnimationStack object.
 * @param {FbxAnimationRecord[]} records Stack animation records.
 * @returns {{startTick: number, stopTick: number|null, duration: number|null}} Time span; stop and duration are null when not authored.
 * @throws {Error} When the authored span is invalid or outside the safe tick range.
 */
function readAnimationStackTimeSpan(stack, records)
{
    const
        properties = readProperties70(stack.node).properties,
        start = propertyNumber(properties, "LocalStart", propertyNumber(properties, "ReferenceStart", null)),
        stop = propertyNumber(properties, "LocalStop", propertyNumber(properties, "ReferenceStop", null));

    if ((start === null) !== (stop === null) || start !== null && stop < start)
    {
        throw new Error(`fbx: animation stack ${JSON.stringify(stack.name || stack.key)} has an invalid time span`);
    }
    if (start !== null && stop !== null)
    {
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(stop))
        {
            throw new Error(`fbx: animation stack ${JSON.stringify(stack.name || stack.key)} exceeds the safe tick range`);
        }
        return {
            startTick: start,
            stopTick: stop,
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
        stopTick: null,
        duration: null
    };
}

/**
 * Read DeformPercent morph animation records from a curve node.
 *
 * @param {FbxObjectEntry} curveNode AnimationCurveNode object.
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @param {Set<string>} morphTargetNames Imported morph target names; empty accepts every name.
 * @returns {FbxAnimationRecord[]} Morph records.
 */
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
        source: "deformPercent",
        valueDimension: 1,
        curve
    }));
}

/**
 * Read a morph animation record from a user-defined numeric property on a root bone.
 *
 * @param {FbxObjectEntry} curveNode AnimationCurveNode object.
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @param {Set<string>} morphTargetNames Imported morph target names; empty accepts every name.
 * @param {Map<string, FbxBoneTarget>} boneTargets Bone targets by bone key.
 * @returns {FbxAnimationRecord[]} Zero or one morph record.
 */
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
            source: "rootProperty",
            valueDimension: 1,
            curve
        } ]
        : [];
}

/**
 * Drop duplicate morph records authored by both sources, checking that their curves agree.
 *
 * @param {FbxAnimationRecord[]} records Animation records.
 * @returns {FbxAnimationRecord[]} Records with one record per morph target.
 * @throws {Error} When a target is authored twice by one source or the two sources disagree.
 */
function deduplicateMorphAnimationRecords(records)
{
    const output = [];
    const morphs = new Map();
    for (const record of records)
    {
        if (record.targetType !== "MorphTarget")
        {
            output.push(record);
            continue;
        }
        const previous = morphs.get(record.target);
        if (!previous)
        {
            morphs.set(record.target, record);
            output.push(record);
            continue;
        }
        if (previous.source === record.source)
        {
            throw new Error(`fbx: morph animation target ${JSON.stringify(record.target)} is authored more than once`);
        }
        if (!sameScalarAnimationCurve(previous.curve, record.curve))
        {
            throw new Error(`fbx: standard and Carbon morph curves disagree for ${JSON.stringify(record.target)}`);
        }
    }
    return output;
}

/**
 * Compare two scalar curves within a small value tolerance.
 *
 * @param {FbxAnimationCurve} left First curve.
 * @param {FbxAnimationCurve} right Second curve.
 * @returns {boolean} True when the curves match.
 */
function sameScalarAnimationCurve(left, right)
{
    if (left.interpolation !== right.interpolation || left.ticks.length !== right.ticks.length ||
        left.values.length !== right.values.length) return false;
    return left.ticks.every((tick, index) => tick === right.ticks[index]) &&
        left.values.every((value, index) => Math.abs(value - right.values[index]) <= 1e-6) &&
        (left.interpolations ?? []).every((value, index) => value === right.interpolations?.[index]);
}

/**
 * List the morph target names a curve node drives through BlendShapeChannel DeformPercent.
 *
 * @param {FbxObjectEntry} curveNode AnimationCurveNode object.
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @param {Set<string>} morphTargetNames Imported morph target names; empty accepts every name.
 * @returns {string[]} Unique target names.
 */
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

/**
 * List the morph target names of a BlendShapeChannel.
 *
 * @param {FbxObjectEntry} channel BlendShapeChannel object.
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @returns {string[]} Target names; empty for in-between channels.
 */
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

/**
 * List the Shape geometries of a BlendShapeChannel.
 *
 * @param {FbxObjectEntry} channel BlendShapeChannel object.
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @returns {FbxObjectEntry[]} Shape geometries.
 */
function readBlendShapeChannelShapes(channel, objectIndex, connections)
{
    return connectedChildObjects(channel, objectIndex, connections, "Geometry")
        .filter(shape => shape.className === "Shape" || shape.fullName.startsWith("Geometry::Shape") || shape.name);
}

/**
 * Read a BlendShapeChannel's FullWeights.
 *
 * @param {FbxObjectEntry} channel BlendShapeChannel object.
 * @returns {number[]} Full weights, or an empty array.
 */
function readBlendShapeChannelFullWeights(channel)
{
    return readChildArray(channel.node, "FullWeights") || [];
}

/**
 * Check whether a BlendShapeChannel holds in-between targets.
 *
 * @param {FbxObjectEntry} channel BlendShapeChannel object.
 * @param {FbxObjectEntry[]} shapes Channel Shape geometries.
 * @returns {boolean} True when the channel has several shapes or full weights.
 */
function isUnsupportedBlendShapeInBetween(channel, shapes)
{
    // Multiple shapes/weights under one FBX channel are in-between targets, not independent sliders.
    return shapes.length > 1 || readBlendShapeChannelFullWeights(channel).length > 1;
}

/**
 * Read a DeformPercent curve scaled from percent to a 0..1 weight.
 *
 * @param {FbxObjectEntry} curveNode AnimationCurveNode object.
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @returns {FbxAnimationCurve|null} The curve, or null when absent.
 */
function readMorphAnimationCurve(curveNode, objectIndex, connections)
{
    return readAnyScalarAnimationCurve(curveNode, objectIndex, connections, 0.01, isMorphAnimationProperty);
}

/**
 * Read one scalar curve of a curve node, preferring a property match or the X axis.
 *
 * @param {FbxObjectEntry} curveNode AnimationCurveNode object.
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @param {number} scale Value scale.
 * @param {function(string): boolean|null} [predicate=null] Connection property filter.
 * @returns {FbxAnimationCurve|null} The curve, or null when absent.
 */
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

/**
 * Read an AnimationCurve's keys sorted by time.
 *
 * @param {FbxObjectEntry} curve AnimationCurve object.
 * @param {number} scale Value scale.
 * @returns {FbxAnimationCurve|null} The curve, or null when it has no keys.
 * @throws {Error} When the key arrays mismatch or key times repeat.
 */
function readScalarAnimationCurve(curve, scale)
{
    const
        ticks = readChildArray(curve.node, "KeyTime") || [],
        keyValueFloat = readChildArray(curve.node, "KeyValueFloat"),
        keyValue = readChildArray(curve.node, "KeyValue"),
        valueFeature = hasArrayValues(keyValueFloat) ? "KeyValueFloat" : "KeyValue",
        values = hasArrayValues(keyValueFloat) ? keyValueFloat : hasArrayValues(keyValue) ? keyValue : [],
        interpolations = readAnimationCurveInterpolations(curve.node, ticks.length);

    if (!ticks.length || !values.length)
    {
        return null;
    }
    if (ticks.length !== values.length)
    {
        throw new Error(`fbx: animation curve ${JSON.stringify(curve.name || curve.key)} has mismatched KeyTime and ${valueFeature} lengths`);
    }

    const pairs = ticks.map((tick, index) =>
    {
        const time = finiteNumber(tick, "KeyTime");
        if (!Number.isSafeInteger(time)) throw new Error("fbx: KeyTime exceeds the safe integer range");
        return {
            tick: time,
            value: finiteNumber(values[index], valueFeature) * scale,
            interpolation: interpolations[index]
        };
    }).sort((a, b) => a.tick - b.tick);
    for (let index = 1; index < pairs.length; index++)
    {
        if (pairs[index].tick === pairs[index - 1].tick)
        {
            throw new Error(`fbx: animation curve ${JSON.stringify(curve.name || curve.key)} has duplicate KeyTime values`);
        }
    }

    const sortedInterpolations = pairs.map(pair => pair.interpolation);
    const modes = new Set(sortedInterpolations);
    return {
        ticks: pairs.map(pair => pair.tick),
        values: pairs.map(pair => pair.value),
        interpolation: modes.size === 1 ? sortedInterpolations[0] : "Mixed",
        interpolations: sortedInterpolations
    };
}

/**
 * Summarize an AnimationCurve's interpolation.
 *
 * @param {FbxNode} curveNode AnimationCurve node.
 * @param {number} keyCount Key count.
 * @returns {string} "Linear", "Step" or "Mixed".
 */
function readAnimationCurveInterpolation(curveNode, keyCount)
{
    const modes = new Set(readAnimationCurveInterpolations(curveNode, keyCount));
    return modes.size <= 1 ? [ ...modes ][0] ?? "Linear" : "Mixed";
}

/**
 * Expand an AnimationCurve's KeyAttrFlags to one interpolation per key.
 *
 * @param {FbxNode} curveNode AnimationCurve node.
 * @param {number} keyCount Key count.
 * @returns {string[]} "Linear" or "Step" per key.
 * @throws {Error} When the attribute arrays are malformed or use an unsupported mode.
 */
function readAnimationCurveInterpolations(curveNode, keyCount)
{
    const flags = readChildArray(curveNode, "KeyAttrFlags") || [];
    if (!flags.length) return new Array(keyCount).fill("Linear");
    const referenceCounts = readChildArray(curveNode, "KeyAttrRefCount") || [];
    const expanded = [];
    if (flags.length === keyCount)
    {
        expanded.push(...flags);
    }
    else if (referenceCounts.length === flags.length)
    {
        for (let index = 0; index < flags.length; index++)
        {
            const count = integerNumber(referenceCounts[index], "KeyAttrRefCount");
            for (let repeat = 0; repeat < count; repeat++) expanded.push(flags[index]);
        }
    }
    else if (flags.length === 1)
    {
        for (let index = 0; index < keyCount; index++) expanded.push(flags[0]);
    }
    else
    {
        throw new Error("fbx: animation curve has malformed KeyAttrFlags/KeyAttrRefCount lengths");
    }
    if (expanded.length !== keyCount)
    {
        throw new Error(`fbx: animation curve attributes cover ${expanded.length} keys instead of ${keyCount}`);
    }
    const interpolations = expanded.map((flag) =>
    {
        const numeric = integerNumber(flag, "KeyAttrFlags");
        const mode = numeric & 0x0e;
        if (mode === 0x02 && numeric & 0x100)
        {
            throw new Error("fbx: ConstantNext animation interpolation is not supported");
        }
        if (mode === 0x02) return "Step";
        if (mode === 0x04) return "Linear";
        throw new Error(`fbx: animation interpolation mode ${mode} is not supported`);
    });
    return interpolations;
}

/**
 * Read a bone translation, rotation or scaling curve node into an animation record.
 *
 * @param {FbxObjectEntry} curveNode AnimationCurveNode object.
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @param {Map<string, FbxBoneTarget>} boneTargets Bone targets by bone key.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @param {string} compatibility "source" or "carbon".
 * @returns {FbxAnimationRecord|null} The record, or null when the curve node drives no bone.
 */
function readBoneAnimationRecord(curveNode, objectIndex, connections, boneTargets, sceneTransform, compatibility)
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
    const source = { _bone: bone, _boneTarget: target, _property: property, _vectorCurve: vectorCurve };

    if (property === "position")
    {
        const values = packBonePositionValues(vectorCurve.values, sceneTransform, target.isRoot);
        return {
            ...source,
            target: target.name,
            targetType: "BonePosition",
            valueDimension: 3,
            curve: {
                ticks: vectorCurve.ticks,
                values: compatibility === COMPATIBILITY_CARBON && target.isRoot
                    ? relativeRootPositions(values)
                    : values,
                interpolation: vectorCurve.interpolation
            }
        };
    }

    if (property === "rotation")
    {
        const baked = packBoneRotationCurve(bone, vectorCurve, sceneTransform, target.isRoot);
        if (compatibility === COMPATIBILITY_CARBON && target.isRoot)
        {
            baked.values = relativeRootRotations(baked.values);
        }
        return {
            ...source,
            target: target.name,
            targetType: "BoneRotation",
            valueDimension: 4,
            curve: {
                ticks: baked.ticks,
                values: baked.values,
                interpolation: vectorCurve.interpolation
            }
        };
    }

    return {
        ...source,
        target: target.name,
        targetType: "BoneScale",
        valueDimension: 3,
        curve: {
            ticks: vectorCurve.ticks,
            values: vectorCurve.values.map(cleanFloat),
            interpolation: vectorCurve.interpolation
        }
    };
}

/**
 * Resample bone records into position, rotation and scale records per bone from the full Model transform.
 *
 * @param {FbxAnimationRecord[]} records Animation records.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @returns {FbxAnimationRecord[]} Baked bone records followed by the morph records.
 * @throws {Error} When a bone authors one property more than once.
 */
function bakeCarbonBoneAnimationRecords(records, sceneTransform, objectIndex)
{
    const morphRecords = records.filter(record => !record._bone);
    const groups = new Map();
    for (const record of records.filter(record => record._bone))
    {
        let group = groups.get(record._bone.key);
        if (!group)
        {
            group = { bone: record._bone, target: record._boneTarget, curves: new Map() };
            groups.set(record._bone.key, group);
        }
        if (group.curves.has(record._property))
        {
            throw new Error(`fbx: bone ${JSON.stringify(record.target)} authors ${record._property} more than once`);
        }
        group.curves.set(record._property, record._vectorCurve);
    }

    const output = [];
    const boneOrder = new Map(objectIndex.list.map((entry, index) => [ entry.key, index ]));
    const orderedGroups = Array.from(groups.values()).sort((left, right) =>
        boneOrder.get(left.bone.key) - boneOrder.get(right.bone.key));
    for (const { bone, target, curves } of orderedGroups)
    {
        const properties = readProperties70(bone.node).properties;
        const fallback = {
            position: boneAnimationFallback(properties, "position"),
            rotation: boneAnimationFallback(properties, "rotation"),
            scale: boneAnimationFallback(properties, "scale")
        };
        const allTicks = new Set();
        for (const curve of curves.values()) curve.ticks.forEach(tick => allTicks.add(tick));
        const rotationCurve = curves.get("rotation");
        const rotationTicks = new Set(rotationCurve?.ticks ?? [ Math.min(...allTicks) ]);
        if (rotationCurve?.interpolation === "Linear" && rotationCurve.ticks.length > 1)
        {
            packBoneRotationCurve(bone, rotationCurve, sceneTransform, target.isRoot).ticks.forEach(tick => rotationTicks.add(tick));
        }
        const firstTick = Math.min(...allTicks);
        const positionCurves = [ curves.get("position") ].filter(Boolean);
        const positionTicks = new Set(curves.get("position")?.ticks ?? [ firstTick ]);
        if (modelTransformCanMovePivot(properties))
        {
            rotationTicks.forEach(tick => positionTicks.add(tick));
            curves.get("scale")?.ticks.forEach(tick => positionTicks.add(tick));
            if (rotationCurve) positionCurves.push(rotationCurve);
            if (curves.get("scale")) positionCurves.push(curves.get("scale"));
        }
        const sampleTransform = (sample) =>
        {
            const local = composeModelTransform(properties, {
                translation: sampleVectorAnimationCurve(curves.get("position"), sample.tick, fallback.position, sample.before),
                rotation: sampleVectorAnimationCurve(curves.get("rotation"), sample.tick, fallback.rotation, sample.before),
                scale: sampleVectorAnimationCurve(curves.get("scale"), sample.tick, fallback.scale, sample.before)
            });
            return decomposeMatrix4(target.isRoot ? transformMatrixScene(local, sceneTransform) : local);
        };
        const positionSamples = animationSampleDescriptors(positionTicks, positionCurves);
        const rotationSamples = animationSampleDescriptors(rotationTicks, rotationCurve ? [ rotationCurve ] : []);
        const scaleCurve = curves.get("scale");
        const scaleSamples = animationSampleDescriptors(new Set(scaleCurve?.ticks ?? [ firstTick ]), scaleCurve ? [ scaleCurve ] : []);
        const positions = positionSamples.flatMap((sample) =>
        {
            const position = sampleTransform(sample).position;
            return target.isRoot
                ? cleanVector3(position)
                : cleanVector3(position.map(value => value * sceneTransform.scale));
        });
        const rotations = rotationSamples.flatMap(sample => sampleTransform(sample).rotation);
        const scales = scaleSamples.flatMap(sample => cleanVector3(sampleTransform(sample).scale));
        normalizeQuaternionSeries(rotations, `FBX animation rotation for ${target.name}`);
        output.push(
            {
                target: target.name,
                targetType: "BonePosition",
                valueDimension: 3,
                curve: {
                    ticks: positionSamples.map(sample => sample.tick),
                    values: target.isRoot ? relativeRootPositions(positions) : positions,
                    interpolation: "Linear"
                }
            },
            {
                target: target.name,
                targetType: "BoneRotation",
                valueDimension: 4,
                curve: {
                    ticks: rotationSamples.map(sample => sample.tick),
                    values: target.isRoot ? relativeRootRotations(rotations) : rotations.map(cleanFloat),
                    interpolation: "Linear"
                }
            },
            {
                target: target.name,
                targetType: "BoneScale",
                valueDimension: 3,
                curve: {
                    ticks: scaleSamples.map(sample => sample.tick),
                    values: scales,
                    interpolation: "Linear"
                }
            }
        );
    }
    output.push(...morphRecords);
    return output;
}

/**
 * Check whether a Model has a non-zero pivot or offset.
 *
 * @param {Object<string, FbxProperty70>} properties Model Properties70.
 * @returns {boolean} True when a pivot or offset is non-zero.
 */
function modelTransformCanMovePivot(properties)
{
    return [ "RotationPivot", "ScalingPivot", "RotationOffset", "ScalingOffset" ].some(name =>
        propertyVector3(properties, name, [ 0, 0, 0 ]).some(value => value !== 0));
}

/**
 * List sample times, adding a before-sample where a curve steps.
 *
 * @param {Iterable<number>} ticks Sample ticks.
 * @param {FbxAnimationCurve[]} curves Curves checked for steps.
 * @returns {Array<{tick: number, before: boolean}>} Samples in time order.
 */
function animationSampleDescriptors(ticks, curves)
{
    const ordered = Array.from(ticks).sort((left, right) => left - right);
    const samples = [];
    for (let index = 0; index < ordered.length; index++)
    {
        const tick = ordered[index];
        const hasStepTransition = index > 0 && curves.some(curve =>
        {
            const first = curve.ticks.indexOf(tick);
            return first > 0 && (
                curve.ticks.lastIndexOf(tick) !== first ||
                curve.interpolation === "Step"
            );
        });
        if (hasStepTransition) samples.push({ tick, before: true });
        samples.push({ tick, before: false });
    }
    return samples;
}

/**
 * Sample a three-component curve.
 *
 * @param {FbxAnimationCurve|undefined} curve Curve, or undefined to use the fallback.
 * @param {number} tick Sample tick.
 * @param {number[]} fallback Fallback vector.
 * @param {boolean} [before=false] Sample the value just before a step at this tick.
 * @returns {number[]} Sampled vector.
 */
function sampleVectorAnimationCurve(curve, tick, fallback, before = false)
{
    if (!curve) return fallback.slice();
    const values = [];
    for (let axis = 0; axis < 3; axis++)
    {
        const scalar = {
            ticks: curve.ticks,
            values: curve.ticks.map((_, index) => curve.values[index * 3 + axis]),
            interpolation: curve.interpolation
        };
        values.push(sampleScalarAnimationCurve(scalar, tick, fallback[axis], before));
    }
    return values;
}

/**
 * Make root positions relative to the first key.
 *
 * @param {number[]} values Packed positions.
 * @returns {number[]} Relative positions.
 */
function relativeRootPositions(values)
{
    if (!values.length) return values;
    const origin = values.slice(0, 3);
    return values.map((value, index) => cleanFloat(value - origin[index % 3]));
}

/**
 * Make root rotations relative to the first key.
 *
 * @param {number[]} values Packed quaternions.
 * @returns {number[]} Relative quaternions.
 */
function relativeRootRotations(values)
{
    if (!values.length) return values;
    const initialInverse = quaternionInverse(values.slice(0, 4));
    const output = [];
    for (let index = 0; index < values.length; index += 4)
    {
        // Carbon evaluates current * inverse(initial) in its row-vector
        // convention. In the column-vector convention used here, that is
        // inverse(initial) * current.
        output.push(...quaternionMultiply(initialInverse, values.slice(index, index + 4)));
    }
    return normalizeQuaternionSeries(output, "Carbon-relative FBX root rotation");
}

/**
 * Invert a quaternion.
 *
 * @param {number[]} value Quaternion as [x, y, z, w].
 * @returns {number[]} Inverse quaternion.
 * @throws {Error} When the quaternion has zero length.
 */
function quaternionInverse(value)
{
    const lengthSquared = value.reduce((sum, component) => sum + component * component, 0);
    if (!(lengthSquared > 0)) throw new Error("fbx: root animation starts with a zero quaternion");
    return [
        -value[0] / lengthSquared,
        -value[1] / lengthSquared,
        -value[2] / lengthSquared,
        value[3] / lengthSquared
    ];
}

/**
 * Multiply two quaternions.
 *
 * @param {number[]} left Left quaternion.
 * @param {number[]} right Right quaternion.
 * @returns {number[]} Product quaternion.
 */
function quaternionMultiply(left, right)
{
    const [ ax, ay, az, aw ] = left;
    const [ bx, by, bz, bw ] = right;
    return [
        aw * bx + ax * bw + ay * bz - az * by,
        aw * by - ax * bz + ay * bw + az * bx,
        aw * bz + ax * by - ay * bx + az * bw,
        aw * bw - ax * bx - ay * by - az * bz
    ].map(cleanFloat);
}

/**
 * Check whether a property name is a bone translation, rotation or scaling property.
 *
 * @param {string} property Property name.
 * @returns {boolean} True for a bone transform property.
 */
function isBoneAnimationProperty(property)
{
    return !!normalizeBoneAnimationProperty(property);
}

/**
 * Map a property name to a bone transform component.
 *
 * @param {string} property Property name.
 * @returns {string} "position", "rotation", "scale", or "".
 */
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

/**
 * Get a bone's authored local value for a transform component.
 *
 * @param {Object<string, FbxProperty70>} properties Bone Properties70.
 * @param {string} property "position", "rotation" or "scale".
 * @returns {number[]} Authored vector.
 */
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

/**
 * Get a curve node's default axis values.
 *
 * @param {FbxObjectEntry} curveNode AnimationCurveNode object.
 * @param {number[]} fallback Fallback vector.
 * @returns {number[]} Default vector.
 */
function animationCurveNodeFallback(curveNode, fallback)
{
    const
        properties = readProperties70(curveNode.node).properties,
        axes = [ "d|X", "d|Y", "d|Z" ];

    return axes.map((axis, index) => propertyNumber(properties, axis, fallback[index]));
}

/**
 * Read a curve node's X, Y and Z curves into one vector curve.
 *
 * @param {FbxObjectEntry} curveNode AnimationCurveNode object.
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @param {number[]} fallback Value for axes without a curve.
 * @returns {FbxAnimationCurve|null} Vector curve, or null when the node has no axis curves.
 */
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

    const sourceTicks = uniqueSortedTicks(components);
    const sourceValues = sourceTicks.map(tick => components.map((component, axis) =>
        sampleScalarAnimationCurve(component, tick, fallback[axis])));
    const intervalModes = components.flatMap(component => component?.interpolations?.slice(0, -1) ?? []);
    const allStep = intervalModes.length
        ? intervalModes.every(mode => mode === "Step")
        : components.filter(Boolean).every(component => component.interpolation === "Step");
    if (allStep)
    {
        return { ticks: sourceTicks, values: sourceValues.flat(), interpolation: "Step" };
    }

    const ticks = [];
    const values = [];
    for (let index = 0; index < sourceTicks.length; index++)
    {
        const tick = sourceTicks[index];
        if (index)
        {
            const before = components.map((component, axis) =>
                sampleScalarAnimationCurve(component, tick, fallback[axis], true));
            if (before.some((value, axis) => value !== sourceValues[index][axis]))
            {
                ticks.push(tick);
                values.push(...before);
            }
        }
        ticks.push(tick);
        values.push(...sourceValues[index]);
    }
    return { ticks, values, interpolation: "Linear" };
}

/**
 * Get the axis index a property or curve name ends with.
 *
 * @param {string} property Property or curve name.
 * @returns {number|null} 0, 1 or 2, or null when there is no axis suffix.
 */
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

/**
 * Collect the sorted unique key ticks of several curves.
 *
 * @param {Array<FbxAnimationCurve|null>} components Curves.
 * @returns {number[]} Sorted ticks.
 */
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

/**
 * Sample a scalar curve with step or linear interpolation.
 *
 * @param {FbxAnimationCurve|null} curve Curve, or null to use the fallback.
 * @param {number} tick Sample tick.
 * @param {number} fallback Fallback value.
 * @param {boolean} [before=false] Sample the value just before a step at this tick.
 * @returns {number} Sampled value.
 */
function sampleScalarAnimationCurve(curve, tick, fallback, before = false)
{
    if (!curve)
    {
        return fallback;
    }

    const { ticks, values } = curve;
    if (tick < ticks[0])
    {
        return values[0];
    }
    if (tick > ticks[ticks.length - 1])
    {
        return values[values.length - 1];
    }

    const firstExact = ticks.indexOf(tick);
    if (firstExact !== -1)
    {
        const lastExact = ticks.lastIndexOf(tick);
        if (lastExact !== firstExact) return values[before ? firstExact : lastExact];
        if (before && firstExact > 0 &&
            (curve.interpolations?.[firstExact - 1] ?? curve.interpolation) === "Step")
        {
            return values[firstExact - 1];
        }
        return values[firstExact];
    }

    for (let i = 1; i < ticks.length; i++)
    {
        if (tick >= ticks[i])
        {
            continue;
        }

        if ((curve.interpolations?.[i - 1] ?? curve.interpolation) === "Step") return values[i - 1];

        const amount = (tick - ticks[i - 1]) / (ticks[i] - ticks[i - 1]);
        return values[i - 1] + (values[i] - values[i - 1]) * amount;
    }
    return fallback;
}

/**
 * Convert bone positions to scene space.
 *
 * @param {number[]} values Packed positions.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @param {boolean} isRoot Whether the bone is a skeleton root.
 * @returns {number[]} Converted positions.
 */
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

/**
 * Convert bone Euler rotations to quaternions through the bone's Model transform.
 *
 * @param {FbxObjectEntry} bone Bone Model.
 * @param {number[]} values Packed Euler angles in degrees.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @param {boolean} isRoot Whether the bone is a skeleton root.
 * @returns {number[]} Packed quaternions.
 */
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
    return normalizeQuaternionSeries(output, "FBX animation rotation");
}

/**
 * Convert a bone Euler curve to a quaternion curve, subdividing linear segments as needed.
 *
 * @param {FbxObjectEntry} bone Bone Model.
 * @param {FbxAnimationCurve} curve Euler curve.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @param {boolean} isRoot Whether the bone is a skeleton root.
 * @returns {{ticks: number[], values: number[]}} Quaternion keys.
 * @throws {Error} When a segment needs too many keys.
 */
function packBoneRotationCurve(bone, curve, sceneTransform, isRoot)
{
    const quaternions = packBoneRotationValues(bone, curve.values, sceneTransform, isRoot);
    if (curve.interpolation === "Step" || curve.ticks.length < 2)
    {
        return { ticks: curve.ticks, values: quaternions };
    }
    const source = curve.ticks.map((tick, index) => ({
        tick,
        euler: curve.values.slice(index * 3, index * 3 + 3),
        quaternion: quaternions.slice(index * 4, index * 4 + 4)
    }));
    const output = [ source[0] ];
    for (let sourceIndex = 1; sourceIndex < source.length; sourceIndex++)
    {
        const sourceStart = source[sourceIndex - 1];
        const sourceEnd = source[sourceIndex];
        const appendSegment = (start, end, alpha0, alpha1, depth) =>
        {
            const tick = quaternionSegmentMidpointTick(start.tick, end.tick);
            if (tick <= start.tick || tick >= end.tick)
            {
                output.push(end);
                return;
            }
            const authoredTurnRequiresSubdivision = sourceStart.euler.some((value, axis) =>
                Math.abs((sourceEnd.euler[axis] - value) * (alpha1 - alpha0)) > 90
            );
            const needsSubdivision = authoredTurnRequiresSubdivision ||
                quaternionSegmentNeedsSubdivision(start.tick, end.tick, (_tick, local) =>
            {
                const
                    alpha = alpha0 + (alpha1 - alpha0) * local,
                    euler = sourceStart.euler.map((value, axis) =>
                        value + (sourceEnd.euler[axis] - value) * alpha
                    ),
                    quaternion = packBoneRotationValues(bone, euler, sceneTransform, isRoot),
                    interpolated = normalizedLerpQuaternion(start.quaternion, end.quaternion, local);
                return quaternionAngularDifference(quaternion, interpolated);
            });
            if (!needsSubdivision)
            {
                output.push(end);
                return;
            }
            if (depth >= 12)
            {
                throw new Error("fbx: rotation curve requires more than 4096 baked keys per source segment");
            }
            const
                local = (tick - start.tick) / (end.tick - start.tick),
                alpha = alpha0 + (alpha1 - alpha0) * local,
                euler = sourceStart.euler.map((value, axis) =>
                    value + (sourceEnd.euler[axis] - value) * alpha
                ),
                quaternion = packBoneRotationValues(bone, euler, sceneTransform, isRoot);
            const middle = { tick, euler, quaternion };
            appendSegment(start, middle, alpha0, alpha, depth + 1);
            appendSegment(middle, end, alpha, alpha1, depth + 1);
        };
        appendSegment(sourceStart, sourceEnd, 0, 1, 0);
    }
    const values = output.flatMap(key => key.quaternion);
    return {
        ticks: output.map(key => key.tick),
        values: normalizeQuaternionSeries(values, "FBX animation rotation")
    };
}

/**
 * Check whether an object is a BlendShapeChannel deformer.
 *
 * @param {FbxObjectEntry|undefined} entry Object entry.
 * @returns {boolean} True for a BlendShapeChannel.
 */
function isBlendShapeChannel(entry)
{
    return !!entry && entry.nodeName === "Deformer" && (
        entry.className === "BlendShapeChannel" ||
        entry.fullName.startsWith("SubDeformer::") ||
        entry.name.includes("BlendShapeChannel")
    );
}

/**
 * Check whether a property name is DeformPercent.
 *
 * @param {string} property Property name.
 * @returns {boolean} True for DeformPercent.
 */
function isMorphAnimationProperty(property)
{
    return String(property || "").toLowerCase().includes("deformpercent");
}

/**
 * Check whether an object has a user-defined numeric Properties70 property.
 *
 * @param {FbxObjectEntry|undefined} entry Object entry.
 * @param {string} property Property name.
 * @returns {boolean} True when the property is user-defined and numeric.
 */
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

/**
 * Drop missing and repeated entries by key.
 *
 * @param {Array<FbxObjectEntry|null|undefined>} entries Entries.
 * @returns {FbxObjectEntry[]} Unique entries.
 */
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

/**
 * Pack values as little-endian float32 bytes.
 *
 * @param {number[]} values Values.
 * @returns {number[]} Byte values.
 */
function packFloat32Values(values)
{
    const
        bytes = new Uint8Array(values.length * 4),
        view = new DataView(bytes.buffer);

    values.forEach((value, index) => view.setFloat32(index * 4, value, true));
    return Array.from(bytes);
}

/**
 * Build cluster records merged by linked bone, skipping clusters without a bone or weights.
 *
 * @param {FbxObjectEntry[]} clusters Cluster deformers.
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @returns {FbxSkinClusterRecord[]} Records.
 */
function buildSkinClusterRecords(clusters, objectIndex, connections)
{
    const
        records = [],
        recordsByBone = new Map();
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

        const existing = recordsByBone.get(bone.key);
        if (existing)
        {
            // Carbon assigns palette entries by linked bone, not by cluster.
            // Multiple clusters for one bone contribute to that one entry.
            existing.indexes.push(...indexes);
            existing.weights.push(...weights);
        }
        else
        {
            const record = {
                cluster,
                bone,
                boneKey: bone.key,
                boneName: bone.name || cluster.name || `bone_${records.length}`,
                indexes: [ ...indexes ],
                weights: [ ...weights ]
            };
            recordsByBone.set(bone.key, record);
            records.push(record);
        }
    }
    return records;
}

/**
 * Check whether a cluster has a positive weight.
 *
 * @param {number[]} indexes Control point indexes.
 * @param {number[]} weights Weights.
 * @returns {boolean} True when a weight is positive.
 */
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

/**
 * Collect positive bone influences per control point.
 *
 * @param {FbxSkinClusterRecord[]} records Cluster records.
 * @returns {Map<number, FbxInfluence[]>} Influences by control point index.
 */
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

            const existing = list.find(influence => influence.boneIndex === boneIndex);
            if (existing)
            {
                existing.weight += weight;
            }
            else
            {
                list.push({ boneIndex, boneKey: record.boneKey, boneName: record.boneName, weight });
            }
            controlPointInfluences.set(controlPointIndex, list);
        }
    });

    return controlPointInfluences;
}

/**
 * Keep the four strongest positive influences and normalize their weights.
 *
 * @param {FbxInfluence[]} influences Influences.
 * @returns {FbxInfluence[]} Normalized influences.
 */
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

/**
 * Build bone bindings with bounds of their influenced vertices in bone space.
 *
 * @param {FbxSkinClusterRecord[]} records Cluster records.
 * @param {FbxInfluence[][]} outputInfluences Influences per vertex.
 * @param {number[]} positions Expanded scene-space positions.
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @param {Map<string, FbxModelTransformState>} modelWorldCache Model transform cache.
 * @returns {FbxBoneBinding[]} Bone bindings.
 */
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

/**
 * Build the scene-to-bone matrix of a cluster's bone.
 *
 * @param {FbxSkinClusterRecord} record Cluster record.
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @param {Map<string, FbxModelTransformState>} modelWorldCache Model transform cache.
 * @returns {number[]} Inverse bone world matrix.
 */
function buildBoneBindingMatrix(record, objectIndex, connections, sceneTransform, modelWorldCache)
{
    return invertMatrix4(transformMatrixScene(
        buildMeshGeometryToWorld(record.bone, objectIndex, connections, modelWorldCache),
        sceneTransform
    ));
}

/**
 * Get the bone Model linked to a cluster.
 *
 * @param {FbxObjectEntry} cluster Cluster deformer.
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @returns {FbxObjectEntry|null} Bone Model, or null.
 */
function clusterBone(cluster, objectIndex, connections)
{
    return connectedChildObjects(cluster, objectIndex, connections, "Model")[0] || null;
}

/**
 * Find the one skeleton that holds every bone of a skin.
 *
 * @param {string[]} boneKeys Bone keys.
 * @param {FbxSkeletonContext} skeletonContext Imported skeletons.
 * @returns {number|null} Skeleton index, or null when the bones are not in one skeleton.
 */
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

/**
 * Build a skeleton for every root bone hierarchy.
 *
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @param {Map<string, FbxModelTransformState>} modelWorldCache Model transform cache.
 * @param {FbxReaderValues} values Normalized reader values.
 * @param {string} values.compatibility In "carbon" mode, bind poses are not read.
 * @returns {FbxSkeletonContext} Imported skeletons.
 */
function buildSkeletonContext(objectIndex, connections, sceneTransform, modelWorldCache, values)
{
    const
        roots = objectIndex.list
            .filter(isBoneModel)
            .filter(bone => !connectedParentObjects(bone, objectIndex, connections, "Model").some(isBoneModel)),
        bindPoseMatrices = values.compatibility === COMPATIBILITY_CARBON
            ? new Map()
            : readBindPoseMatrices(objectIndex, connections, sceneTransform),
        skeletons = [],
        boneToSkeletonIndex = new Map(),
        visited = new Set();

    for (const root of roots)
    {
        if (visited.has(root.key))
        {
            continue;
        }

        const skeleton = buildSkeleton(
            root,
            objectIndex,
            connections,
            sceneTransform,
            modelWorldCache,
            bindPoseMatrices,
            visited,
            values.compatibility
        );
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

/**
 * Build one skeleton from a root bone, ordering bones parent first.
 *
 * @param {FbxObjectEntry} root Root bone Model.
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @param {Map<string, FbxModelTransformState>} modelWorldCache Model transform cache.
 * @param {Map<string, number[]>} bindPoseMatrices Bind matrices by bone key.
 * @param {Set<string>} visited Bone keys already assigned, updated in place.
 * @param {string} compatibility "source" or "carbon".
 * @returns {FbxImportedSkeleton} The skeleton.
 * @throws {Error} When the bone hierarchy is cyclic.
 */
function buildSkeleton(root, objectIndex, connections, sceneTransform, modelWorldCache, bindPoseMatrices, visited, compatibility)
{
    const
        records = [],
        componentKeys = new Set(),
        collectBone = (bone) =>
        {
            if (!bone || componentKeys.has(bone.key)) return;
            componentKeys.add(bone.key);
            for (const child of connectedChildObjects(bone, objectIndex, connections, "Model").filter(isBoneModel))
            {
                collectBone(child);
            }
        };
    collectBone(root);

    const
        pending = objectIndex.list.filter(entry =>
            isBoneModel(entry) && componentKeys.has(entry.key) && !visited.has(entry.key)),
        recordIndexByKey = new Map();
    while (pending.length)
    {
        let progressed = false;
        for (let index = 0; index < pending.length; index++)
        {
            const
                bone = pending[index],
                parent = connectedParentObjects(bone, objectIndex, connections, "Model")
                    .find(entry => isBoneModel(entry) && componentKeys.has(entry.key));
            if (parent && !recordIndexByKey.has(parent.key)) continue;

            const
                parentIndex = parent ? recordIndexByKey.get(parent.key) : -1,
                authoredLocalMatrix = buildBoneLocalMatrix(bone, parentIndex, objectIndex, connections, sceneTransform, modelWorldCache),
                authoredTransform = decomposeMatrix4(authoredLocalMatrix),
                transform = compatibility === COMPATIBILITY_CARBON && parentIndex === -1
                    ? { position: [ 0, 0, 0 ], rotation: [ 0, 0, 0, 1 ], scale: authoredTransform.scale }
                    : authoredTransform,
                localMatrix = compatibility === COMPATIBILITY_CARBON && parentIndex === -1
                    ? composeSimpleTransform(transform.position, [ 0, 0, 0 ], transform.scale, DEFAULT_ROTATION_ORDER)
                    : authoredLocalMatrix,
                recordIndex = records.length;

            visited.add(bone.key);
            recordIndexByKey.set(bone.key, recordIndex);
            records.push({ bone, parentIndex, localMatrix, transform });
            pending.splice(index, 1);
            index--;
            progressed = true;
        }

        if (!progressed)
        {
            throw new Error(`fbx: skeleton ${JSON.stringify(root.name || root.key)} contains a cyclic bone hierarchy`);
        }
    }

    const
        authoredName = compatibility === COMPATIBILITY_SOURCE
            ? readProperties70(root.node).properties.CjsSkeletonName?.value
            : undefined,
        name = authoredName === undefined ? root.name || "fbx_skeleton" : String(authoredName),
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
 * @param {FbxBoneRecord[]} records Imported skeleton bone records.
 * @returns {FbxBoneMask[]} CMF bone masks.
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
 * @param {FbxProperty70|undefined} definition Parsed Properties70 definition.
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

/**
 * Build a GR2 model per skeleton with its bound meshes.
 *
 * @param {FbxImportedSkeleton[]} skeletons Imported skeletons.
 * @param {FbxGr2Mesh[]} meshes Imported meshes.
 * @returns {FbxGr2Model[]} Models.
 */
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

/**
 * Build a GR2 bone from a bone record.
 *
 * @param {FbxBoneRecord} record Bone record.
 * @returns {FbxGr2Bone} The bone.
 */
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

/**
 * Build a bone's local matrix: scene-space world matrix for a root, local Model matrix otherwise.
 *
 * @param {FbxObjectEntry} bone Bone Model.
 * @param {number} parentIndex Parent record index, or -1.
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @param {Map<string, FbxModelTransformState>} modelWorldCache Model transform cache.
 * @returns {number[]} Local matrix.
 */
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

/**
 * Build transposed inverse bind matrices from bind poses, or from the rest hierarchy.
 *
 * @param {FbxBoneRecord[]} records Bone records.
 * @param {Map<string, number[]>} bindPoseMatrices Bind matrices by bone key.
 * @returns {number[][]} Inverse bind matrices.
 */
function buildInvBindTransforms(records, bindPoseMatrices)
{
    const invBindTransforms = [];
    for (const record of records)
    {
        const poseMatrix = bindPoseMatrices.get(record.bone.key);
        if (poseMatrix)
        {
            invBindTransforms.push(cleanMatrix4(invertMatrix4(poseMatrix)));
            continue;
        }
        const parentInvTransform = record.parentIndex === -1
            ? IDENTITY_MATRIX4
            : invBindTransforms[record.parentIndex];
        invBindTransforms.push(cleanMatrix4(multiplyMatrix4(
            invertMatrix4(record.localMatrix),
            parentInvTransform
        )));
    }
    return invBindTransforms.map((matrix) => transposeMatrix4(matrix));
}

/**
 * Read bind matrices from BindPose nodes, then from cluster TransformLink matrices.
 *
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @returns {Map<string, number[]>} Scene-space bind matrices by bone key.
 */
function readBindPoseMatrices(objectIndex, connections, sceneTransform)
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
    for (const cluster of objectIndex.list.filter(entry => entry.nodeName === "Deformer" && isClusterDeformer(entry)))
    {
        const
            bone = clusterBone(cluster, objectIndex, connections),
            matrix = readChildArray(cluster.node, "TransformLink");
        if (!bone || matrices.has(bone.key) || !Array.isArray(matrix) || matrix.length !== 16)
        {
            continue;
        }
        matrices.set(bone.key, transformMatrixScene(
            matrix.map(value => finiteNumber(value, "TransformLink")),
            sceneTransform
        ));
    }
    return matrices;
}

/**
 * Check whether an object is a LimbNode Model.
 *
 * @param {FbxObjectEntry|undefined} entry Object entry.
 * @returns {boolean} True for a bone Model.
 */
function isBoneModel(entry)
{
    return entry?.nodeName === "Model" && (entry.className === "LimbNode" || /LimbNode/iu.test(entry.fullName));
}

/**
 * Read the scene axes and unit scale from GlobalSettings.
 *
 * @param {FbxNode|null} globalSettingsNode GlobalSettings node, or null.
 * @returns {FbxSceneTransform} Scene conversion.
 */
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

/**
 * Build a geometry's world matrix from its owning Model and geometric transform.
 *
 * @param {FbxObjectEntry|null} owner Owning Model, or null for identity.
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @param {Map<string, FbxModelTransformState>} modelWorldCache Model transform cache.
 * @returns {number[]} Geometry-to-world matrix.
 */
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

/**
 * Build a Model's world transform state through its parents, with caching.
 *
 * @param {FbxObjectEntry} model Model object.
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @param {Map<string, FbxModelTransformState>} cache Model transform cache.
 * @returns {FbxModelTransformState} World transform state.
 */
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

/**
 * Build a Model's local matrix from its Properties70.
 *
 * @param {FbxObjectEntry} model Model object.
 * @returns {number[]} Local matrix.
 */
function buildModelLocalTransform(model)
{
    const properties = readProperties70(model.node).properties;
    return composeModelTransform(properties);
}

/**
 * Read a Model's local transform state.
 *
 * @param {FbxObjectEntry} model Model object.
 * @returns {FbxModelLocalState} Local state.
 */
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

/**
 * Combine a local state with its parent's world state by InheritType.
 *
 * @param {FbxModelLocalState} local Local state.
 * @param {FbxModelTransformState} parentState Parent world state.
 * @returns {FbxModelTransformState} World state.
 */
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

/**
 * Build a Model's geometric transform matrix.
 *
 * @param {FbxObjectEntry} model Model object.
 * @returns {number[]} Geometric matrix.
 */
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

/**
 * Compose a Model's local matrix from its translation, pivots, offsets, rotations and scale.
 *
 * @param {Object<string, FbxProperty70>} properties Model Properties70.
 * @param {object} [overrides={}] Values used instead of the Lcl properties.
 * @param {number[]} [overrides.translation] Translation.
 * @param {number[]} [overrides.rotation] Euler rotation in degrees.
 * @param {number[]} [overrides.scale] Scale.
 * @returns {number[]} Local matrix.
 */
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
        rotationMatrix4(propertyVector3(properties, "PreRotation", [ 0, 0, 0 ]), DEFAULT_ROTATION_ORDER),
        rotationMatrix4(overrides.rotation ?? propertyVector3(properties, "Lcl Rotation", [ 0, 0, 0 ]), rotationOrder),
        inverseRotationMatrix4(propertyVector3(properties, "PostRotation", [ 0, 0, 0 ]), DEFAULT_ROTATION_ORDER),
        translationMatrix4(negateVector3(rotationPivot)),
        translationMatrix4(propertyVector3(properties, "ScalingOffset", [ 0, 0, 0 ])),
        translationMatrix4(scalingPivot),
        scaleMatrix4(overrides.scale ?? propertyVector3(properties, "Lcl Scaling", [ 1, 1, 1 ])),
        translationMatrix4(negateVector3(scalingPivot))
    ]);
}

/**
 * Compose translation, rotation and scale into one matrix.
 *
 * @param {number[]} translation Translation.
 * @param {number[]} rotationDegrees Euler rotation in degrees.
 * @param {number[]} scale Scale.
 * @param {string} rotationOrder Rotation order, such as "XYZ".
 * @returns {number[]} Matrix.
 */
function composeSimpleTransform(translation, rotationDegrees, scale, rotationOrder)
{
    return multiplyMatrix4(
        translationMatrix4(translation),
        multiplyMatrix4(rotationMatrix4(rotationDegrees, rotationOrder), scaleMatrix4(scale))
    );
}

/**
 * Transform packed points by a matrix and into scene space.
 *
 * @param {number[]} values Packed points.
 * @param {number[]} matrix Matrix.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @returns {number[]} Transformed points.
 */
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

/**
 * Transform packed directions by a matrix's upper 3x3 into scene space and normalize them.
 *
 * @param {number[]} values Packed directions.
 * @param {number[]} matrix Matrix.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @returns {number[]} Transformed directions.
 */
function transformDirections(values, matrix, sceneTransform)
{
    if (!values.length)
    {
        return values;
    }

    // Carbon's Matrix::TransformNormal applies the ordinary upper 3x3 and the
    // FBX importer uses it for normals and tangents. Keep that convention here
    // even though an inverse-transpose is common in other render pipelines.
    const output = [];

    for (let i = 0; i < values.length; i += 3)
    {
        const vector = transformVectorMatrix4([ values[i], values[i + 1], values[i + 2] ], matrix);
        output.push(...normalizeVector3(transformSceneVector(vector, sceneTransform)));
    }

    return output;
}

/**
 * Convert a point to scene axes and units.
 *
 * @param {number[]} point Point.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @returns {number[]} Scene-space point.
 */
function transformScenePoint(point, sceneTransform)
{
    const vector = transformSceneVector(point, sceneTransform);
    return vector.map(value => value * sceneTransform.scale);
}

/**
 * Convert a vector to scene axes.
 *
 * @param {number[]} vector Vector.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @returns {number[]} Scene-space vector.
 */
function transformSceneVector(vector, sceneTransform)
{
    return [
        dotVector3(vector, sceneTransform.right),
        dotVector3(vector, sceneTransform.up),
        dotVector3(vector, sceneTransform.forward)
    ];
}

/**
 * Convert a matrix's basis and translation to scene axes and units.
 *
 * @param {number[]} matrix Matrix.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @returns {number[]} Scene-space matrix.
 */
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

/**
 * Scale a matrix's translation.
 *
 * @param {number[]} matrix Matrix.
 * @param {number} scale Scale factor.
 * @returns {number[]} Scaled matrix.
 */
function scaleMatrixTranslation(matrix, scale)
{
    const output = matrix.slice();
    output[3] *= scale;
    output[7] *= scale;
    output[11] *= scale;
    return cleanMatrix4(output);
}

/**
 * Decompose a matrix into translation, quaternion and scale.
 *
 * @param {number[]} matrix Matrix.
 * @returns {FbxTransform} Transform.
 */
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

/**
 * Convert a 3x3 rotation matrix to a normalized quaternion.
 *
 * @param {number[]} matrix 3x3 rotation matrix.
 * @returns {number[]} Quaternion as [x, y, z, w].
 */
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

/**
 * Read a three-component Properties70 value.
 *
 * @param {Object<string, FbxProperty70>} properties Properties70.
 * @param {string} name Property name.
 * @param {number[]} fallback Fallback vector.
 * @returns {number[]} Vector.
 */
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

/**
 * Read a numeric Properties70 value.
 *
 * @param {Object<string, FbxProperty70>} properties Properties70.
 * @param {string} name Property name.
 * @param {number|null} fallback Fallback value.
 * @returns {number|null} Value, or the fallback.
 */
function propertyNumber(properties, name, fallback)
{
    const value = properties[name]?.value;
    if (value === undefined || value === null || Array.isArray(value))
    {
        return fallback;
    }
    return finiteNumber(value, name);
}

/**
 * Read a Model's RotationOrder as an axis-order string.
 *
 * @param {Object<string, FbxProperty70>} properties Model Properties70.
 * @returns {string} Rotation order, such as "XYZ".
 */
function propertyRotationOrder(properties)
{
    const value = propertyNumber(properties, "RotationOrder", null);
    if (value === null)
    {
        return DEFAULT_ROTATION_ORDER;
    }
    return FBX_ROTATION_ORDERS[value] || DEFAULT_ROTATION_ORDER;
}

/**
 * Create a unit axis vector.
 *
 * @param {number} axis Axis index, clamped to 0..2.
 * @param {number} sign Negative for a negative axis.
 * @returns {number[]} Axis vector.
 */
function axisVector(axis, sign)
{
    const vector = [ 0, 0, 0 ];
    const index = Math.max(0, Math.min(2, integerNumber(axis, "Axis")));
    vector[index] = sign < 0 ? -1 : 1;
    return vector;
}

/**
 * Create a translation matrix.
 *
 * @param {number[]} translation Translation.
 * @returns {number[]} Matrix.
 */
function translationMatrix4(translation)
{
    return [
        1, 0, 0, translation[0],
        0, 1, 0, translation[1],
        0, 0, 1, translation[2],
        0, 0, 0, 1
    ];
}

/**
 * Create a scale matrix.
 *
 * @param {number[]} scale Scale.
 * @returns {number[]} Matrix.
 */
function scaleMatrix4(scale)
{
    return [
        scale[0], 0, 0, 0,
        0, scale[1], 0, 0,
        0, 0, scale[2], 0,
        0, 0, 0, 1
    ];
}

/**
 * Create a rotation matrix from Euler angles in a rotation order.
 *
 * @param {number[]} rotationDegrees Euler angles in degrees.
 * @param {string} order Rotation order, such as "XYZ".
 * @returns {number[]} Matrix.
 */
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

/**
 * Create the inverse of a rotation matrix from Euler angles.
 *
 * @param {number[]} rotationDegrees Euler angles in degrees.
 * @param {string} order Rotation order, such as "XYZ".
 * @returns {number[]} Matrix.
 */
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

/**
 * Multiply matrices in order.
 *
 * @param {number[][]} matrices Matrices.
 * @returns {number[]} Product matrix.
 */
function multiplyMatrix4List(matrices)
{
    return matrices.reduce((matrix, next) => multiplyMatrix4(matrix, next), IDENTITY_MATRIX4);
}

/**
 * Negate a vector.
 *
 * @param {number[]} vector Vector.
 * @returns {number[]} Negated vector.
 */
function negateVector3(vector)
{
    return [ -vector[0], -vector[1], -vector[2] ];
}

/**
 * Multiply two vectors component-wise.
 *
 * @param {number[]} a First vector.
 * @param {number[]} b Second vector.
 * @returns {number[]} Product vector.
 */
function multiplyVector3(a, b)
{
    return [ a[0] * b[0], a[1] * b[1], a[2] * b[2] ];
}

/**
 * Map an axis letter to its index.
 *
 * @param {string} axis "X", "Y" or "Z".
 * @returns {number} 0, 1 or 2.
 */
function axisIndex(axis)
{
    return axis === "X" ? 0 : axis === "Y" ? 1 : 2;
}

/**
 * Create a rotation matrix about one axis.
 *
 * @param {string} axis "X", "Y" or "Z".
 * @param {number} radians Angle in radians.
 * @returns {number[]} Matrix.
 */
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

/**
 * Invert a matrix.
 *
 * @param {number[]} matrix Matrix.
 * @returns {number[]} Inverse matrix.
 * @throws {Error} When the matrix is not invertible.
 */
function invertMatrix4(matrix)
{
    try
    {
        return cleanMatrix4(invertSharedMatrix4(matrix));
    }
    catch
    {
        throw new Error("fbx: transform matrix is not invertible");
    }
}

/**
 * Transform packed direction deltas into scene space without normalizing.
 *
 * @param {number[]} values Packed direction deltas.
 * @param {number[]} matrix Matrix.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @returns {number[]} Transformed deltas.
 */
function transformDirectionDeltas(values, matrix, sceneTransform)
{
    const output = [];
    for (let index = 0; index < values.length; index += 3)
    {
        const source = [ values[index], values[index + 1], values[index + 2] ];
        const vector = transformVectorMatrix4(source, matrix);
        output.push(...transformSceneVector(vector, sceneTransform));
    }
    return output;
}

/**
 * Transform a point by a matrix.
 *
 * @param {number[]} point Point.
 * @param {number[]} matrix Matrix.
 * @returns {number[]} Transformed point.
 */
function transformPointMatrix4(point, matrix)
{
    return [
        matrix[0] * point[0] + matrix[1] * point[1] + matrix[2] * point[2] + matrix[3],
        matrix[4] * point[0] + matrix[5] * point[1] + matrix[6] * point[2] + matrix[7],
        matrix[8] * point[0] + matrix[9] * point[1] + matrix[10] * point[2] + matrix[11]
    ];
}

/**
 * Transform a vector by a matrix's upper 3x3.
 *
 * @param {number[]} vector Vector.
 * @param {number[]} matrix Matrix.
 * @returns {number[]} Transformed vector.
 */
function transformVectorMatrix4(vector, matrix)
{
    return [
        matrix[0] * vector[0] + matrix[1] * vector[1] + matrix[2] * vector[2],
        matrix[4] * vector[0] + matrix[5] * vector[1] + matrix[6] * vector[2],
        matrix[8] * vector[0] + matrix[9] * vector[1] + matrix[10] * vector[2]
    ];
}

/**
 * Normalize a vector.
 *
 * @param {number[]} vector Vector.
 * @returns {number[]} Unit vector, or zero for a zero vector.
 */
function normalizeVector3(vector)
{
    const length = Math.hypot(vector[0], vector[1], vector[2]);
    if (length === 0)
    {
        return [ 0, 0, 0 ];
    }
    return vector.map(value => cleanFloat(value / length));
}

/**
 * Normalize a quaternion.
 *
 * @param {number[]} quaternion Quaternion as [x, y, z, w].
 * @returns {number[]} Unit quaternion, or identity for a zero quaternion.
 */
function normalizeQuaternion(quaternion)
{
    const length = Math.hypot(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
    if (length === 0)
    {
        return [ 0, 0, 0, 1 ];
    }
    return quaternion.map(value => cleanFloat(value / length));
}

/**
 * Compute a dot product.
 *
 * @param {number[]} a First vector.
 * @param {number[]} b Second vector.
 * @returns {number} Dot product.
 */
function dotVector3(a, b)
{
    return cleanFloat(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]);
}

/**
 * Convert degrees to radians.
 *
 * @param {number} value Angle in degrees.
 * @returns {number} Angle in radians.
 */
function degreesToRadians(value)
{
    return value * Math.PI / 180;
}

/**
 * Snap values below 1e-12 in magnitude to zero.
 *
 * @param {number} value Value.
 * @returns {number} Cleaned value.
 */
function cleanFloat(value)
{
    return Math.abs(value) < 1e-12 ? 0 : value;
}

/**
 * Clean every component of a vector.
 *
 * @param {number[]} vector Vector.
 * @returns {number[]} Cleaned vector.
 */
function cleanVector3(vector)
{
    return vector.map(cleanFloat);
}

/**
 * Clean every value of an array-like.
 *
 * @param {ArrayLike<number>} values Values.
 * @returns {number[]} Cleaned values.
 */
function cleanNumericArray(values)
{
    return Array.from(values, cleanFloat);
}

/**
 * Check whether a value is a non-empty array or typed array.
 *
 * @param {unknown} values Value.
 * @returns {boolean} True when non-empty.
 */
function hasArrayValues(values)
{
    return (Array.isArray(values) || ArrayBuffer.isView(values)) && values.length > 0;
}

/**
 * Clean every component of a matrix.
 *
 * @param {number[]} matrix Matrix.
 * @returns {number[]} Cleaned matrix.
 */
function cleanMatrix4(matrix)
{
    return matrix.map(cleanFloat);
}

/**
 * Index the children of an Objects node by key and node name.
 *
 * @param {FbxNode} objectsNode Objects node.
 * @returns {FbxObjectIndex} Indexed objects.
 */
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

/**
 * List the connected parents of an object with a node name.
 *
 * @param {FbxObjectEntry} entry Object entry.
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @param {string} nodeName Parent node name.
 * @returns {FbxObjectEntry[]} Parents.
 */
function connectedParentObjects(entry, objectIndex, connections, nodeName)
{
    return (connections.parentsByChild[entry.key] || [])
        .map(key => objectIndex.byId[key])
        .filter(parent => parent && parent.nodeName === nodeName);
}

/**
 * List the connected children of an object with a node name.
 *
 * @param {FbxObjectEntry|null} entry Object entry, or null.
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @param {string} nodeName Child node name.
 * @returns {FbxObjectEntry[]} Children, or an empty array for a null entry.
 */
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

/**
 * Read a required numeric child array.
 *
 * @param {FbxNode} node Parent node.
 * @param {string} childName Child node name.
 * @returns {number[]} Values.
 * @throws {Error} When the child array is missing.
 */
function requireChildArray(node, childName)
{
    const values = readChildArray(node, childName);
    if (!values)
    {
        throw new Error(`fbx: geometry is missing ${childName}`);
    }
    return values;
}

/**
 * Read a numeric child array.
 *
 * @param {FbxNode} node Parent node.
 * @param {string} childName Child node name.
 * @returns {number[]|null} Values, or null when absent.
 */
function readChildArray(node, childName)
{
    const child = findFirstNode(node.children, childName);
    return child ? readNodeArray(child, childName) : null;
}

/**
 * Read a node's first array property, or its ASCII `a` child.
 *
 * @param {FbxNode} node Node.
 * @param {string} feature Feature name for errors.
 * @returns {number[]|null} Values, or null when the node holds no array.
 */
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

/**
 * Convert an array property value to finite numbers.
 *
 * @param {FbxPropertyValue|undefined} property Property value.
 * @param {string} feature Feature name for errors.
 * @returns {number[]|null} Values, or null when the property is not an array.
 * @throws {Error} When the array is still compressed (code "CJS_FORMAT_OUTPUT_NOT_SUPPORTED").
 */
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

/**
 * Expand control points to one vertex per polygon corner.
 *
 * @param {number[]} controlPoints Control points.
 * @param {number[]} polygonVertexIndex PolygonVertexIndex values.
 * @param {FbxObjectEntry} geometry Geometry object for errors.
 * @returns {FbxDecodedPolygons} Decoded polygons.
 * @throws {Error} When an index is out of range or a polygon is short or unterminated.
 */
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

/**
 * Read a layer element channel expanded to one element per polygon corner.
 *
 * @param {FbxNode} geometryNode Geometry node.
 * @param {string} layerName Layer element node name.
 * @param {number} layerIndex Layer element index.
 * @param {string[]} valueNames Candidate value child names.
 * @param {string[]} indexNames Candidate index child names.
 * @param {number} elementSize Components per element.
 * @param {FbxDecodedPolygons} decoded Decoded polygons.
 * @param {string} feature Feature name for errors.
 * @returns {number[]} Expanded values, or an empty array when absent.
 * @throws {Error} When the value length is not a multiple of the element size.
 */
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
 * Read every supported layer element channel of a Geometry.
 *
 * @param {FbxNode} geometryNode Geometry node.
 * @param {FbxDecodedPolygons} decoded Decoded polygons.
 * @param {FbxReaderValues} values Normalized reader values.
 * @param {string} values.compatibility In "carbon" mode, binormals are skipped.
 * @param {boolean} values.flipV Whether UV V coordinates are flipped.
 * @param {number[]} meshTransform Geometry-to-world matrix.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @returns {Object<string, number[]>} Channels by CMF vertex channel name.
 */
function readGeometryLayerChannels(geometryNode, decoded, values, meshTransform, sceneTransform)
{
    const output = {};
    for (const spec of [
        [ "LayerElementNormal", "normal", [ "Normals" ], [ "NormalsIndex", "NormalIndex" ], 3, "Normals", true ],
        [ "LayerElementTangent", "tangent", [ "Tangents" ], [ "TangentsIndex", "TangentIndex" ], 3, "Tangents", true ],
        [ "LayerElementBinormal", "binormal", [ "Binormals" ], [ "BinormalsIndex", "BinormalIndex" ], 3, "Binormals", true ],
        [ "LayerElementUV", "texcoord", [ "UV" ], [ "UVIndex", "UVIndices" ], 2, "UV", false ],
        [ "LayerElementColor", "color", [ "Colors" ], [ "ColorIndex", "ColorsIndex", "ColorIndices" ], 4, "Colors", false ]
    ])
    {
        const [ layerName, channelName, valueNames, indexNames, width, feature, directional ] = spec;
        if (values.compatibility === COMPATIBILITY_CARBON && channelName === "binormal") continue;
        for (const usageIndex of layerUsageIndices(geometryNode, layerName))
        {
            let channel = readLayerElementChannel(
                geometryNode,
                layerName,
                usageIndex,
                valueNames,
                indexNames,
                width,
                decoded,
                feature
            );
            if (directional) channel = transformDirections(channel, meshTransform, sceneTransform);
            if (channelName === "texcoord" && values.flipV) channel = flipTexcoordV(channel);
            if (channel.length) output[usageIndex === 0 && [ "normal", "tangent", "binormal" ].includes(channelName)
                ? channelName
                : `${channelName}${usageIndex}`] = channel;
        }
    }
    return output;
}

/**
 * List the usage indices of a layer element, from Layer routing when present.
 *
 * @param {FbxNode} geometryNode Geometry node.
 * @param {string} layerName Layer element node name.
 * @returns {number[]} Sorted unique usage indices.
 * @throws {Error} When an index is outside 0..255.
 */
function layerUsageIndices(geometryNode, layerName)
{
    const routed = [];
    for (const layer of geometryNode.children.filter(child => child.name === "Layer"))
    {
        for (const reference of layer.children.filter(child => child.name === "LayerElement" &&
            String(readFirstChildProperty(child, "Type") || "") === layerName))
        {
            const typedIndex = integerNumber(
                readFirstChildProperty(reference, "TypedIndex") ?? 0,
                "TypedIndex"
            );
            if (typedIndex < 0 || typedIndex > 255)
            {
                throw new Error(`fbx: ${layerName} TypedIndex ${typedIndex} is outside CMF usage range 0..255`);
            }
            routed.push(typedIndex);
        }
    }
    if (routed.length) return Array.from(new Set(routed)).sort((left, right) => left - right);

    const direct = geometryNode.children.filter(child => child.name === layerName).map((child, index) =>
    {
        const value = child.properties.length ? Number(child.properties[0]) : index;
        if (!Number.isInteger(value) || value < 0 || value > 255)
        {
            throw new Error(`fbx: ${layerName} index ${value} is outside CMF usage range 0..255`);
        }
        return value;
    });
    return Array.from(new Set(direct)).sort((left, right) => left - right);
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

/**
 * Find a layer element node by its index property or position.
 *
 * @param {FbxNode} geometryNode Geometry node.
 * @param {string} layerName Layer element node name.
 * @param {number} layerIndex Layer element index.
 * @returns {FbxNode|null} Layer element node, or null.
 */
function findLayerElementNode(geometryNode, layerName, layerIndex)
{
    const layers = geometryNode.children.filter(child => child.name === layerName);
    return layers.find((child, index) =>
    {
        const id = child.properties.length ? Number(child.properties[0]) : index;
        return Number.isFinite(id) && id === layerIndex;
    }) || layers[layerIndex] || null;
}

/**
 * Find a layer element node through a Layer's LayerElement reference.
 *
 * @param {FbxNode} geometryNode Geometry node.
 * @param {string} layerName Layer element node name.
 * @param {number} layerIndex Layer index.
 * @returns {FbxNode|null} Layer element node, or null.
 */
function findRoutedLayerElementNode(geometryNode, layerName, layerIndex)
{
    const layerNodes = geometryNode.children.filter(child => child.name === "Layer");
    const layerNode = layerNodes.find((child, index) =>
    {
        const id = child.properties.length ? Number(child.properties[0]) : index;
        return Number.isFinite(id) && id === layerIndex;
    }) || layerNodes[layerIndex];

    if (layerNode)
    {
        for (const reference of layerNode.children.filter(child => child.name === "LayerElement"))
        {
            if (String(readFirstChildProperty(reference, "Type") || "") !== layerName) continue;
            const typedIndex = integerNumber(
                readFirstChildProperty(reference, "TypedIndex") ?? 0,
                "TypedIndex"
            );
            return findLayerElementNode(geometryNode, layerName, typedIndex);
        }
    }
    return findLayerElementNode(geometryNode, layerName, layerIndex);
}

/**
 * Read the first present child array from candidate names.
 *
 * @param {FbxNode} node Parent node.
 * @param {string[]} childNames Candidate child names.
 * @returns {number[]|null} Values, or null when none is present.
 */
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

/**
 * Get the element index a corner uses for a mapping mode.
 *
 * @param {string} mapping MappingInformationType.
 * @param {FbxPolygonCorner} corner Polygon corner.
 * @param {string} feature Feature name for errors.
 * @returns {number} Mapped index.
 * @throws {Error} When the mapping mode is unsupported.
 */
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

/**
 * Resolve a mapped index through a reference mode.
 *
 * @param {string} reference ReferenceInformationType.
 * @param {number[]} indices Index array.
 * @param {number} mappedIndex Mapped index.
 * @param {string} feature Feature name for errors.
 * @returns {number} Direct element index.
 * @throws {Error} When the reference mode is unsupported or the index array is too short.
 */
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

/**
 * Append one layer element's components.
 *
 * @param {number[]} output Output values.
 * @param {number[]} values Element values.
 * @param {number} directIndex Element index.
 * @param {number} elementSize Components per element.
 * @param {string} feature Feature name for errors.
 * @throws {Error} When the index is out of range.
 */
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

/**
 * Group triangles by material slot.
 *
 * @param {number[][][]} polygonTriangles Triangles per polygon.
 * @param {FbxMaterialSelection} materialSelection Material slots and polygon selection.
 * @returns {FbxIndexGroup[]} Index groups.
 * @throws {Error} When a polygon references a missing slot.
 */
function buildIndexGroups(polygonTriangles, materialSelection)
{
    const groups = materialSelection.slots.map(slot => ({
        name: slot.name,
        bytesPerIndex: 2,
        faces: []
    }));
    let maxIndex = 0;

    for (let polygonIndex = 0; polygonIndex < polygonTriangles.length; polygonIndex++)
    {
        const
            triangles = polygonTriangles[polygonIndex],
            slot = materialSelection.polygonSlots[polygonIndex] ?? 0,
            group = groups[slot];

        if (!group)
        {
            throw new Error(`fbx: polygon ${polygonIndex} references missing material slot ${slot}`);
        }

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

/**
 * Triangulate every polygon.
 *
 * @param {number[][]} polygons Vertex indices per polygon.
 * @param {number[]} positions Expanded positions.
 * @returns {number[][][]} Triangles per polygon.
 */
function triangulatePolygonList(polygons, positions)
{
    return polygons.map(polygon => triangulatePolygon(polygon, positions));
}

/**
 * Triangulate a polygon by ear clipping, falling back to a fan.
 *
 * @param {number[]} polygon Vertex indices.
 * @param {number[]} positions Expanded positions.
 * @returns {number[][]} Triangles.
 */
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

/**
 * Flatten triangles per polygon to one index list.
 *
 * @param {number[][][]} polygonTriangles Triangles per polygon.
 * @returns {number[]} Triangle indices.
 */
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

/**
 * Reverse triangle winding when the transform reflects.
 *
 * @param {number[][][]} polygonTriangles Triangles per polygon.
 * @param {boolean} reflected Whether the transform reflects.
 * @returns {number[][][]} Oriented triangles.
 */
function orientPolygonTriangles(polygonTriangles, reflected)
{
    if (!reflected) return polygonTriangles;
    return polygonTriangles.map(triangles => triangles.map(triangle => [
        triangle[0], triangle[2], triangle[1]
    ]));
}

/**
 * Check whether a matrix combined with the scene conversion reflects.
 *
 * @param {number[]} matrix Matrix.
 * @param {FbxSceneTransform} sceneTransform Scene conversion.
 * @returns {boolean} True when the determinant is negative.
 */
function isReflectedTransform(matrix, sceneTransform)
{
    const matrixDeterminant = determinant3(
        matrix[0], matrix[1], matrix[2],
        matrix[4], matrix[5], matrix[6],
        matrix[8], matrix[9], matrix[10]
    );
    const sceneDeterminant = determinant3(
        ...sceneTransform.right,
        ...sceneTransform.up,
        ...sceneTransform.forward
    ) * sceneTransform.scale ** 3;
    return matrixDeterminant * sceneDeterminant < 0;
}

/**
 * Compute a 3x3 determinant.
 *
 * @param {number} a00 Row 0, column 0.
 * @param {number} a01 Row 0, column 1.
 * @param {number} a02 Row 0, column 2.
 * @param {number} a10 Row 1, column 0.
 * @param {number} a11 Row 1, column 1.
 * @param {number} a12 Row 1, column 2.
 * @param {number} a20 Row 2, column 0.
 * @param {number} a21 Row 2, column 1.
 * @param {number} a22 Row 2, column 2.
 * @returns {number} Determinant.
 */
function determinant3(a00, a01, a02, a10, a11, a12, a20, a21, a22)
{
    return a00 * (a11 * a22 - a12 * a21) -
        a01 * (a10 * a22 - a12 * a20) +
        a02 * (a10 * a21 - a11 * a20);
}

/**
 * Triangulate a polygon as a fan from its first vertex.
 *
 * @param {number[]} polygon Vertex indices.
 * @returns {number[][]} Triangles.
 */
function triangulatePolygonFan(polygon)
{
    const triangles = [];
    for (let i = 1; i < polygon.length - 1; i++)
    {
        triangles.push([ polygon[0], polygon[i], polygon[i + 1] ]);
    }
    return triangles;
}

/**
 * Project a polygon onto the plane that drops its normal's dominant axis.
 *
 * @param {number[]} polygon Vertex indices.
 * @param {number[]} positions Expanded positions.
 * @returns {number[][]|null} 2D points, or null for a degenerate polygon.
 */
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

/**
 * Compute a polygon's Newell normal.
 *
 * @param {number[]} polygon Vertex indices.
 * @param {number[]} positions Expanded positions.
 * @returns {number[]} Unnormalized normal.
 */
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

/**
 * Compute a 2D polygon's signed area.
 *
 * @param {number[][]} points 2D points.
 * @returns {number} Signed area.
 */
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

/**
 * Check whether a vertex is a clippable ear.
 *
 * @param {number} previous Previous point index.
 * @param {number} current Current point index.
 * @param {number} next Next point index.
 * @param {number[]} remaining Remaining point indices.
 * @param {number[][]} points 2D points.
 * @param {number} area Polygon signed area.
 * @returns {boolean} True for an ear.
 */
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

/**
 * Check whether a 2D polygon is convex.
 *
 * @param {number[][]} points 2D points.
 * @param {number} area Polygon signed area.
 * @returns {boolean} True when convex.
 */
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

/**
 * Compute the 2D cross product of `b - a` and `c - a`.
 *
 * @param {number[]} a First point.
 * @param {number[]} b Second point.
 * @param {number[]} c Third point.
 * @returns {number} Cross product.
 */
function cross2D(a, b, c)
{
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

/**
 * Check whether a 2D point lies in or on a triangle.
 *
 * @param {number[]} point Point.
 * @param {number[]} a First corner.
 * @param {number[]} b Second corner.
 * @param {number[]} c Third corner.
 * @returns {boolean} True when inside or on an edge.
 */
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

/**
 * Read material slots and the slot of each polygon.
 *
 * @param {FbxObjectEntry} geometry Geometry object.
 * @param {FbxObjectEntry|null} owner Owning Model, or null.
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @param {number} polygonCount Polygon count.
 * @returns {FbxMaterialSelection} Material selection.
 * @throws {Error} When a polygon slot is out of range.
 */
function readPolygonMaterials(geometry, owner, objectIndex, connections, polygonCount)
{
    const slots = readMaterialSlots(geometry, owner, objectIndex, connections);
    if (!slots.length)
    {
        slots.push({ key: "default", name: "default" });
    }

    const layer = findRoutedLayerElementNode(geometry.node, "LayerElementMaterial", 0);
    if (!layer)
    {
        return { slots, polygonSlots: new Array(polygonCount).fill(0) };
    }

    const
        mapping = String(readFirstChildProperty(layer, "MappingInformationType") || "AllSame"),
        materials = readChildArray(layer, "Materials") || [],
        polygonSlots = [];

    for (let i = 0; i < polygonCount; i++)
    {
        const slot = mapping === "ByPolygon"
            ? integerNumber(materials[i] ?? 0, "Materials")
            : integerNumber(materials[0] ?? 0, "Materials");
        if (slot < 0 || slot >= slots.length)
        {
            throw new Error(`fbx: Materials slot ${slot} is outside 0..${slots.length - 1}`);
        }
        polygonSlots.push(slot);
    }

    return { slots, polygonSlots };
}

/**
 * List the unique Materials connected to a Model and its Geometry.
 *
 * @param {FbxObjectEntry} geometry Geometry object.
 * @param {FbxObjectEntry|null} owner Owning Model, or null.
 * @param {FbxObjectIndex} objectIndex Indexed objects.
 * @param {FbxConnections} connections Indexed connections.
 * @returns {FbxMaterialSlot[]} Material slots.
 */
function readMaterialSlots(geometry, owner, objectIndex, connections)
{
    const materials = [
        ...connectedChildObjects(owner, objectIndex, connections, "Material"),
        ...connectedChildObjects(geometry, objectIndex, connections, "Material")
    ];
    const seen = new Set();
    const slots = [];

    for (const material of materials)
    {
        if (seen.has(material.key))
        {
            continue;
        }
        seen.add(material.key);
        slots.push({ key: material.key, name: material.name ?? `material_${slots.length}` });
    }

    return slots;
}

/**
 * Name a mesh after its owning Model or Geometry.
 *
 * @param {FbxObjectEntry} geometry Geometry object.
 * @param {FbxObjectEntry|null} owner Owning Model, or null.
 * @returns {string} Mesh name.
 */
function meshNameFromFbx(geometry, owner)
{
    return owner?.name || geometry.name || "fbx_mesh";
}

/**
 * Create GR2 vertex channels with empty defaults.
 *
 * @param {number[]} position Positions.
 * @param {Object<string, number[]>} [channels={}] Channels that override the defaults.
 * @returns {Object<string, number[]>} Vertex channels.
 */
function createGr2Vertex(position, channels = {})
{
    return {
        position,
        blendIndice: [],
        tangent: [],
        normal: [],
        texcoord0: [],
        texcoord1: [],
        color0: [],
        binormal: [],
        blendWeight: [],
        ...channels
    };
}

/**
 * Compute the bounds of packed positions.
 *
 * @param {number[]} positions Packed positions.
 * @returns {FbxBounds} Bounds; zero for no positions.
 */
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

/**
 * Hydrate a GR2-shaped root into caller classes.
 *
 * @param {FbxGr2Root} root Imported root.
 * @param {Object<string, Function>} classes Output node constructors by class key.
 * @param {object} [hydrationOptions={}] Options passed to `SetValues`.
 * @returns {object} Hydrated root.
 */
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
        animations: root.animations.map(animation => hydrateGr2Animation(animation, hydrationClasses))
    }, hydrationClasses, hydrationOptions);
}

/**
 * Hydrate a GR2 animation and its track groups, tracks and curves.
 *
 * @param {object} animation GR2 animation.
 * @param {Object<string, Function>} classes Hydration class map.
 * @returns {object} Hydrated animation.
 */
function hydrateGr2Animation(animation, classes)
{
    return hydrate("Animation", {
        ...animation,
        trackGroups: (animation.trackGroups ?? []).map(trackGroup => hydrate("TrackGroup", {
            ...trackGroup,
            transformTracks: (trackGroup.transformTracks ?? []).map(track => hydrate("TransformTrack", {
                ...track,
                orientation: hydrate("Curve", track.orientation, classes),
                position: hydrate("Curve", track.position, classes),
                scaleShear: hydrate("Curve", track.scaleShear, classes)
            }, classes)),
            vectorTracks: (trackGroup.vectorTracks ?? []).map(track => hydrate("VectorTrack", {
                ...track,
                valueCurve: hydrate("Curve", track.valueCurve, classes)
            }, classes))
        }, classes))
    }, classes);
}

/**
 * Hydrate a GR2 model and its skeleton.
 *
 * @param {FbxGr2Model} model GR2 model.
 * @param {Object<string, Function>} classes Hydration class map.
 * @returns {object} Hydrated model.
 */
function hydrateGr2Model(model, classes)
{
    return hydrate("Model", {
        ...model,
        skeleton: hydrateGr2Skeleton(model.skeleton, classes)
    }, classes);
}

/**
 * Hydrate a GR2 skeleton and its bones.
 *
 * @param {{name: string, bones: FbxGr2Bone[]}} skeleton GR2 skeleton.
 * @param {Object<string, Function>} classes Hydration class map.
 * @returns {object} Hydrated skeleton.
 */
function hydrateGr2Skeleton(skeleton, classes)
{
    return hydrate("Skeleton", {
        ...skeleton,
        bones: skeleton.bones.map(bone => hydrate("Bone", bone, classes))
    }, classes);
}

/**
 * Create a class instance for a class key and populate it, or return the fields unchanged.
 *
 * @param {string} type Class key.
 * @param {object} fields Fields.
 * @param {Object<string, Function>} classes Hydration class map.
 * @param {object} [hydrationOptions={}] Options passed to `SetValues`; empty uses the map's stored options.
 * @returns {object} Instance, or the fields when no class is registered.
 */
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

/**
 * Populate an instance through `SetValues`.
 *
 * @param {object} instance Class instance.
 * @param {object} fields Fields.
 * @param {object} [hydrationOptions={}] Options passed to `SetValues`.
 * @returns {object} The instance.
 * @throws {TypeError} When the instance has no `SetValues`.
 */
function populate(instance, fields, hydrationOptions = {})
{
    if (!instance || typeof instance.SetValues !== "function")
    {
        throw new TypeError("CjsFbxFormat class population requires classes to implement SetValues(values)");
    }
    instance.SetValues(fields, { ...hydrationOptions, skipUpdate: true, skipEvents: true });
    return instance;
}

/**
 * Create a class map that inherits from the caller's map and carries hydration options.
 *
 * @param {Object<string, Function>} classes Output node constructors.
 * @param {object} hydrationOptions Options passed to `SetValues`.
 * @returns {Object<string, Function>} Hydration class map.
 */
function createHydrationClasses(classes, hydrationOptions)
{
    const map = Object.create(classes || null);
    Object.defineProperty(map, "__hydrationOptions", { value: hydrationOptions, enumerable: false });
    return map;
}

/**
 * Summarize a parsed document's header, settings, definitions, objects and connections.
 *
 * @param {FbxNode[]} nodes Root nodes.
 * @returns {object} Document summary.
 */
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

/**
 * Read the FBXHeaderExtension summary.
 *
 * @param {FbxNode|null} node FBXHeaderExtension node, or null.
 * @returns {{fbxHeaderVersion?: FbxPropertyValue, fbxVersion?: FbxPropertyValue, creator?: FbxPropertyValue}} Header summary.
 */
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

/**
 * Read the Definitions summary.
 *
 * @param {FbxNode|null} node Definitions node, or null.
 * @returns {{version: FbxPropertyValue, count: FbxPropertyValue, objectTypes: Array<{type: FbxPropertyValue, count: FbxPropertyValue}>}} Definitions summary.
 */
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

/**
 * Read an ObjectType definition.
 *
 * @param {FbxNode} node ObjectType node.
 * @returns {{type: FbxPropertyValue, count: FbxPropertyValue}} Type and count.
 */
function readObjectType(node)
{
    return {
        type: node.properties[0] || "",
        count: readFirstChildProperty(node, "Count") || 0
    };
}

/**
 * Summarize the children of an Objects node.
 *
 * @param {FbxNode|null} node Objects node, or null.
 * @returns {{count: number, list: FbxObjectSummary[], byId: Object<string, FbxObjectSummary>, byType: Object<string, string[]>}} Object summaries.
 */
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

/**
 * Summarize one object node.
 *
 * @param {FbxNode} node Object node.
 * @returns {FbxObjectSummary} Object summary.
 */
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

/**
 * Read and index the connections of a Connections node.
 *
 * @param {FbxNode|null} node Connections node, or null.
 * @returns {FbxConnections} Indexed connections.
 */
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

/**
 * Read a node's Properties70 definitions.
 *
 * @param {FbxNode|null|undefined} node Node, or nullish.
 * @returns {{properties: Object<string, FbxProperty70>}} Definitions by property name.
 */
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

/**
 * Get a `P` node's value: one value, or an array for several.
 *
 * @param {FbxPropertyValue[]} properties `P` node properties.
 * @returns {FbxPropertyValue|FbxPropertyValue[]|undefined} Value.
 */
function getProperty70Value(properties)
{
    if (properties.length <= 5)
    {
        return properties[4];
    }
    return properties.slice(4);
}

/**
 * Read the first property of a named child.
 *
 * @param {FbxNode} node Parent node.
 * @param {string} childName Child node name.
 * @returns {FbxPropertyValue|undefined} Property value, or undefined when absent.
 */
function readFirstChildProperty(node, childName)
{
    const child = findFirstNode(node.children, childName);
    return child ? child.properties[0] : undefined;
}

/**
 * Find the first node with a name.
 *
 * @param {FbxNode[]} nodes Nodes.
 * @param {string} name Node name.
 * @returns {FbxNode|null} Node, or null.
 */
function findFirstNode(nodes, name)
{
    return nodes.find(node => node.name === name) || null;
}

/**
 * Strip the class marker and namespace from an object name.
 *
 * @param {FbxPropertyValue} fullName Full object name.
 * @returns {string} Short name, or "" for a non-string.
 */
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

/**
 * Append a value to a keyed list.
 *
 * @param {Object<string, Array<*>>} index Lists by key.
 * @param {string} key Key.
 * @param {*} value Value.
 */
function pushIndex(index, key, value)
{
    if (!index[key])
    {
        index[key] = [];
    }
    index[key].push(value);
}

/**
 * Convert an object id to a string key.
 *
 * @param {FbxPropertyValue|undefined|null} value Object id.
 * @returns {string} Key, or "" for nullish ids.
 */
function toObjectKey(value)
{
    return value === undefined || value === null ? "" : String(value);
}

/**
 * Append a continuation line to the last ASCII `a` array node.
 *
 * @param {Array<{children: FbxNode[]}>} stack Open node stack.
 * @param {string} line Continuation line.
 * @param {FbxReaderValues} values Normalized reader values.
 * @throws {Error} When the array exceeds `maxProperties`.
 */
function appendAsciiArrayContinuation(stack, line, values)
{
    const
        siblings = stack[stack.length - 1].children,
        arrayNode = siblings[siblings.length - 1];

    if (arrayNode?.name !== "a") return;
    arrayNode.properties.push(...parseAsciiProperties(line));
    if (arrayNode.properties.length > values.maxProperties)
    {
        throw new Error(`fbx: ASCII node a exceeds maxProperties (${values.maxProperties})`);
    }
}

/**
 * Parse an ASCII `Name: properties` line into a node.
 *
 * @param {string} line Trimmed line.
 * @param {FbxReaderValues} values Normalized reader values.
 * @returns {(FbxNode & {opensBlock: boolean})|null} Node, or null when the line is not a node.
 * @throws {Error} When the node exceeds `maxProperties`.
 */
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

/**
 * Parse comma-separated ASCII property values.
 *
 * @param {string} body Property text.
 * @returns {Array<number|string|boolean>} Values.
 */
function parseAsciiProperties(body)
{
    return splitAsciiProperties(body).map(parseAsciiValue);
}

/**
 * Split ASCII property text on commas outside quotes.
 *
 * @param {string} body Property text.
 * @returns {string[]} Trimmed parts.
 */
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

    if (current.trim())
    {
        parts.push(current.trim());
    }

    return parts;
}

/**
 * Parse one ASCII property value.
 *
 * @param {string} value Value text.
 * @returns {number|string|boolean} Parsed value; integers outside the safe range stay strings.
 */
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
    if (/^[+-]?\d+$/u.test(value))
    {
        const number = Number(value);
        return Number.isSafeInteger(number) ? number : BigInt(value).toString();
    }
    if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/iu.test(value))
    {
        return Number(value);
    }
    return value;
}

/**
 * Remove a `;` comment outside quotes.
 *
 * @param {string} line Line.
 * @returns {string} Line without its comment.
 */
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

/**
 * Check for the binary FBX signature.
 *
 * @param {Uint8Array} bytes Bytes.
 * @returns {boolean} True when the signature matches.
 */
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

/**
 * Check whether text looks like ASCII FBX.
 *
 * @param {string} text Text prefix.
 * @returns {boolean} True when ASCII FBX markers are found.
 */
function isAsciiFBXText(text)
{
    return /(^|\n)\s*FBXHeaderExtension\s*:/u.test(text) ||
        /(^|\n)\s*Objects\s*:/u.test(text) ||
        /;\s*FBX\s+\d+\.\d+\.\d+/iu.test(text);
}

/**
 * Count ASCII root nodes.
 *
 * @param {string} text ASCII FBX text.
 * @returns {number} Root node count.
 */
function countAsciiRootNodes(text)
{
    return collectAsciiRootNames(text).length;
}

/**
 * Collect ASCII root node names.
 *
 * @param {string} text ASCII FBX text.
 * @returns {string[]} Root node names.
 */
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

/**
 * Read the FBX version from FBXVersion or the header comment.
 *
 * @param {string} text ASCII FBX text.
 * @returns {number} Version, or 0 when absent.
 */
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

/**
 * Decode a byte prefix as Latin-1 text, stopping at a NUL.
 *
 * @param {Uint8Array} bytes Bytes.
 * @param {number} length Maximum byte count.
 * @returns {string} Text.
 */
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

/**
 * Get the binary node header size for a version.
 *
 * @param {number} version FBX version.
 * @returns {number} 25 for 7500 and later, otherwise 13.
 */
function getBinaryNodeHeaderSize(version)
{
    return version >= 7500 ? NODE_HEADER_64_SIZE : NODE_HEADER_32_SIZE;
}

/**
 * Check for an all-zero null record.
 *
 * @param {Uint8Array} bytes Bytes.
 * @param {number} offset Byte offset.
 * @param {number} length Record length.
 * @returns {boolean} True for a complete all-zero record.
 */
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

/**
 * Get the element byte size of an array type.
 *
 * @param {string} type Array type code.
 * @returns {number} Element size in bytes.
 */
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

/**
 * Validate a positive integer reader limit.
 *
 * @param {number} value Limit.
 * @param {string} fieldName Option name.
 * @param {string} readerName Reader name for errors.
 * @returns {number} The limit.
 * @throws {TypeError} When the value is not a positive integer.
 */
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

/**
 * Validate the compatibility option.
 *
 * @param {string} value Compatibility mode.
 * @param {string} readerName Reader name for errors.
 * @returns {string} "source" or "carbon".
 * @throws {TypeError} When the value is neither.
 */
function normalizeCompatibility(value, readerName)
{
    if (value === COMPATIBILITY_SOURCE || value === COMPATIBILITY_CARBON) return value;
    throw new TypeError(
        `${readerName}: compatibility must be ${JSON.stringify(COMPATIBILITY_SOURCE)} or ${JSON.stringify(COMPATIBILITY_CARBON)}`
    );
}

/**
 * Validate and copy a class map.
 *
 * @param {Object<string, Function>|null|undefined} classes Class map.
 * @param {string} readerName Reader name for errors.
 * @returns {Object<string, Function>} Copied class map.
 * @throws {TypeError} When the map is not an object.
 */
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

/**
 * Merge a class map over a base map; nullish entries delete keys.
 *
 * @param {Object<string, Function>} base Base class map.
 * @param {Object<string, Function|null>} classes Overrides.
 * @param {string} readerName Reader name for errors.
 * @returns {Object<string, Function>} Merged class map.
 * @throws {TypeError} When the overrides are not an object.
 */
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

/**
 * Check whether a class map holds a constructor.
 *
 * @param {Object<string, Function>} classes Class map.
 * @returns {boolean} True when a constructor is present.
 */
function hasClasses(classes)
{
    return !!classes && Object.values(classes).some(Class => typeof Class === "function");
}

/**
 * Convert a value to a finite number.
 *
 * @param {unknown} value Value.
 * @param {string} feature Feature name for errors.
 * @returns {number} Number.
 * @throws {Error} When the value is not finite.
 */
function finiteNumber(value, feature)
{
    const number = Number(value);
    if (!Number.isFinite(number))
    {
        throw new Error(`fbx: ${feature} contains a non-finite number`);
    }
    return number;
}

/**
 * Convert a value to a finite integer.
 *
 * @param {unknown} value Value.
 * @param {string} feature Feature name for errors.
 * @returns {number} Integer.
 * @throws {Error} When the value is not a finite integer.
 */
function integerNumber(value, feature)
{
    const number = finiteNumber(value, feature);
    if (!Number.isInteger(number))
    {
        throw new Error(`fbx: ${feature} contains a non-integer value`);
    }
    return number;
}

/**
 * Check that a byte range lies within the bytes.
 *
 * @param {Uint8Array} bytes Bytes.
 * @param {number} offset Byte offset.
 * @param {number} length Byte length.
 * @param {string} message Error message.
 * @throws {Error} When the range runs past the end.
 */
function ensureRange(bytes, offset, length, message)
{
    if (offset + length > bytes.byteLength)
    {
        throw new Error(message);
    }
}

/**
 * Decode a UTF-8 string.
 *
 * @param {Uint8Array} bytes Bytes.
 * @param {number} offset Byte offset.
 * @param {number} length Byte length.
 * @returns {string} Decoded string.
 */
function readString(bytes, offset, length)
{
    ensureRange(bytes, offset, length, "fbx: string is truncated");
    return TEXT_DECODER.decode(bytes.subarray(offset, offset + length));
}

/**
 * Read an unsigned 32-bit little-endian integer.
 *
 * @param {Uint8Array} bytes Bytes.
 * @param {number} offset Byte offset.
 * @returns {number} Value.
 */
function readU32LE(bytes, offset)
{
    return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] * 0x1000000)) >>> 0;
}

/**
 * Read an unsigned 32-bit big-endian integer.
 *
 * @param {Uint8Array} bytes Bytes.
 * @param {number} offset Byte offset.
 * @returns {number} Value.
 */
function readU32BE(bytes, offset)
{
    return (((bytes[offset] << 24) >>> 0) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

/**
 * Read a signed 16-bit little-endian integer.
 *
 * @param {Uint8Array} bytes Bytes.
 * @param {number} offset Byte offset.
 * @returns {number} Value.
 */
function readI16LE(bytes, offset)
{
    const value = bytes[offset] | (bytes[offset + 1] << 8);
    return value & 0x8000 ? value - 0x10000 : value;
}

/**
 * Read a signed 32-bit little-endian integer.
 *
 * @param {Uint8Array} bytes Bytes.
 * @param {number} offset Byte offset.
 * @returns {number} Value.
 */
function readI32LE(bytes, offset)
{
    return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
}

/**
 * Read an unsigned 64-bit little-endian integer as a number.
 *
 * @param {Uint8Array} bytes Bytes.
 * @param {number} offset Byte offset.
 * @returns {number} Value; may exceed the safe integer range.
 */
function readU64LEAsNumber(bytes, offset)
{
    const low = readU32LE(bytes, offset);
    const high = readU32LE(bytes, offset + 4);
    return high * 0x100000000 + low;
}

/**
 * Read a signed 64-bit little-endian integer.
 *
 * @param {Uint8Array} bytes Bytes.
 * @param {number} offset Byte offset.
 * @returns {number|string} Number when safe, otherwise its decimal string.
 */
function readI64LEValue(bytes, offset)
{
    const
        low = BigInt(readU32LE(bytes, offset)),
        high = BigInt(readU32LE(bytes, offset + 4)),
        value = BigInt.asIntN(64, low | (high << 32n)),
        number = Number(value);

    return Number.isSafeInteger(number) ? number : value.toString();
}

/**
 * Read a little-endian float32.
 *
 * @param {Uint8Array} bytes Bytes.
 * @param {number} offset Byte offset.
 * @returns {number} Value.
 */
function readF32LE(bytes, offset)
{
    return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getFloat32(0, true);
}

/**
 * Read a little-endian float64.
 *
 * @param {Uint8Array} bytes Bytes.
 * @param {number} offset Byte offset.
 * @returns {number} Value.
 */
function readF64LE(bytes, offset)
{
    return new DataView(bytes.buffer, bytes.byteOffset + offset, 8).getFloat64(0, true);
}

CjsSchema.meta.define("DeflateBitReader")(DeflateBitReader);

CjsSchema.meta.define("DeflateHuffmanTable")(DeflateHuffmanTable);
