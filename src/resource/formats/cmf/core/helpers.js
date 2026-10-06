import { CLASS_KEYS, OUTPUT_CMF, OUTPUT_CMF_JSON, OUTPUT_GR2, OUTPUT_JSON, OUTPUT_NATIVE, OUTPUT_RAW, OUTPUT_SHARED } from "./constants.js";
import { inspectCmf, readCmf } from "./schema.js";
import { buildCmfFromShared, buildSharedFromCmf } from "./shared.js";
import { buildGr2Animations, buildGr2Models } from "./gr2Compat.js";
import { hydrateCmf } from "./utils/hydration.js";
import { validateCmfGraph } from "./validate.js";

export { CLASS_KEYS, OUTPUT_CMF, OUTPUT_CMF_JSON, OUTPUT_GR2, OUTPUT_JSON, OUTPUT_NATIVE, OUTPUT_RAW, OUTPUT_SHARED };

/**
 * Axis-aligned bounds.
 *
 * @typedef {object} CmfBounds
 * @property {ArrayLike<number>} min Minimum corner (x, y, z).
 * @property {ArrayLike<number>} max Maximum corner (x, y, z).
 */

/**
 * One header section record.
 *
 * @typedef {object} CmfSection
 * @property {number} offset File byte offset.
 * @property {number} compressedSize Stored byte size.
 * @property {number} uncompressedSize Decoded byte size.
 * @property {number} gpuAlignment GPU element stride, or 0.
 * @property {string} type SectionType name.
 * @property {string} compression SectionCompression name.
 */

/**
 * Parsed file header.
 *
 * @typedef {object} CmfHeader
 * @property {number} signature File signature.
 * @property {string} signatureText Signature as text.
 * @property {number} version File version.
 * @property {number} headerSize Header byte size, including the section table.
 * @property {number} crc32 Stored checksum.
 * @property {Array<CmfSection>} sections Section table.
 */

/**
 * A resolved tagged span field.
 *
 * @typedef {object} CmfSpan
 * @property {number|null} offset Absolute data offset, or null when empty.
 * @property {number} byteSize Byte size.
 * @property {number} count Element count.
 * @property {number} elementSize Element byte size.
 * @property {string} addressMode "empty", "offset" or "pointer".
 */

/**
 * One vertex declaration element.
 *
 * @typedef {object} CmfVertexElement
 * @property {string} usage Usage name.
 * @property {number} usageIndex Usage index.
 * @property {string} type ElementType name.
 * @property {number} elementCount Component count, 1..4.
 * @property {number} offset Byte offset within the vertex.
 */

/**
 * A view into one GPU buffer section.
 *
 * @typedef {object} CmfBufferView
 * @property {number} index Section or supplied buffer index.
 * @property {number} offset Byte offset.
 * @property {number} size Byte size.
 * @property {number} stride Element stride in bytes.
 */

/**
 * Deinterleaved vertex channels keyed by channel name (`position`,
 * `texcoord0`, `blendIndice`, ...).
 *
 * @typedef {Object<string, ArrayLike<number>>} CmfVertexChannels
 */

/**
 * A decoded index group.
 *
 * @typedef {object} CmfIndexGroup
 * @property {string} name Area name.
 * @property {number} bytesPerIndex Index width in bytes; 0 for point lists.
 * @property {Array<number>} faces Indices.
 * @property {number} [firstElement] First triangle or point.
 * @property {number} [elementCount] Triangle or point count.
 * @property {number} [pointCount] Point count for point lists.
 */

/**
 * One LOD range of a mesh area.
 *
 * @typedef {object} CmfLodMeshArea
 * @property {number} firstElement First triangle or point.
 * @property {number} elementCount Triangle or point count.
 */

/**
 * One LOD's morph target buffer.
 *
 * @typedef {object} CmfLodMorphTarget
 * @property {CmfBufferView} vb Morph vertex buffer view.
 * @property {CmfVertexChannels} [vertex] Decoded morph channels.
 * @property {string} [name] Morph target name, attached on decode.
 * @property {number} [maxDisplacement] Maximum displacement, attached on decode.
 */

