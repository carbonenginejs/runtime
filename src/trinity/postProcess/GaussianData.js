// Source: trinity/trinity/PostProcess/Tr2PostProcessRenderer.h:67-78 (GaussianDistribution::GaussianData)
// Source: trinity/trinity/PostProcess/Tr2PostProcessRenderer.cpp:219-299 (NormalDistribution, CalculateGaussianPassParameters)
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema postProcess/GaussianData.json.).
//
// Carbon's GaussianDistribution namespace holds this struct and the two
// functions that fill it; the functions are statics here. The struct is
// uploaded whole as the bloom upsample constant buffer, so `byteSize` and
// `pack` reproduce its C++ layout: Vector3 + uint32 in the first 16 bytes,
// then MAX_FILTER_STEPS / 2 Vector4s.
import { meta } from "#schema";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/** `Bloom::MAX_FILTER_STEPS` (Tr2PPBloomEffect.h:10). */
const MAX_FILTER_STEPS = 128;

/** `TRI_PI`. */
const TRI_PI = Math.PI;

/**
 * Carries the packed weights, offsets, and tap count for one Gaussian blur pass.
 * Native GaussianDistribution::GaussianData is a plain aggregate without Blue
 * exposure. Registered typed fields are JavaScript dictionary/inspection only,
 * without persistence flags or query interfaces. Zero-filled storage is a JS
 * construction adapter; native fills the aggregate in its calculator function.
 */
@meta.define({ className: "GaussianData", family: "postProcess" })
export class GaussianData
{

  /**
   * RGB multiplier for the blur output, held in this record's three-component buffer.
   * @type {Float32Array|Float64Array|number[]}
   */
  @meta.type.vec3
  overallWeight = vec3.create();

  /**
   * Number of active weightOffset entries; each encodes two [weight, offset] pairs.
   * @type {number}
   */
  @meta.type.uint32
  count = 0;

  /**
   * Sixty-four separately allocated buffers in [weight0, offset0, weight1, offset1]
   * order. Weights are normalized; offsets use normalized texture coordinates.
   * @type {Array<Float32Array|Float64Array|number[]>}
   */
  @meta.type.array("vec4")
  weightOffset = Array.from({ length: MAX_FILTER_STEPS / 2 }, () => vec4.create());

  /**
   * Packed record size in bytes: a 16-byte header followed by 64 float4 entries.
   * @type {number}
   */
  static byteSize = 16 + (MAX_FILTER_STEPS / 2) * 16;

  /**
   * Calculator tap budget, matching native Bloom::MAX_FILTER_STEPS (128).
   * Two taps share each of the 64 weightOffset entries.
   * @type {number}
   */
  static MAX_FILTER_STEPS = MAX_FILTER_STEPS;

  /**
   * The struct's bytes as Carbon memcpys them into the constant buffer.
   *
   * @param {GaussianData} data The filled struct.
   * @param {Uint8Array} [out] Destination, at least `byteSize` long.
   * @returns {Uint8Array} `out`.
   */
  @meta.ours
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
   * The retained JavaScript number arithmetic uses doubles instead of native
   * float intermediates; the namespace function remains a static JS helper.
   *
   * @param {number} x The tap position.
   * @param {number} sigma The radius.
   * @param {number} weight The centre weight.
   * @returns {number} The tap weight.
   */
  @meta.adapted
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
   * `direction` is unused by Carbon's body, as here. The retained algorithm
   * uses double arithmetic/scratch and reusable output storage rather than
   * native floats and a value return; existing radius/weight guards remain.
   *
   * @param {number} radius Radius in pixels.
   * @param {number} centerWeight The distribution's centre weight.
   * @param {number} normalizingFactor Pixels to texture coordinates.
   * @param {vec3} overallWeight The pass tint.
   * @param {vec2} _direction Unused, as in Carbon.
   * @param {GaussianData} [out] The struct to fill. Adapted: Carbon returns the
   *   struct by value on the stack; a caller running every frame passes one it
   *   keeps, so a pass allocates nothing. Its previous taps are overwritten.
   * @returns {GaussianData} `out`, filled.
   */
  @meta.adapted
  static calculateGaussianPassParameters(radius, centerWeight, normalizingFactor, overallWeight, _direction, out = new GaussianData())
  {
    const clampedRadius = Math.min(Math.max(radius, 0.0001), MAX_FILTER_STEPS - 1);
    const integerRadius = Math.ceil(clampedRadius);

    // Tap weights and offsets as [weight, offset] pairs, in a module scratch of
    // JS numbers (f64, as the arithmetic below), read back before this returns.
    const taps = GaussianData._taps;
    let tapCount = 0;
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

      taps[tapCount * 2] = sampleWeight;
      taps[tapCount * 2 + 1] = offset;
      tapCount += 1;
    }

    // Two taps pack into one Vector4, so the count must be even (cpp:271-275).
    if (tapCount % 2 > 0)
    {
      taps[tapCount * 2] = 0;
      taps[tapCount * 2 + 1] = 0;
      tapCount += 1;
    }

    vec3.copy(out.overallWeight, overallWeight);
    out.count = tapCount / 2;

    let index = 0;
    for (let i = 0; i < tapCount; i += 2)
    {
      vec4.set(out.weightOffset[index++], taps[i * 2] / weightSum, taps[i * 2 + 1], taps[i * 2 + 2] / weightSum, taps[i * 2 + 3]);
    }
    // A reused struct still holds the previous pass's taps; pack uploads every
    // entry, so the tail is zeroed as a fresh struct's is.
    for (; index < out.weightOffset.length; index++) vec4.set(out.weightOffset[index], 0, 0, 0, 0);

    return out;
  }

  /** calculateGaussianPassParameters' tap scratch: [weight, offset] pairs, f64 like its arithmetic. */
  static _taps = new Float64Array(MAX_FILTER_STEPS * 2 + 2);

}

meta.blue.interfaceTable({ interfaces: [], chainTo: null })(GaussianData);
