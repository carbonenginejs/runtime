import { toJsonAcyclic } from "../../../format/jsonPolicies.js";
import { readGr2Raw } from "./reader.js";
import { emitJson } from "./json.js";
import { projectShared, CLASS_KEYS as GR2_CLASS_KEYS } from "./shared.js";
import { tangents } from "./tangents.js";
import { decompressAnimationCurves } from "./curves.js";
import { buildCmfFromShared, CMF_CLASS_KEYS, reassembleGr2Lods } from "./targets.js";
import { hydrateCmf } from "../../cmf/core/utils/hydration.js";

/**
 * Context passed to a per-mesh rule function.
 *
 * @typedef {object} Gr2MeshRuleContext
 * @property {import("../CjsGr2Format.js").CjsGr2Format|typeof import("../CjsGr2Format.js").CjsGr2Format} reader
 *     Format instance or class that started the read.
 * @property {Gr2Values} options Effective read values.
 * @property {import("./reader.js").RawGr2ReadResult} raw Raw reflected read result.
 * @property {object} json Projected GR2 JSON or shared root.
 * @property {object} mesh Projected mesh record.
 * @property {number} meshIndex Index of `mesh` in `json.meshes`.
 * @property {string} feature Option name the rule belongs to.
 * @property {string} channel Vertex channel the feature fills.
 */

/**
 * A per-mesh switch: a fixed boolean or a function deciding per mesh.
 *
 * @typedef {boolean|function(Gr2MeshRuleContext): boolean} Gr2MeshRule
 */

/**
 * Normalized GR2 read values.
 *
 * @typedef {object} Gr2Values
 * @property {string} emit Output kind: "json", "gr2Json", "gr2", "cmf" or "raw".
 * @property {boolean} decompressCurves Add decoded knots and controls to compressed curves.
 * @property {Gr2MeshRule} unpackTangents Expand packed tangent frames.
 * @property {Gr2MeshRule} rebuildMissingNormals Generate absent normals.
 * @property {Gr2MeshRule} rebuildMissingTangents Generate absent tangents.
 * @property {Gr2MeshRule} rebuildMissingBiNormals Generate absent binormals.
 * @property {boolean} rebuildMissingBounds Compute absent mesh bounds.
 * @property {Object<string, Function>} classes Hydration constructors keyed by class key.
 */

/**
 * Explicit keyframe curve given to the curve compressor.
 *
 * @typedef {object} Gr2ExplicitCurve
 * @property {number[]} knots Non-decreasing, non-negative knot times.
 * @property {number[]} controls Control values, `knots.length * dimension` long.
 * @property {number} [degree] B-spline degree; missing reads as 0.
 */

/**
 * Curve record in a Granny curve-data format, as written to GR2.
 *
 * @typedef {object} Gr2PackedCurve
 * @property {number} format Granny curve-data format id.
 * @property {number} degree B-spline degree.
 * @property {number} [dimension] Control dimension, on identity curves.
 * @property {number[]} [knots] Float knots, on `DaK32fC32f` curves.
 * @property {number[]} [controls] Float controls, on uncompressed and constant curves.
 * @property {number} [oneOverKnotScaleTrunc] Truncated float32 high half of the knot scale.
 * @property {number} [oneOverKnotScale] Float knot scale, on `D4n` curves.
 * @property {number[]} [controlScaleOffsets] Per-component scales, then offsets, on `DaK` curves.
 * @property {number[]} [controlScales] Per-component scales.
 * @property {number[]} [controlOffsets] Per-component offsets.
 * @property {number} [scaleOffsetTableEntries] Packed 4-bit `D4n` table selectors.
 * @property {number[]} [knotsControls] Quantized knots followed by quantized controls.
 */