/**
 * One mesh LOD.
 *
 * @typedef {object} CmfMeshLod
 * @property {CmfBufferView} vb Vertex buffer view.
 * @property {CmfBufferView} ib Index buffer view.
 * @property {Array<CmfLodMeshArea>} areas Area ranges.
 * @property {Array<CmfLodMorphTarget>} morphTargets Morph target buffers.
 * @property {number} threshold LOD threshold.
 * @property {CmfVertexChannels} [vertex] Decoded vertex channels.
 * @property {Array<CmfIndexGroup>} [indices] Decoded index groups.
 */

/**
 * One mesh area.
 *
 * @typedef {object} CmfMeshArea
 * @property {string} name Area name.
 * @property {CmfBounds} bounds Area bounds.
 * @property {Array<number>} bones Bone binding indices used by the area.
 * @property {boolean} affectedByBones Whether bones move the area.
 * @property {boolean} affectedByMorphTargets Whether morph targets move the area.
 */

/**
 * One mesh bone binding.
 *
 * @typedef {object} CmfBoneBinding
 * @property {string} name Bone name.
 * @property {CmfBounds} bounds Bounds of the vertices bound to the bone.
 */

/**
 * One morph target record.
 *
 * @typedef {object} CmfMorphTarget
 * @property {string} name Target name.
 * @property {number} maxDisplacement Maximum vertex displacement.
 */

/**
 * A mesh's morph target set.
 *
 * @typedef {object} CmfMorphTargets
 * @property {Array<CmfVertexElement>} decl Morph vertex declaration.
 * @property {Array<CmfMorphTarget>} targets Target records.
 */

/**
 * A mesh's audio occlusion mesh.
 *
 * @typedef {object} CmfAudioOcclusionMesh
 * @property {Array<ArrayLike<number>>} vertices Vertex positions.
 * @property {Array<number>} indices Triangle indices.
 * @property {CmfBounds} bounds Bounds.
 */

/**
 * One CMF mesh.
 *
 * @typedef {object} CmfMesh
 * @property {string} name Mesh name.
 * @property {Array<CmfVertexElement>} decl Vertex declaration.
 * @property {Array<CmfMeshLod>} lods LODs.
 * @property {Array<CmfMeshArea>} areas Areas.
 * @property {Array<CmfBoneBinding>} boneBindings Bone bindings.
 * @property {CmfMorphTargets} morphTargets Morph target set.
 * @property {ArrayLike<number>} uvDensities One density per UV set.
 * @property {CmfBounds} bounds Mesh bounds.
 * @property {CmfAudioOcclusionMesh} audioOcclusionMesh Audio occlusion mesh.
 * @property {string} topology MeshTopology name.
 * @property {number|null} skeleton Skeleton index, or null.
 * @property {CmfVertexChannels} [vertex] First LOD's decoded vertex channels.
 * @property {Array<CmfIndexGroup>} [indices] First LOD's decoded index groups.
 */

/**
 * A bone rest transform.
 *
 * @typedef {object} CmfTransform
 * @property {ArrayLike<number>} position Translation (x, y, z).
 * @property {ArrayLike<number>} rotation Rotation quaternion (x, y, z, w).
 * @property {ArrayLike<number>} scale Scale (x, y, z).
 */

/**
 * One bone mask weight.
 *
 * @typedef {object} CmfBoneWeight
 * @property {number} index Bone index.
 * @property {number} weight Weight, 0..1.
 */

/**
 * One bone mask.
 *
 * @typedef {object} CmfBoneMask
 * @property {string} name Mask name.
 * @property {Array<CmfBoneWeight>} weights Bone weights.
 */

/**
 * One CMF skeleton.
 *
 * @typedef {object} CmfSkeleton
 * @property {string} name Skeleton name.
 * @property {Array<string>} bones Bone names.
 * @property {ArrayLike<number>} parents Parent bone indices; 0xffffffff for roots.
 * @property {Array<CmfTransform>} restTransforms Rest transforms.
 * @property {Array<ArrayLike<number>>} invBindTransforms Inverse bind matrices, 16 values each.
 * @property {Array<CmfBoneMask>} boneMasks Bone masks.
 */

