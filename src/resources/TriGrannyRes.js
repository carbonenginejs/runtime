// Source: trinity/trinity/Resources/TriGrannyRes.h
import { type } from "@carbonenginejs/core-types/schema";
import { CjsResource } from "../CjsResource.js";
import { AssertResourcePayloadObject, ResourcePayloadError } from "./resourceBoundary.js";

/**
 * Runtime-owned Granny resource.
 *
 * The attached plain payload carries decoded Granny data. This resource
 * owns lifecycle identity; reader and engine-specific behavior stays outside.
 */
@type.define({ className: "TriGrannyRes", family: "resources" })
export class TriGrannyRes extends CjsResource
{
  SetPayload(payload = null)
  {
    if (payload === null)
    {
      super.SetPayload(null);
      return this;
    }
    AssertResourcePayloadObject("TriGrannyRes", payload);
    if (!Array.isArray(payload.models) && !Array.isArray(payload.meshes))
    {
      throw ResourcePayloadError(
        "TriGrannyRes",
        "Expected a models or meshes array.",
        "models"
      );
    }
    super.SetPayload(payload);
    return this;
  }

  static payload = "granny";
}
