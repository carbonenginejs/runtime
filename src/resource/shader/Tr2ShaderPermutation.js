// Source: trinity/trinity/Resources/Tr2EffectRes.h
// Schema: format-carbon resources/Tr2ShaderPermutation.json; maintained by the runtime resource layer.
import { CjsSchema, type } from "#schema";

/**
 * Describes one authored effect permutation and the option values a shader
 * resolver may select.
 *
 * This is resource metadata only. Backend shader compilation and pipeline
 * realization remain engine responsibilities.
 */
export class Tr2ShaderPermutation
{

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

// Declared imperatively rather than with decorators, so this module stays
// plain ESM that loads from source without a transform. The decorator
// expressions are reused verbatim, so the registered metadata is identical.
// Statics belong in `methods`: decorateMethod targets the prototype and
// would register a static as an instance field.
CjsSchema.decorateField(Tr2ShaderPermutation, "name", type.string);
CjsSchema.decorateField(Tr2ShaderPermutation, "options", type.list("BlueSharedString"));
CjsSchema.decorateField(Tr2ShaderPermutation, "defaultOption", type.uint64);
CjsSchema.decorateField(Tr2ShaderPermutation, "description", type.string);
CjsSchema.decorateField(Tr2ShaderPermutation, "type", type.uint8);
CjsSchema.meta.carbon("Tr2ShaderPermutation")(Tr2ShaderPermutation);
