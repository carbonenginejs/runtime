// Source: trinity/trinity/Resources/Tr2GrannyStateRes.h
import { type } from "@carbonenginejs/core-types/schema";
import { CjsResource } from "../CjsResource.js";

/**
 * Runtime-owned GState resource.
 *
 * GState uses the Gr2Reader path but may contain additive skeleton/state data
 * without models. Consumers inspect its semantic DTO rather than assuming the
 * model-bearing TriGrannyRes payload shape.
 */
@type.define({ className: "Tr2GrannyStateRes", family: "resources" })
export class Tr2GrannyStateRes extends CjsResource
{
  static payload = "granny-state";
}