/**
 * One animation channel.
 *
 * @typedef {object} CmfAnimationChannel
 * @property {string} target Bone or morph target name.
 * @property {string} targetType AnimationChannelTargetType name.
 * @property {number} curveIndex Curve index within the animation.
 */

/**
 * One animation curve with tagged byte payloads.
 *
 * @typedef {object} CmfAnimationCurve
 * @property {number} valueDimension Components per value.
 * @property {string} interpolation Interpolation name.
 * @property {string} knotType ElementType name of the knots.
 * @property {string} valueType ElementType name of the values.
 * @property {number} knotCount Knot count.
 * @property {ArrayLike<number>} knots Knot bytes.
 * @property {ArrayLike<number>} values Value bytes.
 */

/**
 * An animation curve decoded to plain Float32 knots and values.
 *
 * @typedef {object} CmfDecodedCurve
 * @property {number} dimension Components per value.
 * @property {string} interpolation Interpolation name.
 * @property {Float32Array} knots Knot times.
 * @property {Float32Array} values Values.
 */

/**
 * One CMF animation.
 *
 * @typedef {object} CmfAnimation
 * @property {string} name Animation name.
 * @property {Array<CmfAnimationChannel>} channels Channels.
 * @property {Array<CmfAnimationCurve>} curves Curves.
 * @property {number} duration Duration.
 */

/**
 * One metadata entry.
 *
 * @typedef {object} CmfMetadataEntry
 * @property {string} key Key.
 * @property {string} value Value.
 */

/**
 * The metadata section.
 *
 * @typedef {object} CmfMetadata
 * @property {Array<CmfMetadataEntry>} entries Entries.
 */

/**
 * One decoded or supplied GPU buffer.
 *
 * @typedef {object} CmfBufferRecord
 * @property {number} index Buffer index.
 * @property {string} [type] SectionType name.
 * @property {string} [compression] SectionCompression name.
 * @property {number} [byteLength] Decoded byte length.
 * @property {Uint8Array|null} data Uncompressed bytes.
 */

/**
 * A CMF-native graph, as read from a file or built for writing.
 *
 * @typedef {object} CmfGraph
 * @property {number} [signature] File signature.
 * @property {number} version File version.
 * @property {number} [headerSize] Header byte size.
 * @property {number} [crc32] Stored checksum.
 * @property {Array<CmfSection>} [sections] Section table.
 * @property {CmfMetadata|null} metadata Metadata, or null.
 * @property {Array<CmfMesh>} meshes Meshes.
 * @property {Array<CmfSkeleton>} skeletons Skeletons.
 * @property {Array<CmfAnimation>} animations Animations.
 * @property {Array<CmfBufferRecord|null>} [buffers] Decoded or supplied GPU buffers.
 */

/**
 * Validation context.
 *
 * @typedef {object} CmfValidateOptions
 * @property {"read"|"write"} [phase] Selects the error prefix and code.
 */

/**
 * Caller-supplied constructors keyed by CMF or GR2 class key.
 *
 * @typedef {Object<string, Function>} CmfClasses
 */

/**
 * Values forwarded to hydrated classes' SetValues.
 *
 * @typedef {object} CmfHydrationOptions
 * @property {string} [source] Source resource path.
 */

/**
 * Normalized CMF reader values.
 *
 * @typedef {object} CmfValues
 * @property {string} emit Output to emit.
 * @property {boolean} validateCrc Whether to check the file checksum.
 * @property {boolean} decodeBuffers Whether to decode GPU buffers.
 * @property {CmfClasses} classes Constructors used for hydration.
 * @property {string} [source] Source resource path.
 */

export const DEFAULT_VALUES = {
    emit: OUTPUT_CMF,
    validateCrc: true,
    decodeBuffers: true,
    classes: {}
};

