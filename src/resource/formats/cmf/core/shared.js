import { vec3 } from "../../../../global/math/index.js";
import { convertGr2SkeletonsAndAnimations } from "./gr2Anim.js";
import { Usage } from "./constants.js";
import { canonicalMorphVertex, maxMorphDisplacement } from "./utils/morph.js";
import { bytesPerIndex, firstTriangle, totalIndexCount } from "./utils/indices.js";
import { calculateUvDensities } from "./utils/uvDensity.js";
import { elementTypeSize, estimateStrideFromDecl } from "./utils/vertex.js";

const VERTEX_CHANNELS = [
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
];

/**
 * Builds a CMF document from normalized shared geometry for the CMF format
 * reader.
 *
 * @param {object} input Shared geometry root, or a single shared mesh.
 * @param {object} [options={}] Build options, also passed to the GR2 skeleton and animation conversion.
 * @param {string} [options.boneIndexType] ElementType for BoneIndices; defaults to UInt16.
 * @param {number} [options.sampleRate] GR2 degree-2 curve resample rate in Hz.
 * @returns {import("./helpers.js").CmfGraph} The CMF graph, carrying channel data instead of GPU buffers.
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
 *
 * @param {import("./helpers.js").CmfGraph} raw CMF graph.
 * @param {import("./helpers.js").CmfClasses} classes Constructors used for hydration.
 * @param {import("./helpers.js").CmfHydrationOptions} [hydrationOptions={}] Values forwarded to SetValues.
 * @returns {object} The hydrated shared root, or its plain fields.
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

/**
 * Builds one CMF mesh from a shared mesh and its LODs.
 *
 * @param {object} mesh Shared mesh.
 * @param {object} options Build options.
 * @returns {import("./helpers.js").CmfMesh} The CMF mesh, carrying channel data.
 * @throws {Error} When bone bindings and BoneIndices are not both present or both absent.
 */
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
            bounds: { min: vec3.create(), max: vec3.create() } // alloc: published geometry owns this value beyond the decode call.
        },
        topology,
        skeleton: mesh.skeleton ?? null,
        vertex,
        indices: base.indices,
        indexBuffer: base.indexBuffer
    };
}

/**
 * Returns one normalized shared mesh per LOD, inheriting mesh-level fields
 * and morph targets.
 *
 * @param {object} mesh Shared mesh with optional `lods`.
 * @returns {Array<object>} The LOD sources.
 */
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

/**
 * Builds one LOD from a normalized shared LOD source.
 *
 * @param {object} mesh Shared LOD source.
 * @param {number} index LOD index.
 * @param {object} options Build options.
 * @returns {import("./helpers.js").CmfMeshLod & { decl: Array<import("./helpers.js").CmfVertexElement>, topology: string, morphTargetSet: { decl: Array<import("./helpers.js").CmfVertexElement>, targets: Array<import("./helpers.js").CmfMorphTarget>, lods: Array<import("./helpers.js").CmfLodMorphTarget> }, indexBuffer: ArrayLike<number>|null }} The LOD plus the build-only fields buildMesh strips.
 * @throws {Error} When the topology, vertex count or indices are invalid.
 */
function buildLod(mesh, index, options)
{
    const
        vertex = mesh.vertex ?? {},
        position = vertex.position ?? [],
        decl = buildDecl(vertex, options, mesh.vertexCount),
        stride = estimateStrideFromDecl(decl),
        vertexCount = stride === 0 ? 0 : (mesh.vertexCount ?? Math.floor(position.length / 3)),
        indices = mesh.indices ?? [],
        indexBuffer = mesh.indexBuffer ?? null,
        topology = mesh.topology ?? "TriangleList",
        pointList = topology === "PointList",
        morphTargets = buildMorphTargets(mesh),
        indexStride = pointList ? 0 : bytesPerIndex(indices, indexBuffer);

    if (mesh.vertexCount === undefined && position.length % 3)
    {
        throw new Error("CMF Position channel length must be divisible by three");
    }
    if (!Number.isInteger(vertexCount) || vertexCount < 0) throw new Error("CMF vertexCount must be a non-negative integer");
    if (topology !== "TriangleList" && !pointList)
    {
        throw new Error(`CMF shared geometry topology ${JSON.stringify(topology)} is not supported`);
    }
    if (pointList && totalIndexCount(indices, indexBuffer))
    {
        throw new Error("CMF PointList geometry cannot contain an index buffer");
    }
    if (indexBuffer && (indexBuffer.length % 3 ||
        indexBuffer.some(value => !Number.isInteger(value) || value < 0 || value >= vertexCount)))
    {
        throw new Error("CMF index stream must contain complete triangles within the vertex range");
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
            size: totalIndexCount(indices, indexBuffer) * indexStride,
            stride: indexStride
        },
        areas: buildLodAreas(indices, topology, vertexCount),
        morphTargets: morphTargets.lods,
        morphTargetSet: morphTargets,
        threshold: lodThreshold(mesh, index),
        vertex,
        indices,
        indexBuffer
    };
}

