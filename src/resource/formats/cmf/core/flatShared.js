import { bytesPerIndex, firstTriangle, totalIndexCount } from "./utils/indices.js";
import { elementTypeSize, estimateStrideFromDecl } from "./utils/vertex.js";

/**
 * Builds a single-LOD CMF document from flat shared geometry: meshes with a
 * `vertex` channel map and index groups, no skeletons, animations or morphs.
 * The OBJ and STL adapters use it; `shared.js` `buildCmfFromShared` is the
 * full route (LODs, skeletons, animations, metadata).
 *
 * @param {object} root Flat shared geometry root.
 * @param {Array<object>} [root.meshes] Meshes with `name`, `vertex`, `indices`, `minBounds` and `maxBounds`.
 * @returns {import("./helpers.js").CmfGraph} The CMF graph, carrying channel data instead of GPU buffers.
 */
export function buildCmfFromFlatShared(root)
{
    return {
        version: 1,
        metadata: null,
        meshes: (root.meshes ?? []).map((mesh) => buildMesh(mesh)),
        skeletons: [],
        animations: []
    };
}
/**
 * Builds one single-LOD CMF mesh from a flat shared mesh.
 *
 * @param {object} mesh Flat shared mesh.
 * @returns {import("./helpers.js").CmfMesh} The CMF mesh.
 */
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

/**
 * Builds a packed Float32 vertex declaration from the populated channels.
 *
 * @param {import("./helpers.js").CmfVertexChannels} vertex Shared vertex channels.
 * @returns {Array<import("./helpers.js").CmfVertexElement>} The declaration.
 */
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
        if ((!Array.isArray(vertex[name]) && !ArrayBuffer.isView(vertex[name])) || !vertex[name].length) continue;
        decl.push({ usage, usageIndex, type, elementCount, offset });
        offset += elementCount * elementTypeSize(type);
    }
    return decl;
}

/**
 * Returns the vertex stride the channels' declaration needs.
 *
 * @param {import("./helpers.js").CmfVertexChannels} vertex Shared vertex channels.
 * @returns {number} Stride in bytes.
 */
function estimateVertexStride(vertex)
{
    return estimateStrideFromDecl(buildDecl(vertex));
}

/**
 * Reads a flat shared mesh's bounds.
 *
 * @param {object} mesh Flat shared mesh with optional `minBounds` and `maxBounds`.
 * @returns {import("./helpers.js").CmfBounds} The bounds, zero when absent.
 */
function bounds(mesh)
{
    return {
        min: mesh.minBounds ?? [ 0, 0, 0 ],
        max: mesh.maxBounds ?? [ 0, 0, 0 ]
    };
}
