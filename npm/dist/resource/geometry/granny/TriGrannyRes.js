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
    // Emptiness, not absence. The old guard asked whether the arrays EXISTED,
    // and `CjsGr2Format.read` always builds them - so reading a `.gsf` state
    // machine as geometry produced `{ meshes: [], models: [], animations: [] }`,
    // which sailed through and published a model with nothing in it.
    //
    // The Granny container is the same for both, and only content distinguishes
    // them, so this is where the expectation "I am geometry" has to be enforced:
    // the format cannot know what the caller wanted. Animations count, because
    // an animation-only `.gr2` is a real file - a GSF's referenced clips are
    // exactly that, and they carry no meshes by design.
    const empty = value => !Array.isArray(value) || value.length === 0;
    if (empty(payload.models) && empty(payload.meshes) && empty(payload.animations)) {
      throw resourcePayloadError("TriGrannyRes", "Expected models, meshes or animations, and found none. A Granny " + "container carrying none of them is usually a state machine read as " + "geometry - check whether this file is a GState.", "models");
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
