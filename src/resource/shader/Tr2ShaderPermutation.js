// Source: trinity/trinity/Resources/Tr2EffectRes.h
// Schema: format-carbon resources/Tr2ShaderPermutation.json; maintained by runtime-resource.
import { type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/**
 * Describes one authored effect permutation and the option values a shader
 * resolver may select.
 *
 * This is resource metadata only. Backend shader compilation and pipeline
 * realization remain engine responsibilities.
 */
@type.define({ className: "Tr2ShaderPermutation", family: "resources" })
export class Tr2ShaderPermutation extends CjsModel
{

  /** Authored permutation name. */
  @type.string
  name = "";

  /** Ordered option names accepted by the permutation. */
  @type.list("BlueSharedString")
  options = [];

  /** Index of the option selected when a caller supplies no override. */
  @type.uint64
  defaultOption = 0;

  /** Human-readable description retained from the effect resource. */
  @type.string
  description = "";

  /** Carbon permutation category value. */
  @type.uint8
  type = 0;

}
