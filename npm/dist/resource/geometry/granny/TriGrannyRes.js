import { CjsSchema } from '@carbonenginejs/runtime-utils/schema';
import { CjsResource } from '../../CjsResource.js';
import { assertResourcePayloadObject, resourcePayloadError } from '../../resourceBoundary.js';

// Source: trinity/trinity/Resources/TriGrannyRes.h

/**
 * Runtime-owned Granny resource.
 *
 * The attached plain payload carries decoded Granny data. This resource
 * owns lifecycle identity; reader and engine-specific behavior stays outside.
 */
class TriGrannyRes extends CjsResource {
  /** Updates payload in the current resource payload lifecycle. */
  SetPayload(payload = null) {
    if (payload === null) {
      super.SetPayload(null);
      return this;
    }
    assertResourcePayloadObject("TriGrannyRes", payload);
    if (!Array.isArray(payload.models) && !Array.isArray(payload.meshes)) {
      throw resourcePayloadError("TriGrannyRes", "Expected a models or meshes array.", "models");
    }
    super.SetPayload(payload);
    return this;
  }
  static payload = "granny";
}
CjsSchema.define(TriGrannyRes, {
  className: "TriGrannyRes",
  family: "resources"
});

export { TriGrannyRes };
//# sourceMappingURL=TriGrannyRes.js.map
