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

const CHANNELS = Object.freeze([
    { name: "position", usage: "Position", elementCount: 3 },
    { name: "normal", usage: "Normal", elementCount: 3 },
    { name: "tangent", usage: "Tangent", elementCount: 4, flexible: true },
    { name: "binormal", usage: "Binormal", elementCount: 4, flexible: true },
    { name: "texcoord0", usage: "TexCoord", elementCount: 2, usageIndex: 0 },
    { name: "texcoord1", usage: "TexCoord", elementCount: 2, usageIndex: 1 },
    { name: "color0", usage: "Color", elementCount: 4, usageIndex: 0 },
    { name: "blendIndice", usage: "BoneIndices", elementCount: 4, usageIndex: 0, type: "UInt16" },
    { name: "blendWeight", usage: "BoneWeights", elementCount: 4, usageIndex: 0 }
]);

export function buildCmfFromShared(root)
{
    return {
        version: 1,
        metadata: null,
        meshes: (root.meshes ?? []).map((mesh) => buildMesh(mesh)),
        skeletons: [],
        animations: []
    };
}

function buildMesh(mesh)
{
    const
        vertex = mesh.vertex ?? {},
        indices = mesh.indices ?? [],
        boneBindings = (mesh.boneBindings ?? []).map((binding) => buildBoneBinding(binding)),
        affectedByBones = boneBindings.length > 0,
        morphTargets = buildMorphTargets(mesh),
        affectedByMorphTargets = morphTargets.targets.length > 0,
        vertexCount = vertexCountOf(vertex),
        stride = estimateVertexStride(vertex, vertexCount);

    return {
        name: mesh.name ?? "",
        decl: buildDecl(vertex),
        lods: [ {
            vb: { index: 1, offset: 0, size: vertexCount * stride, stride },
            ib: { index: 2, offset: 0, size: totalIndexCount(indices) * bytesPerIndex(indices), stride: bytesPerIndex(indices) },
            areas: indices.map((group, index) => ({
                firstElement: firstTriangle(indices, index),
                elementCount: Math.floor((group.faces ?? []).length / 3)
            })),
            morphTargets: morphTargets.lods,
            threshold: 0xffffffff,
            vertex,
            indices
        } ],
        areas: indices.map((group) => ({
            name: group.name ?? "",
            bounds: bounds(mesh),
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
        bounds: bounds(mesh),
        audioOcclusionMesh: {
            vertices: [],
            indices: [],
            bounds: { min: [ 0, 0, 0 ], max: [ 0, 0, 0 ] }
        },
        topology: "TriangleList",
        skeleton: null,
        vertex,
        indices
    };
}

function buildMorphTargets(mesh)
{
    const targets = mesh.morphTargets ?? [];
    if (!targets.length)
    {
        return { decl: [], targets: [], lods: [] };
    }

    const
        baseVertex = mesh.vertex ?? {},
        vertexCount = vertexCountOf(baseVertex),
        specs = morphChannelSpecs(targets, baseVertex, vertexCount),
        decl = buildDeclFromSpecs(specs),
        stride = estimateStrideFromDecl(decl),
        vertices = targets.map((target) => canonicalMorphVertex(baseVertex, target, specs, vertexCount));

    return {
        decl,
        targets: targets.map((target, index) => ({
            name: target.name ?? "",
            maxDisplacement: target.maxDisplacement ?? maxDisplacement(vertices[index].position ?? [])
        })),
        lods: vertices.map((vertex) => ({
            vb: { index: 0, offset: 0, size: vertexCount * stride, stride },
            vertex
        }))
    };
}

function morphChannelSpecs(targets, baseVertex, vertexCount)
{
    return CHANNELS.flatMap((spec) =>
    {
        let elementCount = 0;
        for (const target of targets)
        {
            const
                vertex = target.vertex ?? {},
                values = vertex[spec.name] ?? [];
            if (!values.length) continue;
            const count = targetSourceCount(target, vertexCount);
            elementCount = Math.max(elementCount, channelWidth(spec, vertex, count));
        }
        if (!elementCount) return [];
        if ((baseVertex[spec.name] ?? []).length)
        {
            elementCount = Math.max(elementCount, channelWidth(spec, baseVertex, vertexCount));
        }
        return [ { ...spec, elementCount } ];
    });
}

function canonicalMorphVertex(baseVertex, target, specs, vertexCount)
{
    const
        sourceVertex = target.vertex ?? {},
        vertexIndices = Array.isArray(target.vertexIndices) ? target.vertexIndices : null,
        sourceCount = targetSourceCount(target, vertexCount),
        result = {};

    for (const spec of specs)
    {
        const
            source = sourceVertex[spec.name] ?? [],
            output = new Array(vertexCount * spec.elementCount).fill(0),
            sourceWidth = channelWidth(spec, sourceVertex, sourceCount),
            base = baseVertex[spec.name] ?? [],
            baseWidth = channelWidth(spec, baseVertex, vertexCount),
            rowCount = Math.min(sourceCount, sourceWidth ? Math.floor(source.length / sourceWidth) : 0);

        for (let row = 0; row < rowCount; row++)
        {
            const vertexIndex = vertexIndices ? vertexIndices[row] : row;
            if (!Number.isInteger(vertexIndex) || vertexIndex < 0 || vertexIndex >= vertexCount) continue;

            const count = Math.min(sourceWidth, spec.elementCount);
            for (let component = 0; component < count; component++)
            {
                const
                    sourceValue = source[row * sourceWidth + component],
                    baseValue = base[vertexIndex * baseWidth + component] ?? 0;
                output[vertexIndex * spec.elementCount + component] = target.dataIsDeltas === false
                    ? sourceValue - baseValue
                    : sourceValue;
            }
        }
        result[spec.name] = output;
    }

    return result;
}

function targetSourceCount(target, fallbackCount)
{
    if (Array.isArray(target.vertexIndices)) return target.vertexIndices.length;
    return vertexCountOf(target.vertex ?? {}, fallbackCount);
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

function buildDecl(vertex, vertexCount = vertexCountOf(vertex))
{
    const specs = CHANNELS
        .filter((spec) => Array.isArray(vertex[spec.name]) && vertex[spec.name].length > 0)
        .map((spec) => ({ ...spec, elementCount: channelWidth(spec, vertex, vertexCount) }));
    return buildDeclFromSpecs(specs);
}

function buildDeclFromSpecs(specs)
{
    const decl = [];
    let offset = 0;
    for (const spec of specs)
    {
        const { usage, usageIndex = 0, type = "Float32", elementCount } = spec;
        decl.push({ usage, usageIndex, type, elementCount, offset });
        offset += elementCount * elementTypeSize(type);
    }
    return decl;
}

function channelWidth(spec, vertex, vertexCount)
{
    const values = vertex[spec.name] ?? [];
    if (spec.flexible && vertexCount > 0 && values.length % vertexCount === 0)
    {
        const width = values.length / vertexCount;
        if (width === 3 || width === 4) return width;
    }
    return spec.elementCount;
}

function vertexCountOf(vertex, expectedCount = 0)
{
    if (expectedCount > 0)
    {
        for (const spec of CHANNELS)
        {
            const values = vertex[spec.name] ?? [];
            if (values.length && values.length % expectedCount === 0) return expectedCount;
        }
    }

    for (const spec of CHANNELS)
    {
        const values = vertex[spec.name] ?? [];
        if (!values.length) continue;
        if (spec.flexible)
        {
            if (values.length % spec.elementCount === 0) return values.length / spec.elementCount;
            if (values.length % 3 === 0) return values.length / 3;
        }
        const count = values.length / spec.elementCount;
        if (Number.isInteger(count)) return count;
    }
    return 0;
}

function estimateVertexStride(vertex, vertexCount)
{
    return estimateStrideFromDecl(buildDecl(vertex, vertexCount));
}

function estimateStrideFromDecl(decl)
{
    return decl.reduce((stride, element) => Math.max(stride, element.offset + element.elementCount * elementTypeSize(element.type)), 0);
}

function elementTypeSize(type)
{
    return type === "Float32" ? 4 : type.includes("16") ? 2 : 1;
}

function totalIndexCount(indices)
{
    return indices.reduce((total, group) => total + (group.faces?.length ?? 0), 0);
}

function bytesPerIndex(indices)
{
    return indices.some((group) => group.bytesPerIndex === 4 || (group.faces ?? []).some((index) => index > 0xffff)) ? 4 : 2;
}

function firstTriangle(indices, areaIndex)
{
    let first = 0;
    for (let i = 0; i < areaIndex; i++) first += Math.floor((indices[i].faces ?? []).length / 3);
    return first;
}

function bounds(mesh)
{
    return {
        min: mesh.minBounds ?? [ 0, 0, 0 ],
        max: mesh.maxBounds ?? [ 0, 0, 0 ]
    };
}

function maxDisplacement(deltaPositions)
{
    let max = 0;
    for (let i = 0; i + 2 < deltaPositions.length; i += 3)
    {
        max = Math.max(max, Math.hypot(
            deltaPositions[i],
            deltaPositions[i + 1],
            deltaPositions[i + 2]
        ));
    }
    return max;
}

export function hydrateCmf(root, classes, hydrationOptions = {})
{
    const hydrationClasses = createHydrationClasses(classes, hydrationOptions);
    return hydrate("Root", {
        ...root,
        metadata: root.metadata ? hydrate("Metadata", root.metadata, hydrationClasses) : null,
        meshes: root.meshes.map((mesh) => hydrateMesh(mesh, hydrationClasses)),
        skeletons: root.skeletons.map((skeleton) => hydrate("Skeleton", skeleton, hydrationClasses)),
        animations: root.animations.map((animation) => hydrate("Animation", animation, hydrationClasses))
    }, hydrationClasses, hydrationOptions);
}

function hydrateMesh(mesh, classes)
{
    return hydrate("Mesh", {
        ...mesh,
        decl: mesh.decl.map((element) => hydrate("VertexElement", element, classes)),
        lods: mesh.lods.map((lod) => hydrate("MeshLod", {
            ...lod,
            areas: lod.areas.map((area) => hydrate("LodMeshArea", area, classes)),
            morphTargets: lod.morphTargets.map((target) => hydrate("LodMorphTarget", target, classes))
        }, classes)),
        areas: mesh.areas.map((area) => hydrate("MeshArea", area, classes)),
        boneBindings: mesh.boneBindings.map((binding) => hydrate("BoneBinding", binding, classes)),
        morphTargets: hydrate("MorphTargets", {
            decl: mesh.morphTargets.decl.map((element) => hydrate("VertexElement", element, classes)),
            targets: mesh.morphTargets.targets.map((target) => hydrate("MorphTarget", target, classes))
        }, classes),
        audioOcclusionMesh: hydrate("AudioOcclusionMesh", mesh.audioOcclusionMesh, classes)
    }, classes);
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
        throw new TypeError("CjsFormatGr2 CMF class population requires classes to implement SetValues(values)");
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
