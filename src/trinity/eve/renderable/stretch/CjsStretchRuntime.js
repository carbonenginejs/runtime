import { mat4 } from "#math/mat4";


/** Shared matrix construction for stretch and turret runtime objects. */
export class CjsStretchRuntime
{
  /**
   * Writes a uniform-scale-plus-translation matrix.
   * @param {Array} position - translation vector
   * @param {Array} [out] - caller-owned mat4; a fresh matrix is allocated when omitted
   * @param {number} [scale=1] - uniform scale
   * @returns {Array} out
   */
  static translationMatrix(position, out = mat4.create(), scale = 1)
  {
    mat4.identity(out);
    out[0] = out[5] = out[10] = scale;
    out[12] = position[0];
    out[13] = position[1];
    out[14] = position[2];
    return out;
  }
}
