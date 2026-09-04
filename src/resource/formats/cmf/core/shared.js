import { convertGr2SkeletonsAndAnimations } from "./gr2Anim.js";
import { Usage } from "./constants.js";
import { canonicalMorphVertex, maxMorphDisplacement } from "./utils/morph.js";
import { bytesPerIndex, firstTriangle, totalIndexCount } from "./utils/indices.js";
import { calculateUvDensities } from "./utils/uvDensity.js";
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
        meshes: (root.meshes ?? []).map((mesh) => buildMesh(mesh, options)),
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

function buildMesh(mesh, options)
{
    const lodSources = sharedLodSources(mesh);
    const builtLods = lodSources.map((source, index) => buildLod(source, index, options));
    const base = builtLods[0];
    assertCompatibleLods(builtLods);

    const
        vertex = base.vertex,
        boneBindings = (mesh.boneBindings ?? []).map((binding) => buildBoneBinding(binding)),
        affectedByBones = boneBindings.length > 0,
        morphTargets = {
            ...base.morphTargetSet,
            targets: base.morphTargetSet.targets.map((target, targetIndex) => ({
                ...target,
                maxDisplacement: Math.max(...builtLods.map(lod =>
                    lod.morphTargetSet.targets[targetIndex].maxDisplacement))
            }))
        },
        decl = base.decl,
        topology = base.topology,
        areas = base.indices.map((group, areaIndex) => buildMeshArea(mesh, builtLods, group, areaIndex));

    if (affectedByBones !== decl.some(element => element.usage === "BoneIndices"))
    {
        throw new Error("CMF bone bindings and BoneIndices must either both be present or both be absent");
    }

    return {
        name: mesh.name ?? "",
        decl,
        lods: builtLods.map(({ decl: _decl, topology: _topology, morphTargetSet: _morphTargetSet, ...lod }) => lod),
        areas,
        boneBindings,
        morphTargets: {
            decl: morphTargets.decl,
            targets: morphTargets.targets
        },
        uvDensities: calculateUvDensities(vertex, base.indices, decl),
        bounds: boundsFromShared(mesh),
        audioOcclusionMesh: mesh.audioOcclusionMesh ?? {
            vertices: [],
            indices: [],
            bounds: { min: [ 0, 0, 0 ], max: [ 0, 0, 0 ] }
        },
        topology,
        skeleton: mesh.skeleton ?? null,
        vertex,
        indices: base.indices
    };
}

function sharedLodSources(mesh)
{
    const lods = Array.isArray(mesh.lods) && mesh.lods.length ? mesh.lods : [ mesh ];
    return lods.map((lod, index) =>
    {
        const baseTargets = mesh.morphTargets ?? [];
        const lodTargets = lod.morphTargets ?? (index === 0 ? baseTargets : []);
        const morphTargets = lodTargets.map((target, targetIndex) => ({
            ...(baseTargets[targetIndex] ?? {}),
            ...target,
            vertex: target.vertex ?? baseTargets[targetIndex]?.vertex ?? {}
        }));
        return normalizeSharedMeshTangents({
            ...mesh,
            ...lod,
            name: mesh.name,
            boneBindings: mesh.boneBindings,
            skeleton: mesh.skeleton,
            morphTargets
        });
    });
}

