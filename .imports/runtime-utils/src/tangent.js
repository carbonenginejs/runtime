/**
 * Packed tangent-frame helpers for CarbonEngineJS/GR2-style mesh data.
 *
 * The packed-frame constants and decode/encode behavior are based on observed
 * Fenris Creations (CCP Games) shader behavior for EVE/Carbon packed tangent
 * frames. No shader source is included here.
 */

import {
    generateBiNormals,
    generateNormals,
    generateTangentFrames,
    generateTangents
} from "./mesh.js";
import {
    EPSILON,
    clamp
} from "./num.js";
import {
    cross,
    dot,
    length as vec3Length,
    normalize
} from "gl-matrix/esm/vec3.js";

/** Full-turn float32 constant used by the CCP tangent-frame shader. */
export const TANGENT_TAU = 6.28318548;

/** Half-turn float32 constant used by the CCP tangent-frame shader. */
export const TANGENT_PI = 3.14159274;

const
    TAU = TANGENT_TAU,
    PI = TANGENT_PI,
    POLAR_EPSILON = 1e-6;

/**
 * Packed UNorm sentinel used for vertices with no authored tangent frame.
 *
 * @type {number[]}
 */
export const NULL_TANGENT_UNORM = Object.freeze([ 0, 1, 0, 1 ]);

/**
 * Test whether a packed tangent payload is the null-frame sentinel.
 *
 * @param {ArrayLike<number>} u Four UNorm values.
 * @returns {boolean} Whether the payload marks a missing authored frame.
 */
export function isNullTangent(u)
{
    const
        e1 = u[1],
        e3 = u[3];

    return (e1 <= 1e-3 || e1 >= 1 - 1e-3) && (e3 <= 1e-3 || e3 >= 1 - 1e-3);
}

const
    scratchT = new Float64Array(3),
    scratchB = new Float64Array(3),
    scratchN = new Float64Array(3);

function decodeTangentFrameInto(u0, u1, u2, u3, outT, outB, outN)
{
    const
        a0 = u0 * TAU - PI,
        a1 = u1 * TAU - PI,
        a2 = u2 * TAU - PI,
        a3 = u3 * TAU - PI,
        s1 = Math.abs(Math.sin(a1)),
        s3 = Math.abs(Math.sin(a3));

    outT[0] = s1 * Math.cos(a0);
    outT[1] = s1 * Math.sin(a0);
    outT[2] = Math.cos(a1);

    outB[0] = s3 * Math.cos(a2);
    outB[1] = s3 * Math.sin(a2);
    outB[2] = Math.cos(a3);

    const sign = (a1 > 0 && a3 > 0) ? 1 : -1;
    outN[0] = (outT[1] * outB[2] - outT[2] * outB[1]) * sign;
    outN[1] = (outT[2] * outB[0] - outT[0] * outB[2]) * sign;
    outN[2] = (outT[0] * outB[1] - outT[1] * outB[0]) * sign;

    return s1 < 1e-6 && s3 < 1e-6;
}

/**
 * Decode a packed tangent frame.
 *
 * @param {ArrayLike<number>} u Four UNorm values in `[0, 1]`.
 * @returns {{T: number[], B: number[], N: number[], null: boolean}} Decoded basis.
 */
export function decodeTangentFrame(u)
{
    const isNull = decodeTangentFrameInto(u[0], u[1], u[2], u[3], scratchT, scratchB, scratchN);
    return { T: Array.from(scratchT), B: Array.from(scratchB), N: Array.from(scratchN), null: isNull };
}

/**
 * Encode a tangent frame back to four UNorm angles.
 *
 * @param {ArrayLike<number>} T Unit tangent.
 * @param {ArrayLike<number>} B Unit binormal.
 * @param {ArrayLike<number>} [N] Unit normal; only handedness is used.
 * @returns {number[]} Four UNorm values in `[0, 1]`.
 */
export function encodeTangentFrame(T, B, N)
{
    let a0 = Math.atan2(T[1], T[0]),
        a1 = Math.acos(clamp(T[2], -1, 1));

    const a2 = Math.atan2(B[1], B[0]);
    let a3 = Math.acos(clamp(B[2], -1, 1));

    const negativeHandedness = N && dot(N, cross([ 0, 0, 0 ], T, B)) < 0;
    if (negativeHandedness)
    {
        a1 = a1 === 0 ? -POLAR_EPSILON : -a1;
    }
    else
    {
        if (a1 === 0) a1 = POLAR_EPSILON;
        if (a3 === 0) a3 = POLAR_EPSILON;
    }

    const enc = angle => clamp((angle + PI) / TAU, 0, 1);
    return [ enc(a0), enc(a1), enc(a2), enc(a3) ];
}

function vertexCount(mesh)
{
    const p = mesh.vertex && mesh.vertex.position;
    return p ? (p.length / 3) | 0 : 0;
}

