import assert from "node:assert/strict";
import test from "node:test";

import { Tr2GrannyStateRes } from "../npm/dist/index.js";
import { CjsGr2Format } from "../npm/dist/formats/gr2/index.js";

// The reader and the resource were never tested together, which is how a guard
// demanding fields no reader emits survived. This asserts the join directly.


/** The minimum reflected Granny root `isGsfRaw` accepts as a GState. */
function gsfRaw()
{
  return {
    version: 6,
    secCount: 8,
    fileInfo: {
      StateMachine: { Name: "locomotion", Nodes: [] },
      AnimationSlots: [ { Name: "base" } ],
      AnimationSets: [ { SourceFileReference: "../anim/idle.gr2" } ],
      NumUniqueTokenized: 3,
      ModelNameHint: "male_generic",
      ModelIndexHint: 0
    }
  };
}


test("what readGsf produces is what the GState resource accepts", () =>
{
  // The join nobody checked. The previous guard rejected 100% of this.
  const projected = CjsGr2Format.readGsf(gsfRaw());
  const resource = new Tr2GrannyStateRes();

  resource.SetPayload(projected);

  assert.equal(resource.GetPayload(), projected);
  assert.equal(projected.format, "gsf");
  assert.ok(projected.stateMachine, "the state machine is what makes it a GState");
  assert.ok(Array.isArray(projected.animationSets));
});


test("a GSF carries animation references, not geometry or a skeleton", () =>
{
  // The skeleton lives in the referenced .gr2, which is why the old guard's
  // `skeleton` field could never have been present.
  const projected = CjsGr2Format.readGsf(gsfRaw());

  assert.equal("models" in projected, false);
  assert.equal("meshes" in projected, false);
  assert.equal("skeleton" in projected, false);
  assert.equal("additiveAnimations" in projected, false);
  assert.deepEqual(
    projected.animationSets[0].sourceFileReferences,
    [ "../anim/idle.gr2" ],
    "animation sets name external .gr2 clips by relative path"
  );
});


test("geometry is not mistaken for a GState", () =>
{
  // Tr2GrannyStateRes and TriGrannyRes read the same container family, so the
  // guard is the only thing keeping a .gr2 model payload out.
  const resource = new Tr2GrannyStateRes();

  assert.throws(
    () => resource.SetPayload({ models: [], meshes: [] }),
    error => error.code === "CJS_RESOURCE_PAYLOAD_INVALID",
    "a model-bearing payload is a TriGrannyRes payload, not a GState one"
  );
});