/**
 * One member definition of a reflected Granny type built for the writer.
 *
 * @typedef {object} Gr2WriterMember
 * @property {number} type Granny member type id (`GRANNY_MEMBER_TYPES`).
 * @property {string} name Member name.
 * @property {Gr2WriterType|null} ref Referenced or inline type, or null.
 * @property {number} arrayWidth Fixed array width; 0 for a scalar.
 */

/**
 * Reflected Granny type built for the writer by `gr2Type`.
 *
 * @typedef {object} Gr2WriterType
 * @property {string} name Type name.
 * @property {Gr2WriterMember[]} members Member definitions, in layout order.
 */

/**
 * Dynamic value tagged with its reflected type by `gr2Variant`.
 *
 * @typedef {object} Gr2WriterVariant
 * @property {Gr2WriterType} type Reflected type of `value`.
 * @property {*} value Object, or array for variant arrays.
 */

/**
 * Validated GR2 writer options.
 *
 * @typedef {object} Gr2WriterOptions
 * @property {"preserve"|"packed"|"unpacked"} tangentMode Tangent layout to write.
 * @property {"none"|"bitknit2Raw"} sectionCompression Section and fixup storage.
 * @property {boolean} compressedCurves False writes float knot/control curves.
 * @property {number|undefined} tolerance Scalar/general curve error.
 * @property {number|undefined} positionTolerance Position curve error.
 * @property {number|undefined} orientationTolerance Orientation curve angular error.
 * @property {number|undefined} scaleShearTolerance Scale/shear curve error.
 * @property {string} sourceName Value written to `FromFileName`.
 */

/**
 * Lightweight GR2 summary.
 *
 * @typedef {object} Gr2Inspection
 * @property {string} reader Always "CjsGr2Format".
 * @property {string} format Always "gr2".
 * @property {number} version Granny file format revision.
 * @property {number} sectionCount Number of sections.
 * @property {string} source Original source filename, or an empty string.
 * @property {{meshes: number, models: number, animations: number, materials: number, textures: number}} counts
 *     Non-null entry counts per top-level array.
 */

/**
 * Projected Granny State document.
 *
 * @typedef {object} GsfDocument
 * @property {string} format Always "gsf".
 * @property {{family: string, revision: number, sectionCount: number}} container Container summary.
 * @property {{modelNameHint: string|null, modelIndexHint: number, retargetSourceModelNameHint: string|null,
 *     retargetSourceModelIndexHint: number}} character Model and retarget hints.
 * @property {object} stateMachine Reflected state machine.
 * @property {object[]} animationSlots Reflected animation slots.
 * @property {{index: number, sourceFileReferences: string[], raw: object}[]} animationSets Animation sets with
 *     their referenced `.gr2` files.
 * @property {number} uniqueTokenCount Number of unique tokenized values.
 * @property {object|null} editorData Reflected editor data.
 * @property {object|null} extendedData Reflected extended data.
 */

/**
 * Lightweight GSF support and dependency summary.
 *
 * @typedef {object} GsfInspection
 * @property {string} format Always "gsf".
 * @property {boolean} supported Always true.
 * @property {number} revision Container revision.
 * @property {number} sectionCount Number of sections.
 * @property {number} animationSlotCount Number of animation slots.
 * @property {number} animationSetCount Number of animation sets.
 * @property {string[]} animationFileReferences Unique referenced `.gr2` files.
 */

export const CLASS_KEYS = Array.from(new Set([
    ...GR2_CLASS_KEYS,
    ...CMF_CLASS_KEYS
]));

export const OUTPUT_JSON = "json";
export const OUTPUT_GR2 = "gr2";
export const OUTPUT_GR2_JSON = "gr2Json";
export const OUTPUT_CMF = "cmf";
export const OUTPUT_RAW = "raw";

export const DEFAULT_VALUES = {
    emit: OUTPUT_JSON,
    decompressCurves: false,
    unpackTangents: false,
    rebuildMissingNormals: false,
    rebuildMissingTangents: false,
    rebuildMissingBiNormals: false,
    rebuildMissingBounds: false,
    classes: {}
};

