/**
 * Legacy vertex helper container backed by the shared mesh/tangent math.
 *
 * The previous ccpwgl implementation is intentionally not preserved here:
 * normal/tangent generation now delegates to the same helpers used by the GR2,
 * OBJ, glTF, and STL format packages.
 */

import {
    generateBiNormals,
    generateNormals,
    generateTangentFrames,
    generateTangents
} from "./mesh.js";
import { packTangentFrames } from "./tangent.js";

function facesForAreas(indices, areas)
{
    if (!areas || areas.length === 0) return Array.from(indices);

    const faces = [];
    for (const area of areas)
    {
        const
            start = area.start || 0,
            count = area.count === undefined ? indices.length - start : area.count;

        for (let i = start; i < start + count; i++)
        {
            faces.push(indices[i]);
        }
    }
    return faces;
}

/**
 * Calculate area-weighted vertex normals.
 *
 * @param {ArrayLike<number>} indices Flat triangle indices.
 * @param {ArrayLike<number>} positions Flat xyz positions.
 * @returns {number[]} Flat xyz normals.
 */
export function calculateNormals(indices, positions)
{
    return generateNormals(positions, indices);
}

/**
 * Calculate xyz tangents from positions, normals, UVs, and triangle indices.
 *
 * @param {ArrayLike<number>} indices Flat triangle indices.
 * @param {ArrayLike<number>} positions Flat xyz positions.
 * @param {ArrayLike<number>} uvs Flat uv coordinates.
 * @param {Array<object>} [areas] Optional index ranges to use.
 * @param {ArrayLike<number>} [normals] Flat xyz normals; generated when absent.
 * @returns {number[]} Flat xyz tangents.
 */
export function calculateTangents(indices, positions, uvs, areas, normals)
{
    const faces = facesForAreas(indices, areas);
    return generateTangents(
        positions,
        normals && normals.length ? normals : generateNormals(positions, faces),
        uvs,
        faces
    );
}

/**
 * Calculate xyz binormals from normals and tangents.
 *
 * @param {ArrayLike<number>} normals Flat xyz normals.
 * @param {ArrayLike<number>} tangents Flat xyz tangents.
 * @param {object} [options] Generation options.
 * @returns {number[]} Flat xyz binormals.
 */
export function calculateBiNormals(normals, tangents, options)
{
    return generateBiNormals(normals, tangents, options);
}

/**
 * Calculate GR2-style packed tangent frames.
 *
 * @param {ArrayLike<number>} indices Flat triangle indices.
 * @param {ArrayLike<number>} positions Flat xyz positions.
 * @param {ArrayLike<number>} uvs Flat uv coordinates.
 * @param {Array<object>} [areas] Optional index ranges to use.
 * @param {ArrayLike<number>} [normals] Flat xyz normals; generated when absent.
 * @param {object} [options] Generation options.
 * @returns {number[]} Flat xyzw packed tangent-frame values.
 */
export function calculatePackedTangents(indices, positions, uvs, areas, normals, options)
{
    const
        faces = facesForAreas(indices, areas),
        normalValues = normals && normals.length ? normals : generateNormals(positions, faces),
        frame = generateTangentFrames(positions, normalValues, uvs, faces, options);

    return packTangentFrames(normalValues, frame.tangents, frame.binormals);
}

export const vertex = Object.freeze({
    calculateNormals,
    calculateTangents,
    calculateBiNormals,
    calculatePackedTangents
});
