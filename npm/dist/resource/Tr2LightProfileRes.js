import { CjsSchema } from '@carbonenginejs/runtime-utils/schema';
import { CjsResource } from './CjsResource.js';
import { assertResourcePayloadObject } from './resourceBoundary.js';

// Source: trinity/trinity/Resources/Tr2LightProfileRes.h

/**
 * Runtime-owned light-profile resource.
 *
 * The attached plain payload may be richer than the data retained by the
 * resource or active engine adapter.
 */
class Tr2LightProfileRes extends CjsResource {
  /** Updates payload in the current resource payload lifecycle. */
  SetPayload(payload = null) {
    if (payload === null) {
      super.SetPayload(null);
      return this;
    }
    assertResourcePayloadObject("Tr2LightProfileRes", payload);
    super.SetPayload(payload);
    return this;
  }
  static payload = "light-profile";
}
CjsSchema.define(Tr2LightProfileRes, {
  className: "Tr2LightProfileRes",
  family: "resources"
});

export { Tr2LightProfileRes };
//# sourceMappingURL=Tr2LightProfileRes.js.map
