// Source: trinity/trinity/Resources/Tr2GrannyStateRes.h
import { type } from "@carbonenginejs/runtime-utils/schema";
import { CjsResource } from "../CjsResource.js";
import { AssertResourcePayloadObject, ResourcePayloadError } from "./resourceBoundary.js";

/**
 * Runtime-owned GState resource.
 *
 * GState uses the Gr2Reader path but may contain additive skeleton/state data
 * without models. Consumers inspect its plain payload rather than assuming the
 * model-bearing TriGrannyRes payload shape.
 */
@type.define({ className: "Tr2GrannyStateRes", family: "resources" })
export class Tr2GrannyStateRes extends CjsResource
{
  /** Updates payload in the current resource payload lifecycle. */
  SetPayload(payload = null)
  {
    if (payload === null)
    {
      super.SetPayload(null);
      return this;
    }
    AssertResourcePayloadObject("Tr2GrannyStateRes", payload);
    if (!payload.skeleton && !Array.isArray(payload.additiveAnimations))
    {
      throw ResourcePayloadError(
        "Tr2GrannyStateRes",
        "Expected skeleton data or an additiveAnimations array."
      );
    }
    super.SetPayload(payload);
    return this;
  }

  static payload = "granny-state";
}