const OPTION_KEYS = new Set([
    "emit",
    "decompressCurves",
    "unpackTangents",
    "rebuildMissingNormals",
    "rebuildMissingTangents",
    "rebuildMissingBiNormals",
    "rebuildMissingBounds",
    "classes"
]);

/**
 * Validate an `emit` option value.
 *
 * @param {string|undefined} emit Requested output kind.
 * @returns {string} The output kind, "json" when undefined.
 * @throws {Error} When the value is not a known output kind.
 */
function normalizeEmit(emit)
{
    if (emit === undefined || emit === OUTPUT_JSON) return OUTPUT_JSON;
    if (emit === OUTPUT_GR2_JSON) return OUTPUT_GR2_JSON;
    if (emit === OUTPUT_GR2) return OUTPUT_GR2;
    if (emit === OUTPUT_CMF) return OUTPUT_CMF;
    if (emit === OUTPUT_RAW) return OUTPUT_RAW;
    throw new Error(`CjsGr2Format unknown emit value "${emit}"`);
}

/**
 * Read the class map from a values object.
 *
 * @param {Gr2Values} values Read values.
 * @returns {Object<string, Function>} The class map, or an empty object.
 */
function classMap(values)
{
    return values && values.classes ? values.classes : {};
}

/**
 * Copy a values object, including a shallow copy of its class map.
 *
 * @param {Gr2Values} values Read values.
 * @returns {Gr2Values} The copy.
 */
function cloneValues(values)
{
    return {
        emit: values.emit,
        decompressCurves: values.decompressCurves,
        unpackTangents: values.unpackTangents,
        rebuildMissingNormals: values.rebuildMissingNormals,
        rebuildMissingTangents: values.rebuildMissingTangents,
        rebuildMissingBiNormals: values.rebuildMissingBiNormals,
        rebuildMissingBounds: values.rebuildMissingBounds,
        classes: { ...classMap(values) }
    };
}

/**
 * Reject option keys the GR2 reader does not know.
 *
 * @param {object} options Caller options.
 * @throws {TypeError} When an option key is unknown.
 */
function assertKnownOptions(options)
{
    for (const key of Object.keys(options))
    {
        if (!OPTION_KEYS.has(key))
        {
            throw new TypeError(`CjsGr2Format unknown option "${key}"`);
        }
    }
}

/**
 * Require a boolean option value.
 *
 * @param {string} name Option name, used in the error.
 * @param {*} value Option value.
 * @returns {boolean} The value.
 * @throws {TypeError} When the value is not a boolean.
 */
function validateBoolean(name, value)
{
    if (typeof value !== "boolean")
    {
        throw new TypeError(`CjsGr2Format ${name} option must be true or false`);
    }
    return value;
}

/**
 * Require a per-mesh rule: a boolean or a function.
 *
 * @param {string} name Option name, used in the error.
 * @param {*} value Option value.
 * @returns {Gr2MeshRule} The value.
 * @throws {TypeError} When the value is neither a boolean nor a function.
 */
function validateRule(name, value)
{
    if (typeof value === "boolean" || typeof value === "function") return value;
    throw new TypeError(`CjsGr2Format ${name} option must be true, false, or a function`);
}

/**
 * Validates a requested runtime class key for the GR2 format reader.
 *
 * @param {string} key Class key to check against `CLASS_KEYS`.
 * @throws {Error} When the key is unknown.
 */
export function validateClassKey(key)
{
    if (!CLASS_KEYS.includes(key))
    {
        throw new Error(`CjsGr2Format unknown class type "${key}"`);
    }
}

/**
 * Validates a resolved runtime class constructor for the GR2 format reader.
 *
 * @param {string} type Class key.
 * @param {*} Class Constructor registered for the key.
 * @throws {Error} When the key is unknown.
 * @throws {TypeError} When `Class` is not a function.
 */
