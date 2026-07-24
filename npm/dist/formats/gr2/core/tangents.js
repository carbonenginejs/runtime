import { generateBiNormals, generateTangents, generateNormals } from '@carbonenginejs/runtime-utils/mesh';
export { generateBiNormals, generateNormals, generateTangents } from '@carbonenginejs/runtime-utils/mesh';
import { clamp } from '@carbonenginejs/runtime-utils/num';
export { clamp } from '@carbonenginejs/runtime-utils/num';
import { isPacked, unpackMeshTangents, encodeTangentFrame, decodeTangentFrame, isNullTangent, NULL_TANGENT_UNORM, TANGENT_PI, TANGENT_TAU } from '@carbonenginejs/runtime-utils/tangent';
export { NULL_TANGENT_UNORM, TANGENT_PI, TANGENT_TAU, decodeTangentFrame, encodeTangentFrame, isNullTangent, isPacked, unpackMeshTangents } from '@carbonenginejs/runtime-utils/tangent';
import { dot, cross as cross$1 } from '@carbonenginejs/runtime-utils/vec3';
export { dot } from '@carbonenginejs/runtime-utils/vec3';

/**
 * Tangent-frame helpers backed by @carbonenginejs/runtime-utils.
 */


/**
 * Cross product of two vec3 values.
 *
 * @param {ArrayLike<number>} a Left-hand vector.
 * @param {ArrayLike<number>} b Right-hand vector.
 * @returns {number[]} `a x b`.
 */
function cross(a, b) {
  return cross$1([0, 0, 0], a, b);
}
const tangents = Object.freeze({
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

export { cross, tangents };
//# sourceMappingURL=tangents.js.map