/**
 * Returns a LOD's threshold, defaulting only the first LOD.
 *
 * @param {object} mesh Shared LOD source.
 * @param {number} index LOD index.
 * @returns {number} The threshold.
 * @throws {Error} When a later LOD has no threshold.
 */
function lodThreshold(mesh, index)
{
    if (mesh.threshold !== undefined && mesh.threshold !== null) return mesh.threshold;
    if (index === 0) return 0xffffffff;
    throw new Error(`CMF LOD ${index} requires an explicit descending threshold`);
}

/**
 * Builds one mesh area from authored area data or the LOD geometry.
 *
 * @param {object} mesh Shared mesh.
 * @param {Array<import("./helpers.js").CmfMeshLod & { decl: Array<import("./helpers.js").CmfVertexElement>, topology: string, morphTargetSet: { decl: Array<import("./helpers.js").CmfVertexElement>, targets: Array<import("./helpers.js").CmfMorphTarget>, lods: Array<import("./helpers.js").CmfLodMorphTarget> }, indexBuffer: ArrayLike<number>|null }>} lods Built LODs.
 * @param {import("./helpers.js").CmfIndexGroup} group Base LOD index group.
 * @param {number} areaIndex Area index.
 * @returns {import("./helpers.js").CmfMeshArea} The area.
 */
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

/**
 * Returns the vertex indices an area uses.
 *
 * @param {import("./helpers.js").CmfIndexGroup|undefined} group Index group.
 * @param {string} topology MeshTopology name.
 * @param {number} vertexCount Vertex count, used for point lists.
 * @returns {ArrayLike<number>} The faces, or the point range.
 */
function areaVertexIndices(group, topology, vertexCount)
{
    if (topology !== "PointList") return group?.faces ?? [];
    const first = group?.firstElement ?? 0;
    const count = group?.pointCount ?? group?.elementCount ?? vertexCount;
    return Array.from({ length: count }, (_, index) => first + index);
}

/**
 * Collects the bone binding indices with positive weight in an area.
 *
 * @param {import("./helpers.js").CmfIndexGroup|undefined} group Index group.
 * @param {import("./helpers.js").CmfVertexChannels|undefined} vertex Vertex channels.
 * @param {string} topology MeshTopology name.
 * @returns {Array<number>} The bone indices.
 */
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

/**
 * Tests whether any morph target moves a vertex of the area.
 *
 * @param {import("./helpers.js").CmfIndexGroup|undefined} group Index group.
 * @param {ArrayLike<number>} basePositions Base positions.
 * @param {Array<import("./helpers.js").CmfLodMorphTarget>} morphLods Morph targets with vertex channels.
 * @param {string} topology MeshTopology name.
 * @returns {boolean} True when a morph position differs.
 */
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

/**
 * Computes an area's bounds from its vertices, falling back to the mesh bounds.
 *
 * @param {import("./helpers.js").CmfIndexGroup} group Index group.
 * @param {import("./helpers.js").CmfVertexChannels} vertex Vertex channels.
 * @param {object} mesh Shared mesh.
 * @returns {import("./helpers.js").CmfBounds} The bounds.
 */
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
    const min = vec3.fromValues(Infinity, Infinity, Infinity); // alloc: published geometry owns this value beyond the decode call.
    const max = vec3.fromValues(-Infinity, -Infinity, -Infinity); // alloc: published geometry owns this value beyond the decode call.
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

