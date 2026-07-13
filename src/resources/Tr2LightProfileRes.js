// Source: trinity/trinity/Resources/Tr2LightProfileRes.h
import { type } from "@carbonenginejs/core-types/schema";
import { CjsResource } from "../CjsResource.js";

/**
 * Runtime-owned light-profile resource.
 *
 * The attached semantic DTO may be richer than the data retained by the
 * resource or active engine adapter.
 */
@type.define({ className: "Tr2LightProfileRes", family: "resources" })
export class Tr2LightProfileRes extends CjsResource
{
  static payload = "light-profile";
}
