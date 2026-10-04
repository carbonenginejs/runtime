import { mat4 } from "#math/mat4";


/**
 * Writes a uniform-scale-plus-translation matrix.
 * @param {Array} [out] - caller-owned mat4; a fresh matrix is allocated when omitted
 * @returns {Array} out
 */
export function translationMatrix(position, out = mat4.create(), scale = 1)
{
  mat4.identity(out);
  out[0] = out[5] = out[10] = scale;
  out[12] = position[0];
  out[13] = position[1];
  out[14] = position[2];
  return out;
}