/**
 * Is this shared JSON mesh's tangent frame packed?
 *
 * @param {object} mesh Shared JSON mesh.
 * @returns {boolean} Whether the mesh has packed tangent frames.
 */
export function isPacked(mesh)
{
    const v = mesh.vertex;
    if (!v || !v.tangent || !v.tangent.length) return false;

    const n = vertexCount(mesh);
    if (!n) return false;

    const
        comps = v.tangent.length / n,
        empty = value => !value || value.length === 0;

    return comps === 4 && empty(v.normal) && empty(v.binormal);
}

/**
 * Unpack a packed shared JSON mesh in place.
 *
 * @param {object} mesh Shared JSON mesh to mutate.
 * @returns {boolean} Whether unpacking happened.
 */
export function unpackMeshTangents(mesh)
{
    if (!isPacked(mesh)) return false;

    const
        v = mesh.vertex,
        n = vertexCount(mesh),
        src = v.tangent,
        normal = new Array(n * 3),
        tangent = new Array(n * 3),
        binormal = new Array(n * 3);

    for (let i = 0; i < n; i++)
    {
        const
            s = i * 4,
            o = i * 3,
            isNull = decodeTangentFrameInto(src[s], src[s + 1], src[s + 2], src[s + 3], scratchT, scratchB, scratchN);

        if (isNull)
        {
            normal[o] = normal[o + 1] = normal[o + 2] = 0;
            tangent[o] = tangent[o + 1] = tangent[o + 2] = 0;
            binormal[o] = binormal[o + 1] = binormal[o + 2] = 0;
        }
        else
        {
            normal[o] = scratchN[0];
            normal[o + 1] = scratchN[1];
            normal[o + 2] = scratchN[2];
            tangent[o] = scratchT[0];
            tangent[o + 1] = scratchT[1];
            tangent[o + 2] = scratchT[2];
            binormal[o] = scratchB[0];
            binormal[o + 1] = scratchB[1];
            binormal[o + 2] = scratchB[2];
        }
    }

    v.normal = normal;
    v.tangent = tangent;
    v.binormal = binormal;
    return true;
}

/**
 * Pack explicit tangent frames into GR2-style four-component tangent data.
 *
 * @param {ArrayLike<number>} normals Flat xyz normals.
 * @param {ArrayLike<number>} tangents Flat xyz tangents.
 * @param {ArrayLike<number>} binormals Flat xyz binormals.
 * @returns {number[]} Flat xyzw packed tangent-frame values.
 */
export function packTangentFrames(normals, tangents, binormals)
{
    if (normals.length !== tangents.length ||
        normals.length !== binormals.length ||
        normals.length % 3 !== 0)
    {
        throw new Error("packTangentFrames requires matching complete xyz channels");
    }

    const packed = new Array((normals.length / 3) * 4);
    for (let i = 0, o = 0; i < normals.length; i += 3, o += 4)
    {
        const components = [
            normals[i], normals[i + 1], normals[i + 2],
            tangents[i], tangents[i + 1], tangents[i + 2],
            binormals[i], binormals[i + 1], binormals[i + 2]
        ];
        if (!components.every(Number.isFinite))
        {
            throw new Error(`packTangentFrames received non-finite data at vertex ${i / 3}`);
        }

        const
            normal = normalize([ 0, 0, 0 ], components.slice(0, 3)),
            tangent = normalize([ 0, 0, 0 ], components.slice(3, 6)),
            binormal = normalize([ 0, 0, 0 ], components.slice(6, 9)),
            frameNormalLength = vec3Length(cross([ 0, 0, 0 ], tangent, binormal));

        if (vec3Length(normal) <= EPSILON ||
            vec3Length(tangent) <= EPSILON ||
            vec3Length(binormal) <= EPSILON ||
            frameNormalLength <= EPSILON)
        {
            packed[o] = NULL_TANGENT_UNORM[0];
            packed[o + 1] = NULL_TANGENT_UNORM[1];
            packed[o + 2] = NULL_TANGENT_UNORM[2];
            packed[o + 3] = NULL_TANGENT_UNORM[3];
            continue;
        }

        const encoded = encodeTangentFrame(tangent, binormal, normal);
        packed[o] = encoded[0];
        packed[o + 1] = encoded[1];
        packed[o + 2] = encoded[2];
        packed[o + 3] = encoded[3];
    }

    return packed;
}

export const tangent = Object.freeze({
    TAU: TANGENT_TAU,
    PI: TANGENT_PI,
    NULL_TANGENT_UNORM,
    isNull: isNullTangent,
    isNullTangent,
    decode: decodeTangentFrame,
    decodeTangentFrame,
    pack: encodeTangentFrame,
    encode: encodeTangentFrame,
    encodeTangentFrame,
    packTangentFrames,
    unpack: unpackMeshTangents,
    unpackMeshTangents,
    isPacked,
    generateNormals,
    generateTangents,
    generateTangentFrames,
    generateBiNormals
});
