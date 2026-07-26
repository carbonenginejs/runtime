// Source: trinity/trinity/Resources/Tr2EffectRes.h
// Source: trinity/trinity/Resources/Tr2EffectRes.cpp
// Source: trinity/trinity/Resources/Tr2EffectRes_Blue.cpp
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsResource } from "../CjsResource.js";
import { AssertResourcePayloadArray, AssertResourcePayloadObject } from "./resourceBoundary.js";

/**
 * Tr2EffectRes resource record.
 *
 * This stores effect/shader payload facts. Engine-gpu decides shader module,
 * pipeline, bind group, and sampler realization.
 */
@type.define({ className: "Tr2EffectRes", family: "resources" })
export class Tr2EffectRes extends CjsResource
{

  /** Creates a Tr2EffectRes with caller-provided initial state. */
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
   * Attach a plain shader/effect payload.
   *
   * @param {object|null} payload
   * @param {object|null} options
   * @returns {Tr2EffectRes}
   */
  SetPayload(payload = null, options = null)
  {
    if (payload === null)
    {
      super.SetPayload(null);
      return this;
    }
    AssertResourcePayloadObject("Tr2EffectRes", payload);
    AssertResourcePayloadArray("Tr2EffectRes", payload, "permutations");
    super.SetPayload(payload);
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
    const permutations = this.GetPayload()?.permutations;
    return Array.isArray(permutations) ? permutations : [];
  }

  static payload = "shader";

}
