// Source: trinity/trinity/Resources/Tr2EffectRes.h
// Source: trinity/trinity/Resources/Tr2EffectRes.cpp
// Source: trinity/trinity/Resources/Tr2EffectRes_Blue.cpp
import { carbon, impl, io, type } from "@carbonenginejs/core-types/schema";
import { CjsResource } from "../CjsResource.js";

/**
 * Tr2EffectRes resource record.
 *
 * This stores effect/shader payload facts. Engine-gpu decides shader module,
 * pipeline, bind group, and sampler realization.
 */
@type.define({ className: "Tr2EffectRes", family: "resources" })
export class Tr2EffectRes extends CjsResource
{

  constructor(values = null)
  {
    super();
    this.SetValues(values || {}, {
      markDirty: false,
      skipUpdate: true,
      skipEvents: true
    });
  }

  /**
   * Attach a shader/effect DTO.
   *
   * @param {object|null} dto
   * @param {object|null} options
   * @returns {Tr2EffectRes}
   */
  SetDTO(dto = null, options = null)
  {
    super.SetDTO(dto);
    this.SetValues(options || {});
    return this;
  }

  /**
   * Return a small JSON-friendly permutation description.
   *
   * @returns {Array<*>}
   */
  @carbon.method
  @impl.adapted
  GetPermutationDescription()
  {
    const permutations = this.GetDTO()?.permutations;
    return Array.isArray(permutations) ? permutations : [];
  }

  static payload = "shader";

}
