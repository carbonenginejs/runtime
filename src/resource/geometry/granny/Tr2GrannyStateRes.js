// Source: trinity/trinity/Resources/Tr2GrannyStateRes.h
import { CjsSchema } from "@carbonenginejs/runtime-utils/schema";
import { CjsResource } from "../../CjsResource.js";
import { assertResourcePayloadObject, resourcePayloadError } from "../../resourceBoundary.js";

/**
 * Runtime-owned GState resource.
 *
 * A `.gsf` is a Granny container whose root is a character animation STATE
 * MACHINE rather than geometry: the state graph, the animation slots it binds
 * clips into, and animation sets that reference external `.gr2` animation
 * files by relative path. It carries no geometry and no skeleton — the
 * skeleton lives in the referenced `.gr2`.
 *
 * Carbon's `Tr2GrannyStateRes` holds the parsed container plus a map of those
 * referenced animations loaded as separate `TriGrannyRes`, and binds them
 * through `GStateBindCharacterFileReferences`. `Tr2GStateAnimation` is the
 * consumer: named parameters drive the state machine, active states sample
 * clips from the referenced sets, and the composited pose becomes bone
 * matrices for skinning.
 *
 * THE GUARD THIS REPLACES WAS FABRICATED. It demanded `skeleton` or an
 * `additiveAnimations` array — two fields that appear in no reader output, no
 * Carbon struct, and no schema. `CjsGr2Format.readGsf` returns
 * `{format, container, character, stateMachine, animationSlots, animationSets,
 * uniqueTokenCount, editorData, extendedData}`, so the guard rejected 100% of
 * the only GSF data this organization can produce. It survived because its
 * test built a literal to satisfy the guard rather than reading a file, which
 * is a test proving its own premise.
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
    // The state machine is what makes it a GState. Carbon walks the animation
    // sets straight after, so an absent or malformed set list is worth
    // rejecting here rather than at the first bind.
    if (!payload.stateMachine)
    {
      throw resourcePayloadError(
        "Tr2GrannyStateRes",
        "Expected a GState payload carrying stateMachine."
      );
    }
    if (payload.animationSets !== undefined && !Array.isArray(payload.animationSets))
    {
      throw resourcePayloadError(
        "Tr2GrannyStateRes",
        "animationSets must be an array of animation sets when present."
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
