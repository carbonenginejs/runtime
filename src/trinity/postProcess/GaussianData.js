// Source: trinity/trinity/PostProcess/Tr2PostProcessRenderer.h:67-78 (GaussianDistribution::GaussianData)
// Source: trinity/trinity/PostProcess/Tr2PostProcessRenderer.cpp:219-299 (NormalDistribution, CalculateGaussianPassParameters)
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema postProcess/GaussianData.json.).
//
// Carbon's GaussianDistribution namespace holds this struct and the two
// functions that fill it; the functions are statics here. The struct is
// uploaded whole as the bloom upsample constant buffer, so `byteSize` and
// `pack` reproduce its C++ layout: Vector3 + uint32 in the first 16 bytes,
// then MAX_FILTER_STEPS / 2 Vector4s.
import { type } from "#schema";
import { CjsModel } from "#model";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/** `Bloom::MAX_FILTER_STEPS` (Tr2PPBloomEffect.h:10). */
const MAX_FILTER_STEPS = 128;

/** `TRI_PI`. */
const TRI_PI = Math.PI;

/** Carries the packed weights, offsets, and tap count for one Gaussian blur pass. */
@type.define({ className: "GaussianData", family: "postProcess" })
export class GaussianData extends CjsModel
{

  /** overallWeight (Vector3) */
  @type.vec3
  overallWeight = vec3.create();

  /** count (uint32_t) */
  @type.uint32
  count = 0;

  /** weightOffset (Vector4[MAX_FILTER_STEPS / 2]): two weight/offset pairs per entry. */
  @type.array("vec4")
  weightOffset = Array.from({ length: MAX_FILTER_STEPS / 2 }, () => vec4.create());

  /** `sizeof( GaussianData )`: 16 bytes of header, then the Vector4 array. */
  static byteSize = 16 + (MAX_FILTER_STEPS / 2) * 16;

  static MAX_FILTER_STEPS = MAX_FILTER_STEPS;

  /**
   * The struct's bytes as Carbon memcpys them into the constant buffer.
   *
   * @param {GaussianData} data The filled struct.
   * @param {Uint8Array} [out] Destination, at least `byteSize` long.
   * @returns {Uint8Array} `out`.
   */
  static pack(data, out = new Uint8Array(GaussianData.byteSize))
  {
    const view = new DataView(out.buffer, out.byteOffset, GaussianData.byteSize);

    for (let i = 0; i < 3; i++) view.setFloat32(i * 4, data.overallWeight[i], true);
    view.setUint32(12, data.count, true);
    for (let entry = 0; entry < data.weightOffset.length; entry++)
    {
      for (let i = 0; i < 4; i++) view.setFloat32(16 + entry * 16 + i * 4, data.weightOffset[entry][i], true);
    }
    return out;
  }

  /**
   * Carbon GaussianDistribution::NormalDistribution (cpp:222-233): a gaussian
   * lerped towards `1 - x^2` by `weight`, or `(1 - x^2)^weight` above 1.
   *
   * @param {number} x The tap position.
   * @param {number} sigma The radius.
   * @param {number} weight The centre weight.
   * @returns {number} The tap weight.
   */
  static normalDistribution(x, sigma, weight)
  {
    const dx = Math.abs(x);
    const clampedOneMinusDX = Math.max(0, 1 - dx * dx);

    if (weight > 1) return Math.pow(clampedOneMinusDX, weight);

    const gaussian = Math.exp(-TRI_PI * 5 * ((dx * dx) / (sigma * sigma)));
    return gaussian + (clampedOneMinusDX - gaussian) * weight;
  }

  /**
   * Carbon GaussianDistribution::CalculateGaussianPassParameters (cpp:235-298):
   * the taps of one separable blur pass, two bilinear taps folded into each,
   * normalised by the sum of every weight including taps that fall off screen.
   * `direction` is unused by Carbon's body, as here.
   *
   * @param {number} radius Radius in pixels.
   * @param {number} centerWeight The distribution's centre weight.
   * @param {number} normalizingFactor Pixels to texture coordinates.
   * @param {vec3} overallWeight The pass tint.
   * @param {vec2} _direction Unused, as in Carbon.
   * @returns {GaussianData} The filled struct.
   */
  static calculateGaussianPassParameters(radius, centerWeight, normalizingFactor, overallWeight, _direction)
  {
    const clampedRadius = Math.min(Math.max(radius, 0.0001), MAX_FILTER_STEPS - 1);
    const integerRadius = Math.ceil(clampedRadius);

    const taps = [];
    let weightSum = 0;

    for (let i = -integerRadius; i <= integerRadius; i += 2)
    {
      const weight = GaussianData.normalDistribution(i, clampedRadius, centerWeight);

      // The last step must not tap outside the radius (cpp:249-250).
      const offsetWeight = i === integerRadius ? 0 : GaussianData.normalDistribution(i + 1, clampedRadius, centerWeight);

      const sampleWeight = weight + offsetWeight;
      if (sampleWeight === 0) continue;

      const offset = (i + offsetWeight / sampleWeight) * normalizingFactor;

      // Summed even for taps off screen, so on-screen pixels do not brighten.
      weightSum += weight + offsetWeight;

      if (offset < -1 || offset > 1) continue;

      taps.push([ sampleWeight, offset ]);
    }

    // Two taps pack into one Vector4, so the count must be even (cpp:271-275).
    if (taps.length % 2 > 0) taps.push([ 0, 0 ]);

    const data = new GaussianData();
    vec3.copy(data.overallWeight, overallWeight);
    data.count = taps.length / 2;

    let index = 0;
    for (let i = 0; i < taps.length; i += 2)
    {
      vec4.set(data.weightOffset[index++], taps[i][0] / weightSum, taps[i][1], taps[i + 1][0] / weightSum, taps[i + 1][1]);
    }

    return data;
  }

}
