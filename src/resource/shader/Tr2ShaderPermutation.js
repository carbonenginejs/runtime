// Source: trinity/trinity/Resources/Tr2EffectRes.h
// Schema: format-carbon resources/Tr2ShaderPermutation.json; maintained by runtime-resource.
import { CjsSchema, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/**
 * Describes one authored effect permutation and the option values a shader
 * resolver may select.
 *
 * This is resource metadata only. Backend shader compilation and pipeline
 * realization remain engine responsibilities.
 */
export class Tr2ShaderPermutation extends CjsModel
{

  /** Authored permutation name. */
  name = "";

  /** Ordered option names accepted by the permutation. */
  options = [];

  /** Index of the option selected when a caller supplies no override. */
  defaultOption = 0;

  /** Human-readable description retained from the effect resource. */
  description = "";

  /** Carbon permutation category value. */
  type = 0;

}

// Declared imperatively rather than with decorators, so this module stays
// plain ESM that loads from source without a transform. The decorator
// expressions are reused verbatim, so the registered metadata is identical.
// Statics belong in `methods`: decorateMethod targets the prototype and
// would register a static as an instance field.
CjsSchema.define(Tr2ShaderPermutation, {
  className: "Tr2ShaderPermutation",
  family: "resources"
});
CjsSchema.decorateField(Tr2ShaderPermutation, "name", type.string);
CjsSchema.decorateField(Tr2ShaderPermutation, "options", type.list("BlueSharedString"));
CjsSchema.decorateField(Tr2ShaderPermutation, "defaultOption", type.uint64);
CjsSchema.decorateField(Tr2ShaderPermutation, "description", type.string);
CjsSchema.decorateField(Tr2ShaderPermutation, "type", type.uint8);