/**
 * Normalizes reader options against their supported defaults for the CMF format
 * reader.
 *
 * @param {object} [base={}] Base values.
 * @param {string} [base.emit] Output to emit.
 * @param {CmfClasses} [base.classes] Constructors used for hydration.
 * @param {object} [options={}] Values merged over the base.
 * @param {string} [options.emit] Output to emit.
 * @param {boolean} [options.validateCrc] Whether to check the file checksum.
 * @param {boolean} [options.decodeBuffers] Whether to decode GPU buffers.
 * @param {CmfClasses} [options.classes] Constructors used for hydration.
 * @returns {CmfValues} The normalized values.
 * @throws {TypeError} When `emit` is "gr2" without classes.
 */
export function normalizeValues(base = {}, options = {})
{
    const values = {
        ...DEFAULT_VALUES,
        ...base,
        ...options,
        classes: {
            ...(base.classes ?? {}),
            ...(options.classes ?? {})
        }
    };

    values.emit = normalizeEmit(values.emit);
    if (values.emit === OUTPUT_GR2 && !hasClasses(values.classes))
    {
        throw new TypeError("CMF emit \"gr2\" requires explicit classes");
    }

    validateClasses(values.classes);
    values.decodeBuffers = !!values.decodeBuffers;
    return values;
}

/**
 * Maps an emit value and its aliases to a supported output name.
 *
 * @param {string|undefined} emit Requested output.
 * @returns {string} The supported output name.
 * @throws {TypeError} When the output is not supported.
 */
function normalizeEmit(emit)
{
    if (emit === undefined || emit === OUTPUT_CMF || emit === OUTPUT_CMF_JSON || emit === OUTPUT_JSON)
    {
        return OUTPUT_CMF;
    }
    if (emit === OUTPUT_GR2 || emit === OUTPUT_RAW || emit === OUTPUT_SHARED) return emit;
    throw new TypeError(`CMF emit must be "${OUTPUT_CMF}", "${OUTPUT_CMF_JSON}", "${OUTPUT_GR2}", "${OUTPUT_SHARED}", or "${OUTPUT_RAW}"`);
}

/**
 * Tests whether a class map holds at least one constructor.
 *
 * @param {CmfClasses} classes Class map.
 * @returns {boolean} True when any entry is a function.
 */
function hasClasses(classes)
{
    return !!classes && Object.values(classes).some((Class) => typeof Class === "function");
}

/**
 * Reads and validates raw input bytes for the CMF format reader.
 *
 * @param {Uint8Array|ArrayBuffer|ArrayBufferView|CmfGraph} input File bytes, or an existing raw graph.
 * @param {object} [options={}] Reader values.
 * @param {boolean} [options.validateCrc] Whether to check the file checksum.
 * @param {boolean} [options.decodeBuffers] Whether to decode GPU buffers.
 * @returns {CmfGraph} The validated raw graph.
 */
export function readRawInput(input, options = {})
{
    if (input && typeof input === "object" && Array.isArray(input.sections) && Array.isArray(input.meshes))
    {
        return validateCmfGraph(input, { phase: "read" });
    }

    return readCmf(input, options);
}

/**
 * Reads and validates raw input bytes asynchronously for the CMF format reader.
 *
 * @param {Uint8Array|ArrayBuffer|ArrayBufferView|CmfGraph} input File bytes, or an existing raw graph.
 * @param {object} [options={}] Reader values.
 * @param {boolean} [options.validateCrc] Whether to check the file checksum.
 * @param {boolean} [options.decodeBuffers] Whether to decode GPU buffers.
 * @returns {Promise<CmfGraph>} The validated raw graph.
 */
export async function readRawInputAsync(input, options = {})
{
    if (input && typeof input === "object" && Array.isArray(input.sections) && Array.isArray(input.meshes))
    {
        return validateCmfGraph(input, { phase: "read" });
    }

    const { readCmfAsync } = await import("./schema.js");
    return readCmfAsync(input, options);
}

/**
 * Reads input using normalized format options for the CMF format reader.
 *
 * @param {object} owner Calling format instance or class; not read.
 * @param {Uint8Array|ArrayBuffer|ArrayBufferView|CmfGraph} input File bytes, or an existing raw graph.
 * @param {CmfValues} values Normalized reader values.
 * @returns {CmfGraph|object} The raw graph, or the hydrated CMF, shared or GR2 root.
 */
