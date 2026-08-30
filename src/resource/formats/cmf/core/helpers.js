import { CLASS_KEYS, OUTPUT_CMF, OUTPUT_CMF_JSON, OUTPUT_GR2, OUTPUT_JSON, OUTPUT_NATIVE, OUTPUT_RAW, OUTPUT_SHARED } from "./constants.js";
import { inspectCmf, readCmf } from "./schema.js";
import { buildCmfFromShared, buildSharedFromCmf } from "./shared.js";
import { buildGr2Animations, buildGr2Models } from "./gr2Compat.js";
import { hydrateCmf } from "./utils/hydration.js";

export { CLASS_KEYS, OUTPUT_CMF, OUTPUT_CMF_JSON, OUTPUT_GR2, OUTPUT_JSON, OUTPUT_NATIVE, OUTPUT_RAW, OUTPUT_SHARED };

export const DEFAULT_VALUES = Object.freeze({
    emit: OUTPUT_NATIVE,
    validateCrc: true,
    decodeBuffers: true,
    classes: {}
});

/**
 * Normalizes reader options against their supported defaults for the CMF format
 * reader.
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

function normalizeEmit(emit)
{
    if (emit === undefined || emit === OUTPUT_NATIVE || emit === OUTPUT_CMF || emit === OUTPUT_CMF_JSON || emit === OUTPUT_JSON)
    {
        return OUTPUT_CMF;
    }
    if (emit === OUTPUT_GR2 || emit === OUTPUT_RAW || emit === OUTPUT_SHARED) return emit;
    throw new TypeError(`CMF emit must be "${OUTPUT_CMF}", "${OUTPUT_CMF_JSON}", "${OUTPUT_GR2}", "${OUTPUT_SHARED}", or "${OUTPUT_RAW}"`);
}

function hasClasses(classes)
{
    return !!classes && Object.values(classes).some((Class) => typeof Class === "function");
}

/** Reads and validates raw input bytes for the CMF format reader. */
export function readRawInput(input, options = {})
{
    if (input && typeof input === "object" && Array.isArray(input.sections) && Array.isArray(input.meshes))
    {
        return input;
    }

    return readCmf(input, options);
}

/** Reads and validates raw input bytes asynchronously for the CMF format reader. */
export async function readRawInputAsync(input, options = {})
{
    if (input && typeof input === "object" && Array.isArray(input.sections) && Array.isArray(input.meshes))
    {
        return input;
    }

    const { readCmfAsync } = await import("./schema.js");
    return readCmfAsync(input, options);
}

/** Reads input using normalized format options for the CMF format reader. */
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

/** Loads shared with values through the current CMF format reader. */
export function loadSharedWithValues(input, values)
{
    const native = buildCmfFromShared(input);
    return values.emit === OUTPUT_SHARED
        ? buildSharedFromCmf(native, values.classes, { source: values.source })
        : values.emit === OUTPUT_GR2
            ? buildGr2FromCmf(native, values.classes, { source: values.source })
            : hydrateNativeRoot(native, values.classes, { source: values.source });
}

/** Loads native with values through the current CMF format reader. */
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
 */
export function inspectRawCmfResult(input, options = {})
{
    return inspectCmf(readRawInput(input, { ...options, decodeBuffers: false }));
}

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

/** Converts a parsed payload into a JSON-safe value for the CMF format reader. */
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

/** Validates a requested runtime class key for the CMF format reader. */
export function validateClassKey(type)
{
    if (!CLASS_KEYS.includes(type))
    {
        throw new TypeError(`Unknown CMF class key "${type}"`);
    }
}

/** Validates a resolved runtime class constructor for the CMF format reader. */
export function validateClass(type, Class)
{
    validateClassKey(type);
    if (typeof Class !== "function")
    {
        throw new TypeError(`CMF class "${type}" must be a constructor`);
    }
}

function validateClasses(classes)
{
    for (const [ type, Class ] of Object.entries(classes ?? {}))
    {
        validateClass(type, Class);
    }
}

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
        throw new TypeError("CjsCmfFormat class population requires classes to implement SetValues(values)");
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
