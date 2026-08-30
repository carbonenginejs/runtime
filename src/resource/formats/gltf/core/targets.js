export { CMF_CLASS_KEYS } from "../../cmf/core/constants.js";

import { bytesPerIndex, firstTriangle, totalIndexCount } from "../../cmf/core/utils/indices.js";
import { elementTypeSize, estimateStrideFromDecl } from "../../cmf/core/utils/vertex.js";

/**
 * Builds a CMF document from normalized shared geometry for the glTF
 * shared-geometry adapter.
 */
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
        stride = estimateVertexStride(vertex),
        vertexCount = stride === 0 ? 0 : Math.floor((vertex.position ?? []).length / 3);

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
            morphTargets: [],
            threshold: 0xffffffff,
            vertex,
            indices
        } ],
        areas: indices.map((group) => ({
            name: group.name ?? "",
            bounds: bounds(mesh),
            bones: [],
            affectedByBones: false,
            affectedByMorphTargets: false
        })),
        boneBindings: [],
        morphTargets: { decl: [], targets: [] },
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

function buildDecl(vertex)
{
    const decl = [];
    let offset = 0;
    for (const channel of [
        [ "position", "Position", 3 ],
        [ "normal", "Normal", 3 ],
        [ "tangent", "Tangent", 3 ],
        [ "binormal", "Binormal", 3 ],
        [ "texcoord0", "TexCoord", 2, 0 ],
        [ "texcoord1", "TexCoord", 2, 1 ],
        [ "color0", "Color", 4, 0 ],
        [ "blendIndice", "BoneIndices", 4, 0, "UInt16" ],
        [ "blendWeight", "BoneWeights", 4, 0 ]
    ])
    {
        const [ name, usage, elementCount, usageIndex = 0, type = "Float32" ] = channel;
        if (!Array.isArray(vertex[name]) || vertex[name].length === 0) continue;
        decl.push({ usage, usageIndex, type, elementCount, offset });
        offset += elementCount * elementTypeSize(type);
    }
    return decl;
}

function estimateVertexStride(vertex)
{
    return estimateStrideFromDecl(buildDecl(vertex));
}

function bounds(mesh)
{
    return {
        min: mesh.minBounds ?? [ 0, 0, 0 ],
        max: mesh.maxBounds ?? [ 0, 0, 0 ]
    };
}
