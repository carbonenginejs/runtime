// Source: trinity/trinity/Resources/TriGrannyRes.h
import { type } from "@carbonenginejs/core-types/schema";
import { CjsResource } from "../CjsResource.js";

/**
 * Runtime-owned Granny resource.
 *
 * The attached semantic DTO carries decoded Granny/CMF data. This resource
 * owns lifecycle identity; reader and engine-specific behavior stays outside.
 */
@type.define({ className: "TriGrannyRes", family: "resources" })
export class TriGrannyRes extends CjsResource
{
  static payload = "granny";
}
