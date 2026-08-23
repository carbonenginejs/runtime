/**
 * Small mesh rebuild helpers for shared CarbonEngineJS mesh JSON.
 *
 * These helpers are deliberately framework-free and browser-safe. They accept
 * plain arrays or typed arrays and return plain arrays unless otherwise noted.
 */

import {
    cross,
    length as vec3Length,
    normalize
} from "gl-matrix/esm/vec3.js";

function validatePositions(positions)
{
    if (!positions || positions.length % 3 !== 0)
    {
        throw new Error("Positions must contain complete xyz vertices");
    }
}

function validateIndices(indices, vertexCount)
{
    if (!indices || indices.length % 3 !== 0)
    {
        throw new Error("Indices must contain complete triangles");
    }

    for (let i = 0; i < indices.length; i++)
    {
        if (!Number.isInteger(indices[i]) || indices[i] < 0 || indices[i] >= vertexCount)
        {
            throw new Error(`Invalid vertex index at ${i}`);
        }
    }
}

/**
 * Calculate the unit face normal for a triangle.
 *
 * @param {ArrayLike<number>} a First xyz vertex.
 * @param {ArrayLike<number>} b Second xyz vertex.
 * @param {ArrayLike<number>} c Third xyz vertex.
 * @returns {number[]} Unit triangle normal.
 */
export function triangleNormal(a, b, c)
{
    return triangleNormalTo([ 0, 0, 0 ], a, b, c);
}

/**
 * Calculate a unit face normal into caller-owned storage.
 *
 * @param {ArrayLike<number>} out Receiving xyz vector.
 * @param {ArrayLike<number>} a First xyz vertex.
 * @param {ArrayLike<number>} b Second xyz vertex.
 * @param {ArrayLike<number>} c Third xyz vertex.
 * @returns {ArrayLike<number>} The receiving vector.
 */
export function triangleNormalTo(out, a, b, c)
{
    const
        abX = b[0] - a[0],
        abY = b[1] - a[1],
        abZ = b[2] - a[2],
        acX = c[0] - a[0],
        acY = c[1] - a[1],
        acZ = c[2] - a[2];

    out[0] = abY * acZ - abZ * acY;
    out[1] = abZ * acX - abX * acZ;
    out[2] = abX * acY - abY * acX;

    const length = Math.hypot(out[0], out[1], out[2]);

    if (length > 0)
    {
        out[0] /= length;
        out[1] /= length;
        out[2] /= length;
    }

    return out;
}

/**
 * Twice the area of a triangle.
 *
 * @param {ArrayLike<number>} a First xyz vertex.
 * @param {ArrayLike<number>} b Second xyz vertex.
 * @param {ArrayLike<number>} c Third xyz vertex.
 * @returns {number} Twice the triangle area.
 */
export function triangleArea2(a, b, c)
{
    const normal = [ 0, 0, 0 ];
    cross(
        normal,
        [ b[0] - a[0], b[1] - a[1], b[2] - a[2] ],
        [ c[0] - a[0], c[1] - a[1], c[2] - a[2] ]
    );
    return vec3Length(normal);
}

/**
 * Whether a triangle is degenerate.
 *
 * @param {ArrayLike<number>} a First xyz vertex.
 * @param {ArrayLike<number>} b Second xyz vertex.
 * @param {ArrayLike<number>} c Third xyz vertex.
 * @param {number} [epsilon] Area epsilon.
 * @returns {boolean} True when the triangle has no useful area.
 */
export function isDegenerateTriangle(a, b, c, epsilon = 1e-12)
{
    return triangleArea2(a, b, c) <= epsilon;
}

/**
 * Compute axis-aligned bounds from flat xyz positions.
 *
 * @param {ArrayLike<number>} positions Flat xyz positions.
 * @returns {{minBounds: number[], maxBounds: number[]}} Bounds.
 */
export function computeBoundsFromPositions(positions)
{
    validatePositions(positions);

    if (!positions.length)
    {
        return { minBounds: [ 0, 0, 0 ], maxBounds: [ 0, 0, 0 ] };
    }

    const
        minBounds = [ positions[0], positions[1], positions[2] ],
        maxBounds = [ positions[0], positions[1], positions[2] ];

    for (let i = 3; i < positions.length; i += 3)
    {
        for (let c = 0; c < 3; c++)
        {
            const value = positions[i + c];
            if (value < minBounds[c]) minBounds[c] = value;
            if (value > maxBounds[c]) maxBounds[c] = value;
        }
    }

    return { minBounds, maxBounds };
}