export function validateClass(type, Class)
{
    validateClassKey(type);
    if (typeof Class !== "function")
    {
        throw new TypeError(`CjsGr2Format class "${type}" must be a constructor`);
    }
}

/**
 * Merge validated constructors into a values object's class map.
 *
 * @param {Gr2Values} values Values to update in place.
 * @param {Object<string, Function>} classes Constructors keyed by class key.
 * @throws {TypeError} When `classes` is not an object.
 */
function mergeClasses(values, classes)
{
    if (!classes || typeof classes !== "object")
    {
        throw new TypeError("CjsGr2Format classes option must be an object");
    }

    const next = { ...values.classes };
    for (const [ type, Class ] of Object.entries(classes))
    {
        validateClass(type, Class);
        next[type] = Class;
    }
    values.classes = next;
}

/**
 * Return the value of the first own key present in the options.
 *
 * @param {object} options Caller options.
 * @param {string[]} keys Keys to look up, in order.
 * @returns {*} The first present value, or undefined.
 */
function optionValue(options, keys)
{
    for (const key of keys)
    {
        if (Object.hasOwn(options, key)) return options[key];
    }
    return undefined;
}

/**
 * Normalizes reader options against their supported defaults for the GR2 format
 * reader.
 *
 * @param {Gr2Values} [base=DEFAULT_VALUES] Values to start from.
 * @param {object} [options] Overrides to validate and apply.
 * @param {string} [options.emit] Output kind.
 * @param {boolean} [options.decompressCurves] Add decoded curve data.
 * @param {Gr2MeshRule} [options.unpackTangents] Expand packed tangent frames.
 * @param {Gr2MeshRule} [options.rebuildMissingNormals] Generate absent normals.
 * @param {Gr2MeshRule} [options.rebuildMissingTangents] Generate absent tangents.
 * @param {Gr2MeshRule} [options.rebuildMissingBiNormals] Generate absent binormals.
 * @param {boolean} [options.rebuildMissingBounds] Compute absent mesh bounds.
 * @param {Object<string, Function>} [options.classes] Constructors to merge into the class map.
 * @returns {Gr2Values} A new values object.
 * @throws {TypeError} When an option is unknown or invalid, or "gr2"/"cmf" output has no classes.
 * @throws {Error} When `emit` or a class key is unknown.
 */
export function normalizeValues(base = DEFAULT_VALUES, options = {})
{
    if (!options || typeof options !== "object")
    {
        throw new TypeError("CjsGr2Format options must be an object");
    }

    assertKnownOptions(options);

    const values = cloneValues(base);

    if (Object.hasOwn(options, "emit")) values.emit = normalizeEmit(options.emit);
    if (Object.hasOwn(options, "decompressCurves"))
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

    const rebuildMissingBounds = optionValue(options, [ "rebuildMissingBounds" ]);
    if (rebuildMissingBounds !== undefined)
    {
        if (typeof rebuildMissingBounds !== "boolean")
        {
            throw new TypeError("CjsGr2Format rebuildMissingBounds option must be true or false");
        }
        values.rebuildMissingBounds = rebuildMissingBounds;
    }

    if (Object.hasOwn(options, "classes"))
    {
        mergeClasses(values, options.classes);
    }

    if ((values.emit === OUTPUT_GR2 || values.emit === OUTPUT_CMF) && !hasClasses(values.classes))
    {
        throw new TypeError(`CjsGr2Format emit "${values.emit}" requires explicit classes`);
    }

    return values;
}

/**
 * Whether a class map holds at least one constructor.
 *
 * @param {Object<string, Function>} classes Class map.
 * @returns {boolean} True when any value is a function.
 */
function hasClasses(classes)
{
    return !!classes && Object.values(classes).some((Class) => typeof Class === "function");
}