export function readWithValues(owner, input, values)
{
    const raw = readRawInput(input, values);
    if (values.emit === OUTPUT_RAW)
    {
        return raw;
    }

    return values.emit === OUTPUT_SHARED
        ? buildSharedFromCmf(raw, values.classes, { source: values.source })
        : values.emit === OUTPUT_GR2
            ? buildGr2FromCmf(raw, values.classes, { source: values.source })
            : hydrateNativeRoot(raw, values.classes, { source: values.source });
}

/**
 * Reads input asynchronously using normalized format options for the CMF format
 * reader.
 *
 * @param {object} owner Calling format instance or class; not read.
 * @param {Uint8Array|ArrayBuffer|ArrayBufferView|CmfGraph} input File bytes, or an existing raw graph.
 * @param {CmfValues} values Normalized reader values.
 * @returns {Promise<CmfGraph|object>} The raw graph, or the hydrated CMF, shared or GR2 root.
 */
export async function readWithValuesAsync(owner, input, values)
{
    const raw = await readRawInputAsync(input, values);
    if (values.emit === OUTPUT_RAW)
    {
        return raw;
    }

    return values.emit === OUTPUT_SHARED
        ? buildSharedFromCmf(raw, values.classes, { source: values.source })
        : values.emit === OUTPUT_GR2
            ? buildGr2FromCmf(raw, values.classes, { source: values.source })
            : hydrateNativeRoot(raw, values.classes, { source: values.source });
}

/**
 * Loads shared with values through the current CMF format reader.
 *
 * @param {object} input Shared geometry root or mesh.
 * @param {CmfValues} values Normalized reader values.
 * @returns {object} The hydrated CMF, shared or GR2 root.
 */
export function loadSharedWithValues(input, values)
{
    const native = buildCmfFromShared(input);
    return values.emit === OUTPUT_SHARED
        ? buildSharedFromCmf(native, values.classes, { source: values.source })
        : values.emit === OUTPUT_GR2
            ? buildGr2FromCmf(native, values.classes, { source: values.source })
            : hydrateNativeRoot(native, values.classes, { source: values.source });
}

/**
 * Loads native with values through the current CMF format reader.
 *
 * @param {CmfGraph} input CMF-native graph.
 * @param {CmfValues} values Normalized reader values.
 * @returns {CmfGraph|object} The input when `emit` is "raw", otherwise the hydrated CMF, shared or GR2 root.
 */
export function loadNativeWithValues(input, values)
{
    if (values.emit === OUTPUT_RAW)
    {
        return input;
    }

    return values.emit === OUTPUT_SHARED
        ? buildSharedFromCmf(input, values.classes, { source: values.source })
        : values.emit === OUTPUT_GR2
            ? buildGr2FromCmf(input, values.classes, { source: values.source })
            : hydrateNativeRoot(input, values.classes, { source: values.source });
}

/**
 * Inspects raw CMF result without materializing the full CMF format reader
 * payload.
 *
 * @param {Uint8Array|ArrayBuffer|ArrayBufferView|CmfGraph} input File bytes, or an existing raw graph.
 * @param {object} [options={}] Reader values.
 * @param {boolean} [options.validateCrc] Whether to check the file checksum.
 * @returns {object} The header, section and per-node summary from inspectCmf.
 */
export function inspectRawCmfResult(input, options = {})
{
    return inspectCmf(readRawInput(input, { ...options, decodeBuffers: false }));
}

/**
 * Builds a hydrated GR2-shaped root from a CMF graph.
 *
 * @param {CmfGraph} raw CMF graph.
 * @param {CmfClasses} classes Constructors used for hydration.
 * @param {CmfHydrationOptions} [hydrationOptions={}] Values forwarded to SetValues.
 * @returns {object} The hydrated GR2 root.
 */
