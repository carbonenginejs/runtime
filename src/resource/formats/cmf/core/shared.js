import { convertGr2SkeletonsAndAnimations } from "./gr2Anim.js";
import { canonicalMorphVertex, maxMorphDisplacement } from "./utils/morph.js";
import { bytesPerIndex, firstTriangle, totalIndexCount } from "./utils/indices.js";
import { elementTypeSize, estimateStrideFromDecl } from "./utils/vertex.js";

const VERTEX_CHANNELS = Object.freeze([
    [ "position", "Position", 3 ],
    [ "normal", "Normal", 3 ],
    [ "tangent", "Tangent", 3 ],
    [ "binormal", "Binormal", 3 ],
    [ "texcoord0", "TexCoord", 2, 0 ],
    [ "texcoord1", "TexCoord", 2, 1 ],
    [ "color0", "Color", 4, 0 ],
    [ "blendIndice", "BoneIndices", 4, 0, "UInt16" ],
    [ "blendWeight", "BoneWeights", 4, 0 ],
    [ "packedTangent", "PackedTangent", 4, 0, "Int16Norm" ],
    [ "packedTangentLegacy", "PackedTangentLegacy", 4, 0, "UInt16Norm" ]
]);

/**
 * Builds a CMF document from normalized shared geometry for the CMF format
 * reader.
 */
export function buildCmfFromShared(input, options = {})
{
    const source = input && input.meshes ? input : { meshes: [ input ] };
    const root = convertGr2SkeletonsAndAnimations(source, options);
    return {
        version: 1,
        metadata: normalizeMetadata(root.metadata),
        meshes: (root.meshes ?? []).map((mesh) => buildMesh(mesh)),
        skeletons: root.skeletons ?? [],
        animations: root.animations ?? []
    };
}

/**
 * Builds normalized shared geometry from a CMF document for the CMF format
 * reader.
 */
export function buildSharedFromCmf(raw, classes, hydrationOptions = {})
{
    const hydrationClasses = createHydrationClasses(classes, hydrationOptions);
    return hydrate("Root", {
        cmfVersion: raw.version,
        metadata: raw.metadata ? hydrateMetadata(raw.metadata, hydrationClasses) : null,
        meshes: raw.meshes.map((mesh) => hydrateSharedMesh(mesh, hydrationClasses)),
        skeletons: raw.skeletons.map((skeleton) => hydrateSkeleton(skeleton, hydrationClasses)),
        animations: raw.animations.map((animation) => hydrateAnimation(animation, hydrationClasses))
    }, hydrationClasses, hydrationOptions);
}

function buildMesh(mesh)
{
    mesh = normalizeSharedMeshTangents(mesh);
    const
        vertex = mesh.vertex ?? {},
        position = vertex.position ?? [],
        boneBindings = (mesh.boneBindings ?? []).map((binding) => buildBoneBinding(binding)),
        affectedByBones = boneBindings.length > 0,
        morphTargets = buildMorphTargets(mesh),
        affectedByMorphTargets = morphTargets.targets.length > 0,
        stride = estimateVertexStride(vertex),
        vertexCount = stride === 0 ? 0 : Math.floor(position.length / 3);

    return {
        name: mesh.name ?? "",
        decl: buildDecl(vertex),
        lods: [ {
            vb: {
                index: 1,
                offset: 0,
                size: vertexCount * stride,
                stride
            },
            ib: {
                index: 2,
                offset: 0,
                size: totalIndexCount(mesh.indices) * bytesPerIndex(mesh.indices),
                stride: bytesPerIndex(mesh.indices)
            },
            areas: (mesh.indices ?? []).map((group, index) => ({
                firstElement: firstTriangle(mesh.indices, index),
                elementCount: Math.floor((group.faces ?? []).length / 3)
            })),
            morphTargets: morphTargets.lods,
            threshold: 0xffffffff,
            vertex,
            indices: mesh.indices ?? []
        } ],
        areas: (mesh.indices ?? []).map((group) => ({
            name: group.name ?? "",
            bounds: boundsFromShared(mesh),
            bones: [],
            affectedByBones,
            affectedByMorphTargets
        })),
        boneBindings,
        morphTargets: {
            decl: morphTargets.decl,
            targets: morphTargets.targets
        },
        uvDensities: [],
        bounds: boundsFromShared(mesh),
        audioOcclusionMesh: {
            vertices: [],
            indices: [],
            bounds: { min: [ 0, 0, 0 ], max: [ 0, 0, 0 ] }
        },
        topology: "TriangleList",
        skeleton: mesh.skeleton ?? null,
        vertex,
        indices: mesh.indices ?? []
    };
}

