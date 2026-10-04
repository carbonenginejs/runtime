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

/**
 * Grows out to the smallest sphere enclosing both spheres, where each is packed (x, y, z, radius). A negative-radius input is ignored, and an empty out is replaced outright rather than merged.
 * @returns {Array} out
 */
export function mergeSphere(out, sphere)
{
  if (!(sphere?.[3] >= 0)) return out;
  if (!(out[3] > 0))
  {
    out.set(sphere);
    return out;
  }
  const dx = sphere[0] - out[0];
  const dy = sphere[1] - out[1];
  const dz = sphere[2] - out[2];
  const distance = Math.hypot(dx, dy, dz);
  if (out[3] >= distance + sphere[3]) return out;
  if (sphere[3] >= distance + out[3])
  {
    out.set(sphere);
    return out;
  }
  const radius = (distance + out[3] + sphere[3]) * 0.5;
  const amount = distance ? (radius - out[3]) / distance : 0;
  out[0] += dx * amount;
  out[1] += dy * amount;
  out[2] += dz * amount;
  out[3] = radius;
  return out;
}
