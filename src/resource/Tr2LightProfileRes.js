// Source: trinity/trinity/Resources/Tr2LightProfileRes.h
import { CjsSchema } from "#schema";
import { CjsResource } from "./CjsResource.js";
import { assertResourcePayloadObject } from "./resourceBoundary.js";
import { ResourceRequirement } from "./ResourceRequirement.js";

/**
 * Runtime-owned light-profile resource.
 *
 * The attached plain payload may be richer than the data retained by the
 * resource or active engine adapter.
 */
export class Tr2LightProfileRes extends CjsResource
{
  /** Updates payload in the current resource payload lifecycle. */
  SetPayload(payload = null)
  {
    if (payload === null)
    {
      super.SetPayload(null);
      return this;
    }
    assertResourcePayloadObject("Tr2LightProfileRes", payload);
    super.SetPayload(payload);
    return this;
  }

  static payload = ResourceRequirement.LIGHT_PROFILE;
}

CjsSchema.define(Tr2LightProfileRes, {
  className: "Tr2LightProfileRes",
  family: "resources"
});