function buildLod(mesh, index, options)
{
    const
        vertex = mesh.vertex ?? {},
        position = vertex.position ?? [],
        decl = buildDecl(vertex, options),
        stride = estimateStrideFromDecl(decl),
        vertexCount = stride === 0 ? 0 : Math.floor(position.length / 3),
        indices = mesh.indices ?? [],
        topology = mesh.topology ?? "TriangleList",
        pointList = topology === "PointList",
        morphTargets = buildMorphTargets(mesh),
        indexStride = pointList ? 0 : bytesPerIndex(indices);

    if (position.length % 3)
    {
        throw new Error("CMF Position channel length must be divisible by three");
    }
    if (topology !== "TriangleList" && !pointList)
    {
        throw new Error(`CMF shared geometry topology ${JSON.stringify(topology)} is not supported`);
    }
    if (pointList && totalIndexCount(indices))
    {
        throw new Error("CMF PointList geometry cannot contain an index buffer");
    }
    for (const group of indices)
    {
        const faces = group.faces ?? [];
        if (!pointList && faces.length % 3)
        {
            throw new Error("CMF triangle index groups must contain complete triangles");
        }
        if (faces.some(value => !Number.isInteger(value) || value < 0 || value >= vertexCount))
        {
            throw new Error("CMF index is outside the vertex range");
        }
    }

    return {
        decl,
        topology,
        vb: {
            index: 1,
            offset: 0,
            size: vertexCount * stride,
            stride
        },
        ib: pointList ? {
            index: 0,
            offset: 0,
            size: 0,
            stride: 0
        } : {
            index: 2,
            offset: 0,
            size: totalIndexCount(indices) * indexStride,
            stride: indexStride
        },
        areas: buildLodAreas(indices, topology, vertexCount),
        morphTargets: morphTargets.lods,
        morphTargetSet: morphTargets,
        threshold: lodThreshold(mesh, index),
        vertex,
        indices
    };
}

function lodThreshold(mesh, index)
{
    if (mesh.threshold !== undefined && mesh.threshold !== null) return mesh.threshold;
    if (index === 0) return 0xffffffff;
    throw new Error(`CMF LOD ${index} requires an explicit descending threshold`);
}

function buildMeshArea(mesh, lods, group, areaIndex)
{
    const source = mesh.areas?.[areaIndex] ?? group;
    const bones = source.bones ?? Array.from(new Set(lods.flatMap(lod =>
        areaBones(lod.indices[areaIndex], lod.vertex, lod.topology))));
    const affectedByMorphTargets = source.affectedByMorphTargets ?? lods.some(lod =>
        areaAffectedByMorphTargets(
            lod.indices[areaIndex],
            lod.vertex?.position ?? [],
            lod.morphTargetSet.lods,
            lod.topology
        ));
    return {
        name: source.name ?? group.name ?? "",
        bounds: source.bounds ?? boundsForArea(group, lods[0].vertex, mesh),
        bones,
        affectedByBones: source.affectedByBones ?? bones.length > 0,
        affectedByMorphTargets
    };
}

function areaVertexIndices(group, topology, vertexCount)
{
    if (topology !== "PointList") return group?.faces ?? [];
    const first = group?.firstElement ?? 0;
    const count = group?.pointCount ?? group?.elementCount ?? vertexCount;
    return Array.from({ length: count }, (_, index) => first + index);
}

function areaBones(group, vertex, topology)
{
    const boneIndices = vertex?.blendIndice ?? [];
    if (!boneIndices.length) return [];
    const boneWeights = vertex?.blendWeight ?? [];
    const vertexCount = (vertex?.position ?? []).length / 3;
    const bones = new Set();
    for (const vertexIndex of areaVertexIndices(group, topology, vertexCount))
    {
        const offset = vertexIndex * 4;
        for (let component = 0; component < 4; component++)
        {
            const weight = boneWeights.length ? boneWeights[offset + component] ?? 0 : component === 0 ? 1 : 0;
            if (weight > 0) bones.add(boneIndices[offset + component] ?? 0);
        }
    }
    return Array.from(bones);
}

function areaAffectedByMorphTargets(group, basePositions, morphLods, topology)
{
    const vertexCount = basePositions.length / 3;
    for (const morph of morphLods)
    {
        const positions = morph.vertex?.position ?? [];
        for (const vertexIndex of areaVertexIndices(group, topology, vertexCount))
        {
            const offset = vertexIndex * 3;
            if (positions[offset] !== basePositions[offset] ||
                positions[offset + 1] !== basePositions[offset + 1] ||
                positions[offset + 2] !== basePositions[offset + 2]) return true;
        }
    }
    return false;
}

