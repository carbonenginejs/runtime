// Source: trinity/trinity/Resources/Tr2GrannyStateRes.h
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import { CjsResource } from "../../CjsResource.js";
import { assertResourcePayloadObject, resourcePayloadError } from "../../resourceBoundary.js";

/**
 * Runtime-owned GState resource.
 *
 * GState uses the Gr2Reader path but may contain additive skeleton/state data
 * without models. Consumers inspect its plain payload rather than assuming the
 * model-bearing TriGrannyRes payload shape.
 */
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
    assertResourcePayloadObject("Tr2GrannyStateRes", payload);
    if (!payload.skeleton && !Array.isArray(payload.additiveAnimations))
    {
      throw resourcePayloadError(
        "Tr2GrannyStateRes",
        "Expected skeleton data or an additiveAnimations array."
      );
    }
    super.SetPayload(payload);
    return this;
  }

  static payload = "granny-state";
}

CjsSchema.define(Tr2GrannyStateRes, {
  className: "Tr2GrannyStateRes",
  family: "resources"
});