/**
 * Whether a value is already a raw reflected read result.
 *
 * @param {*} value Candidate input.
 * @returns {boolean} True when it has `fileInfo` and a numeric `version`.
 */
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
    throw new TypeError("CjsGr2Format: input must be GR2 bytes (Uint8Array, Buffer, DataView or ArrayBuffer)");
}

/**
 * Reads and validates raw input bytes for the GR2 format reader.
 *
 * @param {Uint8Array|ArrayBuffer|DataView|import("./reader.js").RawGr2ReadResult} input GR2 bytes, or an
 *     existing raw read result returned unchanged.
 * @returns {import("./reader.js").RawGr2ReadResult} The raw reflected read result.
 */
export function readRawInput(input)
{
    return isRawGr2Result(input) ? input : readGr2Raw(toBytes(input));
}

/**
 * Format a mesh's name, or its index, for error messages.
 *
 * @param {object} mesh Projected mesh record.
 * @param {number} meshIndex Mesh index.
 * @returns {string} The quoted name, or `#index`.
 */
function meshName(mesh, meshIndex)
{
    return mesh && mesh.name ? `"${mesh.name}"` : `#${meshIndex}`;
}

/**
 * Read one vertex channel from a projected mesh.
 *
 * @param {object} mesh Projected mesh record.
 * @param {string} channel Vertex channel name.
 * @returns {Float32Array|number[]|undefined} The channel, or a falsy value when absent.
 */
function vertexChannel(mesh, channel)
{
    return mesh && mesh.vertex && mesh.vertex[channel];
}

/**
 * Whether a projected mesh has a non-empty vertex channel.
 *
 * @param {object} mesh Projected mesh record.
 * @param {string} channel Vertex channel name.
 * @returns {boolean} True when the channel holds data.
 */
function hasVertexChannel(mesh, channel)
{
    const value = vertexChannel(mesh, channel);
    return !!value && value.length > 0;
}

/**
 * Read a vertex channel that a feature requires.
 *
 * @param {object} mesh Projected mesh record.
 * @param {number} meshIndex Mesh index, used in the error.
 * @param {string} channel Vertex channel name.
 * @param {string} feature Feature name, used in the error.
 * @returns {Float32Array|number[]} The channel.
 * @throws {Error} When the channel is absent or empty.
 */
function requireVertexChannel(mesh, meshIndex, channel, feature)
{
    const value = vertexChannel(mesh, channel);
    if (!value || value.length === 0)
    {
        throw new Error(`CjsGr2Format ${feature} requires mesh.vertex.${channel} for mesh ${meshName(mesh, meshIndex)}`);
    }
    return value;
}

/**
 * Concatenate the face indices of every index group in a mesh.
 *
 * @param {object} mesh Projected mesh record.
 * @param {number} meshIndex Mesh index, used in the error.
 * @param {string} feature Feature name, used in the error.
 * @returns {number[]} Triangle vertex indices.
 * @throws {Error} When the mesh has no face indices.
 */
function triangleFaces(mesh, meshIndex, feature)
{
    const faces = [];
    for (const group of mesh.indices || [])
    {
        for (const index of group?.faces ?? [])
        {
            faces.push(index);
        }
    }

    if (faces.length === 0)
    {
        throw new Error(`CjsGr2Format ${feature} requires triangle indices for mesh ${meshName(mesh, meshIndex)}`);
    }

    return faces;
}

/**
 * Resolve a per-mesh rule for one mesh.
 *
 * @param {Gr2MeshRuleContext["reader"]} reader Format instance or class that started the read.
 * @param {Gr2MeshRule} rule Boolean or rule function.
 * @param {object} context Rule context without `reader`.
 * @returns {boolean} Whether the feature applies to the mesh.
 * @throws {TypeError} When a rule function does not return a boolean.
 */
function shouldApplyMeshRule(reader, rule, context)
{
    const fullContext = { reader, ...context };

    if (typeof rule === "function")
    {
        const result = rule(fullContext);
        if (typeof result !== "boolean")
        {
            throw new TypeError(`CjsGr2Format ${context.feature} rule must return true or false`);
        }
        return result;
    }

    return rule;
}