function buildGr2FromCmf(raw, classes, hydrationOptions = {})
{
    const hydrationClasses = createHydrationClasses(classes, hydrationOptions);
    return hydrate("Root", {
        grannyFileFormatRevision: raw.version,
        grannyFileSource: "cmf",
        meshes: raw.meshes.map((mesh) => hydrateGr2Mesh(mesh, hydrationClasses)),
        models: buildGr2Models(raw).map((model) => hydrateGr2Model(model, hydrationClasses)),
        animations: buildGr2Animations(raw).map((animation) => hydrateGr2Animation(animation, hydrationClasses))
    }, hydrationClasses, hydrationOptions);
}

/**
 * Hydrates one CMF mesh as a GR2-shaped mesh.
 *
 * @param {CmfMesh} mesh CMF mesh.
 * @param {CmfClasses} classes Hydration class map.
 * @returns {object} The hydrated mesh, or its plain fields.
 */
function hydrateGr2Mesh(mesh, classes)
{
    return hydrate("Mesh", {
        name: mesh.name,
        morphTargets: (mesh.morphTargets?.targets ?? []).map((target, index) => hydrate("MorphTarget", {
            ...target,
            dataIsDeltas: true,
            vertex: mesh.lods?.[0]?.morphTargets?.[index]?.vertex ?? target.vertex ?? null
        }, classes)),
        minBounds: mesh.bounds?.min ?? [ 0, 0, 0 ],
        maxBounds: mesh.bounds?.max ?? [ 0, 0, 0 ],
        boneBindings: (mesh.boneBindings ?? []).map((binding) => hydrate("BoneBinding", {
            name: binding.name,
            minBounds: binding.bounds?.min ?? [ 0, 0, 0 ],
            maxBounds: binding.bounds?.max ?? [ 0, 0, 0 ]
        }, classes)),
        vertex: mesh.vertex ?? emptyGr2Vertex(),
        indices: (mesh.indices ?? []).map((group) => hydrate("IndexGroup", {
            name: group.name ?? "",
            bytesPerIndex: group.bytesPerIndex ?? 2,
            faces: group.faces ?? []
        }, classes))
    }, classes);
}

/**
 * Hydrates one GR2-shaped model and its skeleton.
 *
 * @param {object} model GR2-shaped model from buildGr2Models.
 * @param {CmfClasses} classes Hydration class map.
 * @returns {object} The hydrated model, or its plain fields.
 */
function hydrateGr2Model(model, classes)
{
    return hydrate("Model", {
        ...model,
        skeleton: hydrate("Skeleton", {
            ...model.skeleton,
            bones: model.skeleton.bones.map((bone) => hydrate("Bone", bone, classes))
        }, classes)
    }, classes);
}

/**
 * Hydrates one GR2-shaped animation and its tracks.
 *
 * @param {object} animation GR2-shaped animation from buildGr2Animations.
 * @param {CmfClasses} classes Hydration class map.
 * @returns {object} The hydrated animation, or its plain fields.
 */
function hydrateGr2Animation(animation, classes)
{
    return hydrate("Animation", {
        ...animation,
        trackGroups: animation.trackGroups.map((group) => hydrate("TrackGroup", {
            ...group,
            transformTracks: group.transformTracks.map((track) => hydrate("TransformTrack", {
                ...track,
                orientation: hydrate("Curve", track.orientation, classes),
                position: hydrate("Curve", track.position, classes),
                scaleShear: hydrate("Curve", track.scaleShear, classes)
            }, classes)),
            vectorTracks: group.vectorTracks.map((track) => hydrate("VectorTrack", {
                ...track,
                valueCurve: hydrate("Curve", track.valueCurve, classes)
            }, classes))
        }, classes))
    }, classes);
}

/**
 * Creates empty GR2 vertex channels.
 *
 * @returns {CmfVertexChannels} Empty channels.
 */
function emptyGr2Vertex()
{
    return {
        position: [],
        normal: [],
        tangent: [],
        binormal: [],
        texcoord0: [],
        texcoord1: [],
        blendIndice: [],
        blendWeight: []
    };
}

/**
 * Converts a parsed payload into a JSON-safe value for the CMF format reader.
 *
 * @param {*} value Any parsed value.
 * @returns {*} The JSON-safe copy.
 */
