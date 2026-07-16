// Source: trinity/trinity/Resources/Tr2LightProfileRes.h
import { type } from "@carbonenginejs/core-types/schema";
import { CjsResource } from "../CjsResource.js";
import { AssertResourcePayloadObject } from "./resourceBoundary.js";

/**
 * Runtime-owned light-profile resource.
 *
 * The attached plain payload may be richer than the data retained by the
 * resource or active engine adapter.
 */
@type.define({ className: "Tr2LightProfileRes", family: "resources" })
export class Tr2LightProfileRes extends CjsResource
{
  SetPayload(payload = null)
  {
    if (payload === null)
    {
      super.SetPayload(null);
      return this;
    }
    AssertResourcePayloadObject("Tr2LightProfileRes", payload);
    super.SetPayload(payload);
    return this;
  }

  static payload = "light-profile";
}