/**
 * Expand packed tangent frames on each mesh, and its morph targets, the rule selects.
 *
 * @param {Gr2MeshRuleContext["reader"]} reader Format instance or class that started the read.
 * @param {object} json Projected root; meshes are changed in place.
 * @param {import("./reader.js").RawGr2ReadResult} raw Raw reflected read result.
 * @param {Gr2Values} values Effective read values.
 */
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
            for (const target of mesh.morphTargets ?? [])
            {
                const
                    indices = target.vertexIndices ?? [],
                    positions = target.vertex?.position ?? [],
                    count = indices.length || Math.floor(positions.length / 3) ||
                        Math.floor((mesh.vertex?.position ?? []).length / 3);
                tangents.unpack({ vertex: target.vertex }, count);
            }
        }
    }
}

/**
 * Generate a mesh's normal channel from its positions and faces.
 *
 * @param {object} mesh Projected mesh record, changed in place.
 * @param {number} meshIndex Mesh index, used in errors.
 */
function rebuildMeshNormals(mesh, meshIndex)
{
    const
        positions = requireVertexChannel(mesh, meshIndex, "position", "rebuildMissingNormals"),
        faces = triangleFaces(mesh, meshIndex, "rebuildMissingNormals");

    mesh.vertex.normal = Array.from(tangents.generateNormals(positions, faces));
}

/**
 * Generate a mesh's tangent channel from positions, normals, texcoord0 and faces.
 *
 * @param {object} mesh Projected mesh record, changed in place.
 * @param {number} meshIndex Mesh index, used in errors.
 */
function rebuildMeshTangents(mesh, meshIndex)
{
    const
        positions = requireVertexChannel(mesh, meshIndex, "position", "rebuildMissingTangents"),
        normals = requireVertexChannel(mesh, meshIndex, "normal", "rebuildMissingTangents"),
        uvs = requireVertexChannel(mesh, meshIndex, "texcoord0", "rebuildMissingTangents"),
        faces = triangleFaces(mesh, meshIndex, "rebuildMissingTangents");

    mesh.vertex.tangent = Array.from(tangents.generateTangents(positions, normals, uvs, faces).tangents);
}

/**
 * Generate a mesh's binormal channel from its normals and tangents.
 *
 * @param {object} mesh Projected mesh record, changed in place.
 * @param {number} meshIndex Mesh index, used in errors.
 */
function rebuildMeshBiNormals(mesh, meshIndex)
{
    const
        normals = requireVertexChannel(mesh, meshIndex, "normal", "rebuildMissingBiNormals"),
        tangentValues = requireVertexChannel(mesh, meshIndex, "tangent", "rebuildMissingBiNormals");

    mesh.vertex.binormal = tangents.generateBiNormals(normals, tangentValues);
}

/**
 * Generate absent normal, tangent and binormal channels where the rules select.
 *
 * @param {Gr2MeshRuleContext["reader"]} reader Format instance or class that started the read.
 * @param {object} json Projected root; meshes are changed in place.
 * @param {import("./reader.js").RawGr2ReadResult} raw Raw reflected read result.
 * @param {Gr2Values} values Effective read values.
 */
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

/**
 * Apply tangent unpacking, then missing-channel rebuilds, to the projected meshes.
 *
 * @param {Gr2MeshRuleContext["reader"]} reader Format instance or class that started the read.
 * @param {object} json Projected root; meshes are changed in place.
 * @param {import("./reader.js").RawGr2ReadResult} raw Raw reflected read result.
 * @param {Gr2Values} values Effective read values.
 */
function processMeshData(reader, json, raw, values)
{
    unpackMeshTangents(reader, json, raw, values);
    rebuildMissingMeshData(reader, json, raw, values);
}

