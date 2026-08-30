export { CMF_CLASS_KEYS } from "../../cmf/core/constants.js";

import { convertGr2SkeletonsAndAnimations } from "../../cmf/core/gr2Anim.js";
import { bytesPerIndex, firstTriangle, totalIndexCount } from "../../cmf/core/utils/indices.js";
import { canonicalMorphVertex, maxMorphDisplacement } from "../../cmf/core/utils/morph.js";
import { elementTypeSize, estimateStrideFromDecl } from "../../cmf/core/utils/vertex.js";

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

/**
 * Builds a CMF document from normalized shared geometry for the GR2
 * shared-geometry adapter.
 */
export function buildCmfFromShared(root)
{
    const converted = convertGr2SkeletonsAndAnimations(root);
    return {
        version: 1,
        metadata: null,
        meshes: (converted.meshes ?? []).map((mesh) => buildMesh(mesh)),
        skeletons: converted.skeletons,
        animations: converted.animations
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
        skeleton: mesh.skeleton ?? null,
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
            maxDisplacement: target.maxDisplacement ?? maxMorphDisplacement(vertices[index].position ?? [])
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

function bounds(mesh)
{
    return {
        min: mesh.minBounds ?? [ 0, 0, 0 ],
        max: mesh.maxBounds ?? [ 0, 0, 0 ]
    };
}