function boundsForArea(group, vertex, mesh)
{
    const positions = vertex?.position ?? [];
    const selected = [];
    for (const vertexIndex of areaVertexIndices(group, mesh.topology ?? "TriangleList", positions.length / 3))
    {
        const offset = vertexIndex * 3;
        if (offset + 2 < positions.length) selected.push(positions[offset], positions[offset + 1], positions[offset + 2]);
    }
    if (!selected.length) return boundsFromShared(mesh);
    const min = [ Infinity, Infinity, Infinity ];
    const max = [ -Infinity, -Infinity, -Infinity ];
    for (let offset = 0; offset < selected.length; offset += 3)
    {
        for (let axis = 0; axis < 3; axis++)
        {
            min[axis] = Math.min(min[axis], selected[offset + axis]);
            max[axis] = Math.max(max[axis], selected[offset + axis]);
        }
    }
    return { min, max };
}

function buildLodAreas(groups, topology, vertexCount)
{
    if (topology === "PointList")
    {
        let firstElement = 0;
        return groups.map((group, index) =>
        {
            const elementCount = group.pointCount ?? (index === 0 ? vertexCount : 0);
            const area = { firstElement, elementCount };
            firstElement += elementCount;
            return area;
        });
    }
    return groups.map((group, index) => ({
        firstElement: firstTriangle(groups, index),
        elementCount: Math.floor((group.faces ?? []).length / 3)
    }));
}

function sameDeclaration(left, right)
{
    return left.length === right.length && left.every((element, index) =>
    {
        const other = right[index];
        return element.usage === other.usage && element.usageIndex === other.usageIndex &&
            element.type === other.type && element.elementCount === other.elementCount &&
            element.offset === other.offset;
    });
}