/**
 * Builds a LOD's area ranges from its index groups.
 *
 * @param {Array<import("./helpers.js").CmfIndexGroup>} groups Index groups.
 * @param {string} topology MeshTopology name.
 * @param {number} vertexCount Vertex count, used for point lists.
 * @returns {Array<import("./helpers.js").CmfLodMeshArea>} The area ranges.
 */
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

/**
 * Compares two vertex declarations element by element.
 *
 * @param {Array<import("./helpers.js").CmfVertexElement>} left Declaration.
 * @param {Array<import("./helpers.js").CmfVertexElement>} right Declaration.
 * @returns {boolean} True when equal.
 */
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

/**
 * Checks that every LOD matches the base LOD's layout and that thresholds
 * descend.
 *
 * @param {Array<import("./helpers.js").CmfMeshLod & { decl: Array<import("./helpers.js").CmfVertexElement>, topology: string, morphTargetSet: { decl: Array<import("./helpers.js").CmfVertexElement>, targets: Array<import("./helpers.js").CmfMorphTarget>, lods: Array<import("./helpers.js").CmfLodMorphTarget> }, indexBuffer: ArrayLike<number>|null }>} lods Built LODs.
 * @throws {Error} When a LOD is incompatible.
 */
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

/**
 * Normalizes a shared mesh's skin and packed tangents, and its morph targets' tangents.
 *
 * @param {object} mesh Shared mesh.
 * @returns {object} The normalized copy.
 */
function normalizeSharedMeshTangents(mesh)
{
    const vertex = normalizeSharedVertex(mesh.vertex ?? {}, mesh.vertexCount);
    const morphTargets = (mesh.morphTargets ?? []).map(target => ({
        ...target,
        vertex: normalizeSharedVertexTangents(target.vertex ?? {}, morphTargetVertexCount(mesh, target))
    }));
    return { ...mesh, vertex, morphTargets };
}

/**
 * Returns the number of rows a morph target supplies.
 *
 * @param {object} mesh Shared mesh.
 * @param {object} target Shared morph target.
 * @returns {number} The row count.
 */
function morphTargetVertexCount(mesh, target)
{
    const indices = target.vertexIndices ?? [];
    if (indices.length) return indices.length;

    const position = target.vertex?.position ?? [];
    if (position.length) return Math.floor(position.length / 3);

    return Math.floor((mesh.vertex?.position ?? []).length / 3);
}

/**
 * Normalizes packed tangents and rigid skin weights.
 *
 * @param {import("./helpers.js").CmfVertexChannels} vertex Vertex channels.
 * @param {number|undefined} vertexCount Explicit vertex count.
 * @returns {import("./helpers.js").CmfVertexChannels} The normalized channels.
 */
function normalizeSharedVertex(vertex, vertexCount)
{
    return normalizeSharedVertexSkin(normalizeSharedVertexTangents(vertex, vertexCount), vertexCount);
}

/**
 * Moves a 4-wide tangent channel without normals or binormals to
 * `packedTangentLegacy`.
 *
 * @param {import("./helpers.js").CmfVertexChannels} vertex Vertex channels.
 * @param {number|undefined} vertexCount Explicit vertex count.
 * @returns {import("./helpers.js").CmfVertexChannels} The input, or a copy with the channel moved.
 */
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
    // Borrow the channel just as position does; the resource owns both graphs.
    return { ...vertex, tangent: [], packedTangentLegacy: tangent };
}

/**
 * Adds rigid (1, 0, 0, 0) weights to BoneIndices that have no BoneWeights.
 *
 * @param {import("./helpers.js").CmfVertexChannels} vertex Vertex channels.
 * @param {number|undefined} vertexCount Explicit vertex count.
 * @returns {import("./helpers.js").CmfVertexChannels} The input, or a copy with weights.
 */
function normalizeSharedVertexSkin(vertex, vertexCount)
{
    const
        positionCount = vertexCount ?? (vertex.position ?? []).length / 3,
        blendIndice = vertex.blendIndice ?? [],
        blendWeight = vertex.blendWeight ?? [];

    if (!positionCount || blendIndice.length !== positionCount * 4 || blendWeight.length)
    {
        return vertex;
    }

    // Carbon CMF treats BoneIndices without BoneWeights as rigid skinning.
    // Its geometry exporters synthesize (1, 0, 0, 0) before targeting formats
    // such as glTF/FBX that require explicit weights.
    const normalized = { ...vertex, blendWeight: new Float32Array(positionCount * 4) }; // alloc: returned rigid weights own data-sized storage.
    for (let i = 0; i < positionCount; i++) normalized.blendWeight[i * 4] = 1;
    return normalized;
}