/**
 * Apply curve decompression and mesh processing to a projection.
 *
 * @param {Gr2MeshRuleContext["reader"]} reader Format instance or class that started the read.
 * @param {object} projected Projected root, changed in place.
 * @param {import("./reader.js").RawGr2ReadResult} raw Raw reflected read result.
 * @param {Gr2Values} values Effective read values.
 * @returns {object} The same projection.
 */
function finishProjection(reader, projected, raw, values)
{
    if (values.decompressCurves)
    {
        decompressAnimationCurves(projected);
    }

    processMeshData(reader, projected, raw, values);
    return projected;
}

/**
 * Build the GR2 JSON output, hydrated with classes when configured.
 *
 * @param {Gr2MeshRuleContext["reader"]} reader Format instance or class that started the read.
 * @param {import("./reader.js").RawGr2ReadResult} raw Raw reflected read result.
 * @param {Gr2Values} values Effective read values.
 * @returns {object} The GR2 JSON root, or a hydrated root instance.
 */
function buildJson(reader, raw, values)
{
    return finishProjection(reader, emitJson(raw.fileInfo, raw.version, {
        classes: values.emit === OUTPUT_GR2 || ((values.emit === OUTPUT_JSON || values.emit === OUTPUT_GR2_JSON) && hasClasses(values.classes))
            ? values.classes
            : {},
        rebuildMissingBounds: values.rebuildMissingBounds
    }), raw, values);
}

/**
 * Build the CMF output from the shared projection and hydrate it with classes.
 *
 * @param {Gr2MeshRuleContext["reader"]} reader Format instance or class that started the read.
 * @param {import("./reader.js").RawGr2ReadResult} raw Raw reflected read result.
 * @param {Gr2Values} values Effective read values.
 * @returns {object} The hydrated CMF graph.
 */
function buildCmf(reader, raw, values)
{
    const shared = finishProjection(
        reader,
        projectShared(raw.fileInfo, raw.version, { rebuildMissingBounds: values.rebuildMissingBounds }),
        raw,
        values
    );
    // GR2 forwards no hydration source, unlike CMF: its options never accepted one.
    return hydrateCmf(
        buildCmfFromShared(reassembleGr2Lods(shared)),
        values.classes,
        {},
        "CjsGr2Format CMF"
    );
}

/**
 * Reads input using normalized format options for the GR2 format reader.
 *
 * @param {Gr2MeshRuleContext["reader"]} reader Format instance or class that started the read.
 * @param {Uint8Array|ArrayBuffer|DataView|import("./reader.js").RawGr2ReadResult} input GR2 bytes or a raw
 *     read result.
 * @param {Gr2Values} values Normalized read values.
 * @returns {object} The raw read result, the GR2 JSON root or the CMF graph, per `values.emit`.
 */
export function readWithValues(reader, input, values)
{
    const parsed = readRawInput(input);
    if (values.emit === OUTPUT_RAW) return parsed;
    if (values.emit === OUTPUT_CMF) return buildCmf(reader, parsed, values);
    return buildJson(reader, parsed, values);
}

/**
 * Convert to JSON, refusing a cycle, naming this reader in the error.
 *
 * @param {*} value Any decoded value.
 * @returns {*} A JSON-safe value.
 */
export function toJsonValue(value)
{
    return toJsonAcyclic(value, "CjsGr2Format");
}

/**
 * Inspects raw GR2 result without materializing the full GR2 format reader
 * payload.
 *
 * @param {import("./reader.js").RawGr2ReadResult} parsed Raw reflected read result.
 * @returns {Gr2Inspection} Version, section count, source and top-level counts.
 */
export function inspectRawGr2Result(parsed)
{
    const
        fileInfo = parsed.fileInfo || {},
        count = value => Array.isArray(value) ? value.filter(Boolean).length : 0;

    return {
        reader: "CjsGr2Format",
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