function assertCompatibleLods(lods)
{
    const base = lods[0];
    for (let index = 1; index < lods.length; index++)
    {
        const lod = lods[index];
        if (lod.topology !== base.topology || !sameDeclaration(lod.decl, base.decl))
        {
            throw new Error(`CMF LOD ${index} must use the base LOD topology and vertex declaration`);
        }
        if (lod.areas.length !== base.areas.length)
        {
            throw new Error(`CMF LOD ${index} must contain ${base.areas.length} material areas`);
        }
        if (!sameDeclaration(lod.morphTargetSet.decl, base.morphTargetSet.decl) ||
            lod.morphTargetSet.targets.length !== base.morphTargetSet.targets.length ||
            lod.morphTargetSet.targets.some((target, targetIndex) =>
                target.name !== base.morphTargetSet.targets[targetIndex].name))
        {
            throw new Error(`CMF LOD ${index} must use the base LOD morph declaration and target count`);
        }
        if (lod.threshold >= lods[index - 1].threshold)
        {
            throw new Error("CMF LOD thresholds must be strictly descending");
        }
    }
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
    if (!(mesh.vertex?.position ?? []).length)
    {
        throw new Error("CMF morph targets require a base position channel");
    }
    const targetNames = targets.map(target => target.name ?? "");
    if (new Set(targetNames).size !== targetNames.length)
    {
        throw new Error("CMF morph target names must be unique within a mesh");
    }
    const channelSpecs = morphChannelSpecs(mesh.vertex ?? {}, targets);
    for (const target of targets)
    {
        for (const [ name ] of channelSpecs)
        {
            if ((target.vertex?.[name] ?? []).length && !(mesh.vertex?.[name] ?? []).length)
            {
                throw new Error(`CMF morph ${name} is absent from the base vertex declaration`);
            }
        }
    }

    const
        morphSpecs = channelSpecs
            .filter(([ name ]) => name === "position" || targets.some((target) => (target.vertex?.[name] ?? []).length))
            .filter(([ name ]) => (mesh.vertex?.[name] ?? []).length)
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

    const targetRecords = targets.map((target, index) => ({
        name: target.name ?? "",
        maxDisplacement: target.maxDisplacement ?? maxMorphDisplacement(
            vertices[index].position,
            mesh.vertex?.position
        )
    }));
    if (targetRecords.some(target => !Number.isFinite(target.maxDisplacement) || target.maxDisplacement < 0))
    {
        throw new Error("CMF morph target maxDisplacement values must be finite and non-negative");
    }

    return {
        decl,
        targets: targetRecords,
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

function morphChannelSpecs(baseVertex, targets)
{
    const specs = [ ...VERTEX_CHANNELS ];
    const known = new Set(specs.map(([ name ]) => name));
    for (const vertex of [ baseVertex, ...targets.map(target => target.vertex ?? {}) ])
    {
        for (const name of Object.keys(vertex))
        {
            if (known.has(name)) continue;
            const match = /^(normal|tangent|binormal)([1-9][0-9]*)$/u.exec(name);
            if (!match) continue;
            const usage = match[1][0].toUpperCase() + match[1].slice(1);
            specs.push([ name, usage, 3, Number(match[2]) ]);
            known.add(name);
        }
    }
    return specs.sort((left, right) =>
        Usage.indexOf(left[1]) - Usage.indexOf(right[1]) || (left[3] ?? 0) - (right[3] ?? 0));
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
    if (!/^tangent(?:[1-9][0-9]*)?$/u.test(name) && !/^binormal(?:[1-9][0-9]*)?$/u.test(name)) return defaultCount;

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

function buildDecl(vertex, options = {})
{
    const decl = [];
    let offset = 0;
    const vertexCount = (vertex.position ?? []).length / 3;
    const dynamicChannels = [];
    for (const name of Object.keys(vertex))
    {
        const match = /^(normal|tangent|binormal|texcoord|color)([0-9]+)$/u.exec(name);
        if (match)
        {
            const usage = {
                normal: "Normal",
                tangent: "Tangent",
                binormal: "Binormal",
                texcoord: "TexCoord",
                color: "Color"
            }[match[1]];
            const defaultCount = usage === "TexCoord" ? 2 : usage === "Color" ? 4 : 3;
            dynamicChannels.push([ name, usage, defaultCount, Number(match[2]) ]);
        }
    }
    dynamicChannels.sort((left, right) =>
        Usage.indexOf(left[1]) - Usage.indexOf(right[1]) ||
        left[3] - right[3]);

    for (const channel of [
        [ "position", "Position", 3 ],
        [ "normal", "Normal", 3 ],
        [ "tangent", "Tangent", 3 ],
        [ "binormal", "Binormal", 3 ],
        ...dynamicChannels,
        [ "blendIndice", "BoneIndices", 4, 0, options.boneIndexType ?? "UInt16" ],
        [ "blendWeight", "BoneWeights", 4, 0 ],
        [ "packedTangent", "PackedTangent", 4, 0, "Int16Norm" ],
        [ "packedTangentLegacy", "PackedTangentLegacy", 4, 0, "UInt16Norm" ]
    ])
    {
        const [ name, usage, defaultCount, usageIndex = 0, type = "Float32" ] = channel;
        if (!Array.isArray(vertex[name]) || vertex[name].length === 0)
        {
            continue;
        }

        const direction4 = /^(?:tangent|binormal)(?:[1-9][0-9]*)?$/u.test(name);
        const count = (direction4 || usage === "Color") &&
            vertexCount > 0 && vertex[name].length === vertexCount * 4
            ? 4
            : usage === "Color" && vertexCount > 0 && vertex[name].length === vertexCount * 3
                ? 3
                : defaultCount;

        decl.push({ usage, usageIndex, type, elementCount: count, offset });
        offset += count * elementTypeSize(type);
    }
    return decl;
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
            dataIsDeltas: false,
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
            firstElement: group.firstElement,
            elementCount: group.elementCount,
            pointCount: group.pointCount,
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