/**
 * Builds a LOD's morph declaration, target records and per-target buffers.
 *
 * @param {object} mesh Shared LOD source.
 * @returns {{ decl: Array<import("./helpers.js").CmfVertexElement>, targets: Array<import("./helpers.js").CmfMorphTarget>, lods: Array<import("./helpers.js").CmfLodMorphTarget> }} The morph target set.
 * @throws {Error} When targets lack a base position, repeat names, use absent channels or have invalid displacement.
 */
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

/**
 * Lists the known vertex channels plus numbered normal, tangent and
 * binormal channels found on the base or targets, in usage order.
 *
 * @param {import("./helpers.js").CmfVertexChannels} baseVertex Base vertex channels.
 * @param {Array<object>} targets Shared morph targets.
 * @returns {Array<[name: string, usage: string, elementCount: number, usageIndex?: number, type?: string]>} The channel specs.
 */
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

/**
 * Builds a packed morph declaration from channel specs.
 *
 * @param {Array<{ usage: string, usageIndex: number, type: string, elementCount: number }>} specs Channel specs.
 * @returns {Array<import("./helpers.js").CmfVertexElement>} The declaration.
 */
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

/**
 * Returns a morph channel's width, detecting 3- or 4-wide tangent and
 * binormal channels from the targets.
 *
 * @param {object} mesh Shared LOD source.
 * @param {Array<object>} targets Shared morph targets.
 * @param {string} name Channel name.
 * @param {number} defaultCount Default width.
 * @returns {number} The width.
 */
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

/**
 * Builds a bone binding from a shared binding.
 *
 * @param {object} binding Shared binding with `name` and `minBounds`/`maxBounds` or `bounds`.
 * @returns {import("./helpers.js").CmfBoneBinding} The binding.
 */
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

/**
 * Builds a packed vertex declaration from the populated channels.
 *
 * @param {import("./helpers.js").CmfVertexChannels} vertex Vertex channels.
 * @param {object} [options={}] Build options.
 * @param {string} [options.boneIndexType] ElementType for BoneIndices; defaults to UInt16.
 * @param {number} [explicitVertexCount] Vertex count that fixes each channel's width.
 * @returns {Array<import("./helpers.js").CmfVertexElement>} The declaration.
 * @throws {Error} When a channel does not match the explicit vertex count.
 */
function buildDecl(vertex, options = {}, explicitVertexCount)
{
    const decl = [];
    let offset = 0;
    const vertexCount = explicitVertexCount ?? (vertex.position ?? []).length / 3;
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
        // GR2 owns transferable float32 channels; CMF borrows their storage.
        if ((!Array.isArray(vertex[name]) && !ArrayBuffer.isView(vertex[name])) || !vertex[name].length)
        {
            continue;
        }

        const direction4 = /^(?:tangent|binormal)(?:[1-9][0-9]*)?$/u.test(name);
        let count = (direction4 || usage === "Color") &&
            vertexCount > 0 && vertex[name].length === vertexCount * 4
            ? 4
            : usage === "Color" && vertexCount > 0 && vertex[name].length === vertexCount * 3
                ? 3
                : defaultCount;

        // GR2 instance streams may use Position4 and TexCoord4. Carbon retains
        // the authored ArrayWidth (Tr2VertexDefinitionUtilities.cpp:55-56);
        // the shared reader supplies an explicit row count for such layouts.
        if (explicitVertexCount !== undefined)
        {
            count = vertex[name].length / explicitVertexCount;
            if (!Number.isInteger(count) || count < 1 || count > 4)
            {
                throw new Error(`CMF channel ${name} does not match vertexCount`);
            }
        }
        decl.push({ usage, usageIndex, type, elementCount: count, offset });
        offset += count * elementTypeSize(type);
    }
    return decl;
}

/**
 * Reads a shared mesh's bounds.
 *
 * @param {object} mesh Shared mesh with `minBounds`/`maxBounds` or `bounds`.
 * @returns {import("./helpers.js").CmfBounds} The bounds, zero when absent.
 */
