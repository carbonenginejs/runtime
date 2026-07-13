import { CLASS_KEYS, OUTPUT_CMF, OUTPUT_CMF_JSON, OUTPUT_GR2, OUTPUT_JSON, OUTPUT_NATIVE, OUTPUT_RAW, OUTPUT_SHARED } from "./constants.js";
import { inspectCmf, readCmf } from "./schema.js";
import { buildCmfFromShared, buildSharedFromCmf } from "./shared.js";

export { CLASS_KEYS, OUTPUT_CMF, OUTPUT_CMF_JSON, OUTPUT_GR2, OUTPUT_JSON, OUTPUT_NATIVE, OUTPUT_RAW, OUTPUT_SHARED };

export const DEFAULT_VALUES = Object.freeze({
    emit: OUTPUT_NATIVE,
    validateCrc: true,
    decodeBuffers: true,
    classes: {}
});

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

export function readRawInput(input, options = {})
{
    if (input && typeof input === "object" && Array.isArray(input.sections) && Array.isArray(input.meshes))
    {
        return input;
    }

    return readCmf(input, options);
}

export async function readRawInputAsync(input, options = {})
{
    if (input && typeof input === "object" && Array.isArray(input.sections) && Array.isArray(input.meshes))
    {
        return input;
    }

    const { readCmfAsync } = await import("./schema.js");
    return readCmfAsync(input, options);
}

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

export function loadSharedWithValues(input, values)
{
    const native = buildCmfFromShared(input);
    return values.emit === OUTPUT_SHARED
        ? buildSharedFromCmf(native, values.classes, { source: values.source })
        : values.emit === OUTPUT_GR2
            ? buildGr2FromCmf(native, values.classes, { source: values.source })
            : hydrateNativeRoot(native, values.classes, { source: values.source });
}

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
        models: [],
        animations: raw.animations.map((animation) => hydrate("Animation", {
            name: animation.name ?? "",
            duration: animation.duration ?? 0,
            timeStep: 0,
            oversampling: 0,
            defaultLoopCount: 0,
            flags: 0,
            trackGroups: []
        }, hydrationClasses))
    }, hydrationClasses, hydrationOptions);
}

function hydrateGr2Mesh(mesh, classes)
{
    return hydrate("Mesh", {
        name: mesh.name,
        morphTargets: (mesh.morphTargets?.targets ?? []).map((target) => hydrate("MorphTarget", {
            ...target,
            dataIsDeltas: true,
            vertex: target.vertex ?? null
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

export function validateClassKey(type)
{
    if (!CLASS_KEYS.includes(type))
    {
        throw new TypeError(`Unknown CMF class key "${type}"`);
    }
}

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
    const hydrationClasses = createHydrationClasses(classes, hydrationOptions);
    return hydrate("Root", {
        signature: raw.signature,
        version: raw.version,
        headerSize: raw.headerSize,
        crc32: raw.crc32,
        sections: (raw.sections ?? []).map((section) => hydrate("Section", section, hydrationClasses)),
        metadata: raw.metadata ? hydrateMetadata(raw.metadata, hydrationClasses) : null,
        meshes: raw.meshes.map((mesh) => hydrateMesh(mesh, hydrationClasses)),
        skeletons: raw.skeletons.map((skeleton) => hydrateSkeleton(skeleton, hydrationClasses)),
        animations: raw.animations.map((animation) => hydrateAnimation(animation, hydrationClasses))
    }, hydrationClasses, hydrationOptions);
}

function hydrateMetadata(metadata, classes)
{
    return hydrate("Metadata", {
        entries: metadata.entries.map((entry) => hydrate("MetadataEntry", entry, classes))
    }, classes);
}

function hydrateMesh(mesh, classes)
{
    return hydrate("Mesh", {
        ...mesh,
        decl: mesh.decl.map((element) => hydrate("VertexElement", element, classes)),
        lods: mesh.lods.map((lod) => hydrateMeshLod(lod, classes)),
        areas: mesh.areas.map((area) => hydrate("MeshArea", area, classes)),
        boneBindings: mesh.boneBindings.map((binding) => hydrate("BoneBinding", binding, classes)),
        morphTargets: hydrateMorphTargets(mesh.morphTargets, classes),
        audioOcclusionMesh: hydrate("AudioOcclusionMesh", mesh.audioOcclusionMesh, classes)
    }, classes);
}

function hydrateMeshLod(lod, classes)
{
    return hydrate("MeshLod", {
        ...lod,
        areas: lod.areas.map((area) => hydrate("LodMeshArea", area, classes)),
        morphTargets: lod.morphTargets.map((target) => hydrate("LodMorphTarget", target, classes))
    }, classes);
}

function hydrateMorphTargets(morphTargets, classes)
{
    return hydrate("MorphTargets", {
        decl: morphTargets.decl.map((element) => hydrate("VertexElement", element, classes)),
        targets: morphTargets.targets.map((target) => hydrate("MorphTarget", target, classes))
    }, classes);
}

function hydrateSkeleton(skeleton, classes)
{
    return hydrate("Skeleton", {
        ...skeleton,
        boneMasks: skeleton.boneMasks.map((mask) => hydrate("BoneMask", {
            ...mask,
            weights: mask.weights.map((weight) => hydrate("BoneWeight", weight, classes))
        }, classes))
    }, classes);
}

function hydrateAnimation(animation, classes)
{
    return hydrate("Animation", {
        ...animation,
        channels: animation.channels.map((channel) => hydrate("AnimationChannel", channel, classes)),
        curves: animation.curves.map((curve) => hydrate("AnimationCurve", curve, classes))
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
