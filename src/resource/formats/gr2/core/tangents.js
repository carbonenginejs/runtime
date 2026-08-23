/**
 * Tangent-frame helpers backed by @carbonenginejs/runtime/math.
 */

import {
    generateBiNormals,
    generateNormals,
    generateTangents
} from "#math/mesh";
import { clamp } from "#math/num";
import {
    TANGENT_PI,
    TANGENT_TAU,
    NULL_TANGENT_UNORM,
    decodeTangentFrame,
    encodeTangentFrame,
    isNullTangent,
    isPacked,
    unpackMeshTangents
} from "#math/tangent";
import {
    cross as crossInto,
    dot
} from "#math/vec3";

export {
    TANGENT_PI,
    TANGENT_TAU,
    NULL_TANGENT_UNORM,
    clamp,
    decodeTangentFrame,
    encodeTangentFrame,
    generateBiNormals,
    generateNormals,
    generateTangents,
    isNullTangent,
    isPacked,
    unpackMeshTangents,
    dot
};

/**
 * Cross product of two vec3 values.
 *
 * @param {ArrayLike<number>} a Left-hand vector.
 * @param {ArrayLike<number>} b Right-hand vector.
 * @returns {number[]} `a x b`.
 */
export function cross(a, b)
{
    return crossInto([ 0, 0, 0 ], a, b);
}

export const tangents = Object.freeze({
    TAU: TANGENT_TAU,
    PI: TANGENT_PI,
    NULL_TANGENT_UNORM,
    cross,
    dot,
    clamp,
    isNull: isNullTangent,
    isNullTangent,
    decode: decodeTangentFrame,
    decodeTangentFrame,
    pack: encodeTangentFrame,
    encode: encodeTangentFrame,
    encodeTangentFrame,
    unpack: unpackMeshTangents,
    unpackMeshTangents,
    isPacked,
    generateNormals,
    generateTangents,
    generateBiNormals
});