function boundsFromShared(mesh)
{
    return {
        min: mesh.minBounds ?? mesh.bounds?.min ?? [ 0, 0, 0 ],
        max: mesh.maxBounds ?? mesh.bounds?.max ?? [ 0, 0, 0 ]
    };
}

/**
 * Converts shared metadata to CMF metadata entries.
 *
 * @param {object|null|undefined} metadata CMF metadata, or a key-value object.
 * @returns {import("./helpers.js").CmfMetadata|null} The metadata, or null.
 */
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

/**
 * Hydrates one CMF mesh as a shared mesh.
 *
 * @param {import("./helpers.js").CmfMesh} mesh CMF mesh.
 * @param {import("./helpers.js").CmfClasses} classes Hydration class map.
 * @returns {object} The hydrated node, or its plain fields.
 */
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
        indexBuffer: mesh.indexBuffer ?? mesh.lods[0]?.indexBuffer ?? null,
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

/**
 * Hydrates metadata and its entries.
 *
 * @param {import("./helpers.js").CmfMetadata} metadata Metadata.
 * @param {import("./helpers.js").CmfClasses} classes Hydration class map.
 * @returns {object} The hydrated node, or its plain fields.
 */
function hydrateMetadata(metadata, classes)
{
    return hydrate("Metadata", {
        entries: metadata.entries.map((entry) => hydrate("MetadataEntry", entry, classes))
    }, classes);
}

/**
 * Hydrates a skeleton.
 *
 * @param {import("./helpers.js").CmfSkeleton} skeleton Skeleton.
 * @param {import("./helpers.js").CmfClasses} classes Hydration class map.
 * @returns {object} The hydrated node, or its plain fields.
 */
function hydrateSkeleton(skeleton, classes)
{
    return hydrate("Skeleton", skeleton, classes);
}

/**
 * Hydrates an animation.
 *
 * @param {import("./helpers.js").CmfAnimation} animation Animation.
 * @param {import("./helpers.js").CmfClasses} classes Hydration class map.
 * @returns {object} The hydrated node, or its plain fields.
 */
function hydrateAnimation(animation, classes)
{
    return hydrate("Animation", animation, classes);
}

/**
 * Creates empty shared vertex channels.
 *
 * @returns {import("./helpers.js").CmfVertexChannels} Empty channels.
 */
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

/**
 * Constructs and populates the class registered for a key, or returns the
 * plain fields when none is registered.
 *
 * @param {string} type Class key.
 * @param {object} fields Field values.
 * @param {import("./helpers.js").CmfClasses} classes Hydration class map.
 * @param {import("./helpers.js").CmfHydrationOptions} [hydrationOptions={}] Values forwarded to SetValues.
 * @returns {object} The populated instance, or `fields`.
 */
function hydrate(type, fields, classes, hydrationOptions = {})
{
    const Class = classes?.[type];
    const options = Object.keys(hydrationOptions).length > 0 ? hydrationOptions : classes?.__hydrationOptions || {};
    return Class ? populate(new Class(), fields, options) : fields;
}

/**
 * Populates an instance through its SetValues.
 *
 * @param {object} instance Instance to populate.
 * @param {object} fields Field values.
 * @param {import("./helpers.js").CmfHydrationOptions} [hydrationOptions={}] Values forwarded to SetValues.
 * @returns {object} The instance.
 * @throws {TypeError} When the instance has no SetValues.
 */
function populate(instance, fields, hydrationOptions = {})
{
    if (!instance || typeof instance.SetValues !== "function")
    {
        throw new TypeError("CjsCmfFormat shared class population requires classes to implement SetValues(values)");
    }
    instance.SetValues(fields, { ...hydrationOptions, skipUpdate: true, skipEvents: true });
    return instance;
}

/**
 * Creates a class map inheriting from the caller's map and carrying the
 * hydration options.
 *
 * @param {import("./helpers.js").CmfClasses} classes Caller class map.
 * @param {import("./helpers.js").CmfHydrationOptions} hydrationOptions Values forwarded to SetValues.
 * @returns {import("./helpers.js").CmfClasses} The derived class map.
 */
function createHydrationClasses(classes, hydrationOptions)
{
    const map = Object.create(classes || null);
    Object.defineProperty(map, "__hydrationOptions", { value: hydrationOptions, enumerable: false });
    return map;
}