/**
 * Compute axis-aligned bounds from `{ vertices: [[x,y,z], ...] }` triangles.
 *
 * @param {Array<{vertices: Array<ArrayLike<number>>}>} triangles Triangle records.
 * @returns {{minBounds: number[], maxBounds: number[]}} Bounds.
 */
export function computeBoundsFromTriangles(triangles)
{
    if (!triangles.length)
    {
        return { minBounds: [ 0, 0, 0 ], maxBounds: [ 0, 0, 0 ] };
    }

    const
        minBounds = [ Infinity, Infinity, Infinity ],
        maxBounds = [ -Infinity, -Infinity, -Infinity ];

    let hasVertex = false;
    for (const triangle of triangles)
    {
        for (const vertex of triangle.vertices)
        {
            hasVertex = true;
            for (let c = 0; c < 3; c++)
            {
                if (vertex[c] < minBounds[c]) minBounds[c] = vertex[c];
                if (vertex[c] > maxBounds[c]) maxBounds[c] = vertex[c];
            }
        }
    }

    if (!hasVertex)
    {
        return { minBounds: [ 0, 0, 0 ], maxBounds: [ 0, 0, 0 ] };
    }

    return { minBounds, maxBounds };
}

/**
 * Generate area-weighted vertex normals from positions and triangle indices.
 *
 * @param {ArrayLike<number>} positions Flat xyz positions.
 * @param {ArrayLike<number>} indices Flat triangle indices.
 * @returns {Float32Array} Flat xyz normals.
 */
export function generateNormals(positions, indices)
{
    validatePositions(positions);
    validateIndices(indices, positions.length / 3);

    const
        vertexCount = positions.length / 3,
        normals = new Float32Array(positions.length);

    for (let t = 0; t < indices.length; t += 3)
    {
        const
            ia = indices[t] * 3,
            ib = indices[t + 1] * 3,
            ic = indices[t + 2] * 3,
            ax = positions[ia],
            ay = positions[ia + 1],
            az = positions[ia + 2],
            faceNormal = [ 0, 0, 0 ];

        cross(
            faceNormal,
            [ positions[ib] - ax, positions[ib + 1] - ay, positions[ib + 2] - az ],
            [ positions[ic] - ax, positions[ic + 1] - ay, positions[ic + 2] - az ]
        );

        for (const offset of [ ia, ib, ic ])
        {
            normals[offset] += faceNormal[0];
            normals[offset + 1] += faceNormal[1];
            normals[offset + 2] += faceNormal[2];
        }
    }

    for (let i = 0; i < vertexCount; i++)
    {
        const
            offset = i * 3,
            length = Math.hypot(normals[offset], normals[offset + 1], normals[offset + 2]) || 1;

        normals[offset] /= length;
        normals[offset + 1] /= length;
        normals[offset + 2] /= length;
    }

    return normals;
}

/**
 * Generate per-vertex tangents from positions, normals, UVs and indices.
 *
 * @param {ArrayLike<number>} positions Flat xyz positions.
 * @param {ArrayLike<number>} normals Flat xyz normals.
 * @param {ArrayLike<number>} uvs Flat uv coordinates.
 * @param {ArrayLike<number>} indices Flat triangle indices.
 * @returns {Float32Array} Flat xyz tangents.
 */
