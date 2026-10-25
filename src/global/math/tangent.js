/**
 * Packed tangent-frame helpers for CarbonEngineJS/GR2-style mesh data.
 *
 * The packed-frame constants and decode/encode behavior are based on observed
 * Fenris Creations (CCP Games) shader behavior for EVE/Carbon packed tangent
 * frames. No shader source is included here. Carbon's own codecs, both packings
 * (`TangentCompression`), are ported below from mesh/src/cmf/tangents.cpp.
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
import { quat } from "./quat.js";

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
export const NULL_TANGENT_UNORM = [ 0, 1, 0, 1 ];

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
 * Not Carbon's encoder (`packTangentsLegacy` is): for a frame of negative
 * handedness Carbon negates both polar angles, and this only the tangent's,
 * and this nudges a zero polar angle by 1e-6 so its handedness survives, which
 * Carbon does not. Both decode to the same frame; the bytes differ.
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

function vertexCount(mesh, count)
{
    if (count !== undefined) return count;
    const p = mesh.vertex && mesh.vertex.position;
    return p ? (p.length / 3) | 0 : 0;
}

/**
 * Is this shared mesh's tangent frame packed?
 *
 * @param {object} mesh Shared mesh.
 * @param {number} [count] Vertex count when the payload has no position channel.
 * @returns {boolean} Whether the mesh has packed tangent frames.
 */
export function isPacked(mesh, count)
{
    const v = mesh.vertex;
    if (!v || !v.tangent || !v.tangent.length) return false;

    const n = vertexCount(mesh, count);
    if (!n) return false;

    const
        comps = v.tangent.length / n,
        empty = value => !value || value.length === 0;

    return comps === 4 && empty(v.normal) && empty(v.binormal);
}

/**
 * Unpack a packed shared mesh in place.
 *
 * @param {object} mesh Shared mesh to mutate.
 * @param {number} [count] Vertex count when the payload has no position channel.
 * @returns {boolean} Whether unpacking happened.
 */