export function toJsonValue(value)
{
    if (value === null || value === undefined)
    {
        return value;
    }

    if (Array.isArray(value))
    {
        return value.map((item) => toJsonValue(item));
    }

    if (ArrayBuffer.isView(value))
    {
        return Array.from(value);
    }

    if (typeof value.toJSON === "function")
    {
        return toJsonValue(value.toJSON());
    }

    if (typeof value === "object")
    {
        const result = {};
        for (const [ key, child ] of Object.entries(value))
        {
            result[key] = toJsonValue(child);
        }
        return result;
    }

    return value;
}

/**
 * Validates a requested runtime class key for the CMF format reader.
 *
 * @param {string} type Class key.
 * @throws {TypeError} When the key is unknown.
 */
export function validateClassKey(type)
{
    if (!CLASS_KEYS.includes(type))
    {
        throw new TypeError(`Unknown CMF class key "${type}"`);
    }
}

/**
 * Validates a resolved runtime class constructor for the CMF format reader.
 *
 * @param {string} type Class key.
 * @param {Function} Class Constructor.
 * @throws {TypeError} When the constructor is not a function.
 */
export function validateClass(type, Class)
{
    validateClassKey(type);
    if (typeof Class !== "function")
    {
        throw new TypeError(`CMF class "${type}" must be a constructor`);
    }
}

/**
 * Validates every entry of a class map.
 *
 * @param {CmfClasses} classes Class map.
 */
function validateClasses(classes)
{
    for (const [ type, Class ] of Object.entries(classes ?? {}))
    {
        validateClass(type, Class);
    }
}

/**
 * Hydrates a CMF-native root through the caller's classes.
 *
 * @param {CmfGraph} raw CMF graph.
 * @param {CmfClasses} classes Constructors used for hydration.
 * @param {CmfHydrationOptions} [hydrationOptions={}] Values forwarded to SetValues.
 * @returns {object} The hydrated root, or its plain fields.
 */
function hydrateNativeRoot(raw, classes, hydrationOptions = {})
{
    return hydrateCmf({
        signature: raw.signature,
        version: raw.version,
        headerSize: raw.headerSize,
        crc32: raw.crc32,
        sections: raw.sections ?? [],
        metadata: raw.metadata ?? null,
        meshes: raw.meshes ?? [],
        skeletons: raw.skeletons ?? [],
        animations: raw.animations ?? []
    }, classes, hydrationOptions);
}

/**
 * Constructs and populates the class registered for a key, or returns the
 * plain fields when none is registered.
 *
 * @param {string} type Class key.
 * @param {object} fields Field values.
 * @param {CmfClasses} classes Hydration class map.
 * @param {CmfHydrationOptions} [hydrationOptions={}] Values forwarded to SetValues.
 * @returns {object} The populated instance, or `fields`.
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
 * Populates an instance through its SetValues.
 *
 * @param {object} instance Instance to populate.
 * @param {object} fields Field values.
 * @param {CmfHydrationOptions} [hydrationOptions={}] Values forwarded to SetValues.
 * @returns {object} The instance.
 * @throws {TypeError} When the instance has no SetValues.
 */
function populate(instance, fields, hydrationOptions = {})
{
    if (!instance || typeof instance.SetValues !== "function")
    {
        throw new TypeError("CjsCmfFormat class population requires classes to implement SetValues(values)");
    }
    instance.SetValues(fields, { ...hydrationOptions, skipUpdate: true, skipEvents: true });
    return instance;
}

/**
 * Creates a class map inheriting from the caller's map and carrying the
 * hydration options.
 *
 * @param {CmfClasses} classes Caller class map.
 * @param {CmfHydrationOptions} hydrationOptions Values forwarded to SetValues.
 * @returns {CmfClasses} The derived class map.
 */
function createHydrationClasses(classes, hydrationOptions)
{
    const map = Object.create(classes || null);
    Object.defineProperty(map, "__hydrationOptions", { value: hydrationOptions, enumerable: false });
    return map;
}