export function generateTangents(positions, normals, uvs, indices)
{
    validatePositions(positions);

    const
        vertexCount = positions.length / 3,
        tan1 = new Float32Array(vertexCount * 3),
        tan2 = new Float32Array(vertexCount * 3);

    if (!normals || normals.length !== positions.length ||
        !uvs || uvs.length !== vertexCount * 2)
    {
        throw new Error("Tangent channels do not match the vertex count");
    }
    validateIndices(indices, vertexCount);

    for (let t = 0; t < indices.length; t += 3)
    {
        const
            i0 = indices[t],
            i1 = indices[t + 1],
            i2 = indices[t + 2],
            p0 = i0 * 3,
            p1 = i1 * 3,
            p2 = i2 * 3,
            t0 = i0 * 2,
            t1 = i1 * 2,
            t2 = i2 * 2,
            x1 = positions[p1] - positions[p0],
            y1 = positions[p1 + 1] - positions[p0 + 1],
            z1 = positions[p1 + 2] - positions[p0 + 2],
            x2 = positions[p2] - positions[p0],
            y2 = positions[p2 + 1] - positions[p0 + 1],
            z2 = positions[p2 + 2] - positions[p0 + 2],
            s1 = uvs[t1] - uvs[t0],
            v1 = uvs[t1 + 1] - uvs[t0 + 1],
            s2 = uvs[t2] - uvs[t0],
            v2 = uvs[t2 + 1] - uvs[t0 + 1],
            divisor = s1 * v2 - s2 * v1,
            scale = divisor ? 1 / divisor : 0,
            sx = (v2 * x1 - v1 * x2) * scale,
            sy = (v2 * y1 - v1 * y2) * scale,
            sz = (v2 * z1 - v1 * z2) * scale,
            tx = (s1 * x2 - s2 * x1) * scale,
            ty = (s1 * y2 - s2 * y1) * scale,
            tz = (s1 * z2 - s2 * z1) * scale;

        for (const offset of [ p0, p1, p2 ])
        {
            tan1[offset] += sx;
            tan1[offset + 1] += sy;
            tan1[offset + 2] += sz;
            tan2[offset] += tx;
            tan2[offset + 1] += ty;
            tan2[offset + 2] += tz;
        }
    }

    const
        tangents = new Float32Array(vertexCount * 3),
        handedness = new Float32Array(vertexCount);

    for (let i = 0; i < vertexCount; i++)
    {
        const
            offset = i * 3,
            nx = normals[offset],
            ny = normals[offset + 1],
            nz = normals[offset + 2],
            tx = tan1[offset],
            ty = tan1[offset + 1],
            tz = tan1[offset + 2],
            normalDotTangent = nx * tx + ny * ty + nz * tz;

        let ox = tx - nx * normalDotTangent,
            oy = ty - ny * normalDotTangent,
            oz = tz - nz * normalDotTangent;

        const length = Math.hypot(ox, oy, oz) || 1;

        ox /= length;
        oy /= length;
        oz /= length;

        tangents[offset] = ox;
        tangents[offset + 1] = oy;
        tangents[offset + 2] = oz;
        handedness[i] = (
            (ny * oz - nz * oy) * tan2[offset] +
            (nz * ox - nx * oz) * tan2[offset + 1] +
            (nx * oy - ny * ox) * tan2[offset + 2]
        ) < 0 ? -1 : 1;
    }

    Object.defineProperty(tangents, "handedness", { value: handedness });
    return tangents;
}

/**
 * Generate a complete tangent frame while preserving per-vertex UV handedness.
 *
 * @param {ArrayLike<number>} positions Flat xyz positions.
 * @param {ArrayLike<number>} normals Flat xyz normals.
 * @param {ArrayLike<number>} uvs Flat uv coordinates.
 * @param {ArrayLike<number>} indices Flat triangle indices.
 * @param {object} [options] Generation options.
 * @returns {{tangents: Float32Array, binormals: number[], handedness: Float32Array}}
 */
export function generateTangentFrames(positions, normals, uvs, indices, options)
{
    const
        tangents = generateTangents(positions, normals, uvs, indices),
        handedness = tangents.handedness,
        binormals = generateBiNormals(normals, tangents, { ...options, handedness });

    return { tangents, binormals, handedness };
}

/**
 * Generate binormals as normalized `normal x tangent`.
 *
 * @param {ArrayLike<number>} normals Flat xyz normals.
 * @param {ArrayLike<number>} tangents Flat xyz tangents.
 * @param {object} [options] Generation options.
 * @param {"right"|"left"} [options.uvHandedness] Handedness of generated basis.
 * @returns {number[]} Flat xyz binormals.
 */
export function generateBiNormals(normals, tangents, options = {})
{
    if (normals.length !== tangents.length || normals.length % 3 !== 0)
    {
        throw new Error("generateBiNormals requires matching complete xyz channels");
    }

    const
        conventionSign = options.uvHandedness === "left" ? -1 : 1,
        binormals = new Array(normals.length);

    for (let i = 0; i < normals.length; i += 3)
    {
        const
            vertexSign = options.handedness?.[i / 3] ?? tangents.handedness?.[i / 3] ?? 1,
            sign = conventionSign * vertexSign;
        const b = normalize(
            [ 0, 0, 0 ],
            [
                normals[i + 1] * tangents[i + 2] - normals[i + 2] * tangents[i + 1],
                normals[i + 2] * tangents[i] - normals[i] * tangents[i + 2],
                normals[i] * tangents[i + 1] - normals[i + 1] * tangents[i]
            ]
        );
        binormals[i] = b[0] * sign;
        binormals[i + 1] = b[1] * sign;
        binormals[i + 2] = b[2] * sign;
    }

    return binormals;
}

export const mesh = Object.freeze({
    triangleNormal,
    triangleNormalTo,
    triangleArea2,
    isDegenerateTriangle,
    computeBoundsFromPositions,
    computeBoundsFromTriangles,
    generateNormals,
    generateTangents,
    generateTangentFrames,
    generateBiNormals
});