export function unpackMeshTangents(mesh, count)
{
    if (!isPacked(mesh, count)) return false;

    const
        v = mesh.vertex,
        n = vertexCount(mesh, count),
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

/**
 * Carbon `cmf::TangentCompression` (mesh/include/cmf/tangents.h:35-41): how a
 * tangent frame is packed into four components.
 *
 * - `PackedTangent`: a quaternion, stored as 16-bit signed normalized
 *   integers; CMF usage `PackedTangent`.
 * - `PackedTangentLegacy`: four angles, stored as 16-bit unsigned normalized
 *   integers; CMF usage `PackedTangentLegacy`, and what EVE's granny files carry.
 */
export const TangentCompression = {
    PackedTangent: 0,
    PackedTangentLegacy: 1
};

const
    rotation = new Float64Array(16),
    rotationQuaternion = [ 0, 0, 0, 1 ];

/**
 * Packs a tangent frame as a quaternion, its normal's sign in w.
 *
 * Source: mesh/src/cmf/tangents.cpp:302-325
 * Carbon: PackTangentsQuaternion(Vector3 normal, Vector3 tangent, Vector3 bitangent)
 *
 * A frame of negative handedness, dot(normal, cross(tangent, bitangent)) < 0,
 * has its normal flipped first and w -1. The rows tangent, bitangent, normal
 * make a rotation matrix (`quat.fromRotationMatrix`, Carbon's conversion); the
 * quaternion is normalized and kept with w >= 0, so unpacking can rebuild w.
 *
 * @param {ArrayLike<number>} normal
 * @param {ArrayLike<number>} tangent
 * @param {ArrayLike<number>} bitangent
 * @returns {number[]} x, y, z in [-1, 1], then the normal's sign.
 */
export function packTangentsQuaternion(normal, tangent, bitangent)
{
    const flipNormal = dot(normal, cross([ 0, 0, 0 ], tangent, bitangent)) < 0;
    const sign = flipNormal ? -1 : 1;
    rotation.fill(0);
    for (let axis = 0; axis < 3; axis++)
    {
        rotation[axis] = tangent[axis];
        rotation[4 + axis] = bitangent[axis];
        rotation[8 + axis] = normal[axis] * sign;
    }
    rotation[15] = 1;
    const q = quat.normalize(rotationQuaternion, quat.fromRotationMatrix(rotationQuaternion, rotation));
    const qs = q[3] < 0 ? -1 : 1;
    return [ q[0] * qs, q[1] * qs, q[2] * qs, sign ];
}

/**
 * Unpacks a quaternion-packed tangent frame.
 *
 * Source: mesh/src/cmf/tangents.cpp:328-385
 * Carbon: UnpackTangentsQuaternion(Vector4 t)
 *
 * Carbon's shader-ready form: w = sqrt(clamp(1 - x^2 - y^2 - z^2, 0, 1)), the
 * rows of the quaternion's rotation matrix, and the normal times t.w.
 *
 * @param {ArrayLike<number>} t x, y, z and the normal's sign.
 * @returns {number[][]} normal, tangent, bitangent.
 */
export function unpackTangentsQuaternion(t)
{
    const x = t[0], y = t[1], z = t[2];
    const x2 = x * x, y2 = y * y, z2 = z * z;
    const w = Math.sqrt(clamp(1 - x2 - y2 - z2, 0, 1));
    const xy = x * y * 2, xz = x * z * 2, yz = y * z * 2;
    const xw = x * w * 2, yw = y * w * 2, zw = z * w * 2;
    const tangentOut = [ 1 - 2 * y2 - 2 * z2, xy + zw, xz - yw ];
    const bitangentOut = [ xy - zw, 1 - 2 * x2 - 2 * z2, yz + xw ];
    const normalOut = [ (yw + xz) * t[3], (yz - xw) * t[3], (1 - 2 * x2 - 2 * y2) * t[3] ];
    return [ normalOut, tangentOut, bitangentOut ];
}

/**
 * Packs a tangent frame as four angles.
 *
 * Source: mesh/src/cmf/tangents.cpp:388-413
 * Carbon: PackTangentsLegacy(Vector3 normal, Vector3 tangent, Vector3 bitangent)
 *
 * Each vector's azimuth (atan2 of y and x) and polar angle (acos of z); a frame
 * of negative handedness negates both polar angles. Each angle is remapped from
 * [-pi, pi] to [0, 1]. A zero polar angle cannot carry the sign, as in Carbon.
 *
 * @param {ArrayLike<number>} normal
 * @param {ArrayLike<number>} tangent
 * @param {ArrayLike<number>} bitangent
 * @returns {number[]} Four values in [0, 1].
 */
export function packTangentsLegacy(normal, tangent, bitangent)
{
    const angles = [
        Math.atan2(tangent[1], tangent[0]),
        Math.acos(Math.min(1, Math.max(-1, tangent[2]))),
        Math.atan2(bitangent[1], bitangent[0]),
        Math.acos(Math.min(1, Math.max(-1, bitangent[2])))
    ];
    if (dot(normal, cross([ 0, 0, 0 ], tangent, bitangent)) < 0)
    {
        angles[1] = -angles[1];
        angles[3] = -angles[3];
    }
    return angles.map(angle => clamp((angle + PI) / (PI + PI), 0, 1));
}

/**
 * Unpacks an angle-packed tangent frame.
 *
 * Source: mesh/src/cmf/tangents.cpp:415-437
 * Carbon: UnpackTangentsLegacy(Vector4 t)
 *
 * The normal is cross(bitangent, tangent), negated when both polar angles are
 * positive.
 *
 * @param {ArrayLike<number>} t Four values in [0, 1].
 * @returns {number[][]} normal, tangent, bitangent.
 */
export function unpackTangentsLegacy(t)
{
    const angles = [ 0, 1, 2, 3 ].map(index => t[index] * TAU - PI);
    const sin1 = Math.abs(Math.sin(angles[1])), sin3 = Math.abs(Math.sin(angles[3]));
    const tangentOut = [ Math.cos(angles[0]) * sin1, Math.sin(angles[0]) * sin1, Math.cos(angles[1]) ];
    const bitangentOut = [ Math.cos(angles[2]) * sin3, Math.sin(angles[2]) * sin3, Math.cos(angles[3]) ];
    const normalOut = Array.from(cross([ 0, 0, 0 ], bitangentOut, tangentOut));
    if (angles[3] > 0 && angles[1] > 0)
    {
        for (let axis = 0; axis < 3; axis++) normalOut[axis] = -normalOut[axis];
    }
    return [ normalOut, tangentOut, bitangentOut ];
}

/**
 * Packs a tangent frame by compression.
 *
 * Source: mesh/src/cmf/tangents.cpp:440-447
 * Carbon: PackTangents(TangentCompression compression, const Vector3& normal, const Vector3& tangent, const Vector3& bitangent)
 *
 * @param {number} compression A `TangentCompression`; anything but PackedTangent packs legacy, as in Carbon.
 * @param {ArrayLike<number>} normal
 * @param {ArrayLike<number>} tangent
 * @param {ArrayLike<number>} bitangent
 * @returns {number[]} The four packed components.
 */
export function packTangents(compression, normal, tangent, bitangent)
{
    if (compression === TangentCompression.PackedTangent) return packTangentsQuaternion(normal, tangent, bitangent);
    return packTangentsLegacy(normal, tangent, bitangent);
}

/**
 * Unpacks a tangent frame by compression.
 *
 * Source: mesh/src/cmf/tangents.cpp:449-456
 * Carbon: UnpackTangents(TangentCompression compression, const Vector4& t)
 *
 * @param {number} compression A `TangentCompression`; anything but PackedTangent unpacks legacy, as in Carbon.
 * @param {ArrayLike<number>} t The four packed components.
 * @returns {number[][]} normal, tangent, bitangent.
 */
export function unpackTangents(compression, t)
{
    if (compression === TangentCompression.PackedTangent) return unpackTangentsQuaternion(t);
    return unpackTangentsLegacy(t);
}

export const tangent = {
    TangentCompression,
    packTangentsQuaternion,
    unpackTangentsQuaternion,
    packTangentsLegacy,
    unpackTangentsLegacy,
    packTangents,
    unpackTangents,
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
};