function normalizeSharedMeshTangents(mesh)
{
    const vertex = normalizeSharedVertex(mesh.vertex ?? {});
    const morphTargets = (mesh.morphTargets ?? []).map(target => ({
        ...target,
        vertex: normalizeSharedVertexTangents(target.vertex ?? {}, morphTargetVertexCount(mesh, target))
    }));
    return { ...mesh, vertex, morphTargets };
}

function morphTargetVertexCount(mesh, target)
{
    const indices = target.vertexIndices ?? [];
    if (indices.length) return indices.length;

    const position = target.vertex?.position ?? [];
    if (position.length) return Math.floor(position.length / 3);

    return Math.floor((mesh.vertex?.position ?? []).length / 3);
}

function normalizeSharedVertex(vertex)
{
    return normalizeSharedVertexSkin(normalizeSharedVertexTangents(vertex));
}

function normalizeSharedVertexTangents(vertex, vertexCount)
{
    const
        positionCount = vertexCount ?? (vertex.position ?? []).length / 3,
        tangent = vertex.tangent ?? [];

    if (!positionCount || tangent.length !== positionCount * 4 ||
        (vertex.normal ?? []).length || (vertex.binormal ?? []).length)
    {
        return vertex;
    }
    // The source channels are the layout authority. GR2's explicit
    // `unpackTangents` conversion runs before this boundary when requested;
    // CMF construction must not silently expand an otherwise packed frame.
    return { ...vertex, tangent: [], packedTangentLegacy: tangent.slice() };
}

function normalizeSharedVertexSkin(vertex)
{
    const
        positionCount = (vertex.position ?? []).length / 3,
        blendIndice = vertex.blendIndice ?? [],
        blendWeight = vertex.blendWeight ?? [];

    if (!positionCount || blendIndice.length !== positionCount * 4 || blendWeight.length)
    {
        return vertex;
    }

    // Carbon CMF treats BoneIndices without BoneWeights as rigid skinning.
    // Its geometry exporters synthesize (1, 0, 0, 0) before targeting formats
    // such as glTF/FBX that require explicit weights.
    const normalized = { ...vertex, blendWeight: new Array(positionCount * 4).fill(0) };
    for (let i = 0; i < positionCount; i++) normalized.blendWeight[i * 4] = 1;
    return normalized;
}

function buildMorphTargets(mesh)
{
    const targets = mesh.morphTargets ?? [];
    if (!targets.length)
    {
        return { decl: [], targets: [], lods: [] };
    }

    const
        morphSpecs = VERTEX_CHANNELS
            .filter(([ name ]) => targets.some((target) => (target.vertex?.[name] ?? []).length))
            .map(([ name, usage, defaultCount, usageIndex = 0, type = "Float32" ]) => ({
                name,
                usage,
                usageIndex,
                elementCount: morphChannelElementCount(mesh, targets, name, defaultCount),
                type
            })),
        vertices = targets.map((target) => canonicalMorphVertex(mesh.vertex ?? {}, target, morphSpecs)),
        decl = buildMorphDecl(morphSpecs),
        stride = estimateStrideFromDecl(decl);

    return {
        decl,
        targets: targets.map((target, index) => ({
            name: target.name ?? "",
            maxDisplacement: target.maxDisplacement ?? maxMorphDisplacement(vertices[index].position)
        })),
        lods: targets.map((target, index) =>
        {
            const
                morphVertex = vertices[index],
                vertexCount = morphSpecs.reduce((count, spec) => Math.max(
                    count,
                    Math.floor((morphVertex[spec.name] ?? []).length / spec.elementCount)
                ), 0);

            return {
                vb: { index: 0, offset: 0, size: vertexCount * stride, stride },
                vertex: morphVertex
            };
        })
    };
}

function buildMorphDecl(specs)
{
    let offset = 0;
    return specs.map(({ usage, usageIndex, type, elementCount }) =>
    {
        const element = { usage, usageIndex, type, elementCount, offset };
        offset += elementCount * elementTypeSize(type);
        return element;
    });
}

