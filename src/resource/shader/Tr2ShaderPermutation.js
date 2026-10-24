// Source: trinity/trinity/Resources/Tr2EffectRes.h
// Schema: format-carbon resources/Tr2ShaderPermutation.json; maintained by the runtime resource layer.

/**
 * Describes one authored effect permutation and the option values a shader
 * resolver may select.
 *
 * This is resource metadata only. Backend shader compilation and pipeline
 * realization remain engine responsibilities.
 */
export class Tr2ShaderPermutation
{
  /** Stable name independent of minification; no registry is required. */
  static className = "Tr2ShaderPermutation";

  /** Authored permutation name. */
  name = "";

  /** Ordered option names accepted by the permutation. */
  options = [];

  /**
   * Index of the option selected when a caller supplies no override. Carbon
   * leaves it unset (Resources/Tr2EffectRes.h:22).
   */
  defaultOption = 0;

  /** Human-readable description retained from the effect resource. */
  description = "";

  /** Carbon permutation category value. Carbon leaves it unset (Resources/Tr2EffectRes.h:24). */
  type = 0;

}