function morphChannelElementCount(mesh, targets, name, defaultCount)
{
    if (name !== "tangent" && name !== "binormal") return defaultCount;

    for (const target of targets)
    {
        const values = target.vertex?.[name] ?? [];
        const vertexCount = morphTargetVertexCount(mesh, target);
        if (!values.length || !vertexCount || values.length % vertexCount) continue;

        const width = values.length / vertexCount;
        if (width === 3 || width === 4) return width;
    }
    return defaultCount;
}

function buildBoneBinding(binding)
{
    return {
        name: binding.name ?? "",
        bounds: {
            min: binding.minBounds ?? binding.bounds?.min ?? [ 0, 0, 0 ],
            max: binding.maxBounds ?? binding.bounds?.max ?? [ 0, 0, 0 ]
        }
    };
}

function buildDecl(vertex)
{
    const decl = [];
    let offset = 0;
    const vertexCount = (vertex.position ?? []).length / 3;
    for (const channel of VERTEX_CHANNELS)
    {
        const [ name, usage, defaultCount, usageIndex = 0, type = "Float32" ] = channel;
        if (!Array.isArray(vertex[name]) || vertex[name].length === 0)
        {
            continue;
        }

        const count = (name === "tangent" || name === "binormal") &&
            vertexCount > 0 && vertex[name].length === vertexCount * 4
            ? 4
            : defaultCount;

        decl.push({ usage, usageIndex, type, elementCount: count, offset });
        offset += count * elementTypeSize(type);
    }
    return decl;
}

function estimateVertexStride(vertex)
{
    return estimateStrideFromDecl(buildDecl(vertex));
}

function boundsFromShared(mesh)
{
    return {
        min: mesh.minBounds ?? mesh.bounds?.min ?? [ 0, 0, 0 ],
        max: mesh.maxBounds ?? mesh.bounds?.max ?? [ 0, 0, 0 ]
    };
}

function normalizeMetadata(metadata)
{
    if (!metadata) return null;
    if (Array.isArray(metadata.entries)) return metadata;
    return {
        entries: Object.entries(metadata).map(([ key, value ]) => ({
            key,
            value: String(value)
        }))
    };
}

function hydrateSharedMesh(mesh, classes)
{
    return hydrate("Mesh", {
        name: mesh.name,
        morphTargets: mesh.morphTargets.targets.map((target, index) => hydrate("MorphTarget", {
            ...target,
            dataIsDeltas: true,
            vertex: mesh.lods[0]?.morphTargets[index]?.vertex ?? null
        }, classes)),
        minBounds: mesh.bounds.min,
        maxBounds: mesh.bounds.max,
        boneBindings: mesh.boneBindings.map((binding) => hydrate("BoneBinding", {
            name: binding.name,
            minBounds: binding.bounds.min,
            maxBounds: binding.bounds.max
        }, classes)),
        vertex: mesh.vertex ?? emptyVertex(),
        indices: (mesh.indices ?? []).map((group) => hydrate("IndexGroup", {
            name: group.name,
            bytesPerIndex: group.bytesPerIndex,
            faces: group.faces
        }, classes)),
        lods: mesh.lods,
        topology: mesh.topology,
        skeleton: mesh.skeleton
    }, classes);
}

function hydrateMetadata(metadata, classes)
{
    return hydrate("Metadata", {
        entries: metadata.entries.map((entry) => hydrate("MetadataEntry", entry, classes))
    }, classes);
}

function hydrateSkeleton(skeleton, classes)
{
    return hydrate("Skeleton", skeleton, classes);
}

function hydrateAnimation(animation, classes)
{
    return hydrate("Animation", animation, classes);
}

function emptyVertex()
{
    return {
        position: [],
        normal: [],
        tangent: [],
        binormal: [],
        texcoord0: [],
        texcoord1: [],
        color0: [],
        blendIndice: [],
        blendWeight: [],
        packedTangent: [],
        packedTangentLegacy: []
    };
}

function hydrate(type, fields, classes, hydrationOptions = {})
{
    const Class = classes?.[type];
    const options = Object.keys(hydrationOptions).length > 0 ? hydrationOptions : classes?.__hydrationOptions || {};
    return Class ? populate(new Class(), fields, options) : fields;
}

function populate(instance, fields, hydrationOptions = {})
{
    if (!instance || typeof instance.SetValues !== "function")
    {
        throw new TypeError("CjsCmfFormat shared class population requires classes to implement SetValues(values)");
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
