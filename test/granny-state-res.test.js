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


test("authored references resolve against the GSF's own directory", () =>
{
  // References are authored relative to the .gsf, so a consumer asking for
  // them verbatim asks for a path that does not exist. Ported from Carbon
  // GetFullAnimPath (Tr2GrannyStateRes.cpp:80-103).
  const owner = "res:/graphics/character/male/gstate/locomotion.gsf";
  const resolve = (reference) => Tr2GrannyStateRes.ResolveAnimPath(reference, owner);

  assert.equal(resolve("../anim/idle.gr2"), "res:/graphics/character/male/anim/idle.gr2");
  assert.equal(resolve("../../shared/walk.gr2"), "res:/graphics/character/shared/walk.gr2");
  assert.equal(resolve("./local.gr2"), "res:/graphics/character/male/gstate/local.gr2");
  assert.equal(resolve("sibling.gr2"), "res:/graphics/character/male/gstate/sibling.gr2");

  // Backslashes are authoring-tool output, not a different meaning.
  assert.equal(resolve("..\\anim\\back.gr2"), "res:/graphics/character/male/anim/back.gr2");

  // An absolute reference cannot have meant anything relative.
  assert.equal(resolve("res:/abs/x.gr2"), "res:/abs/x.gr2");

  // Carbon erases three characters after matching only "..", which would
  // corrupt a name that merely starts with two dots. This does not.
  assert.equal(resolve("..oddname.gr2"), "res:/graphics/character/male/gstate/..oddname.gr2");
});


test("a GState is fully loaded only once every referenced animation has arrived", () =>
{
  const resource = new Tr2GrannyStateRes().Initialize("res:/char/gstate/loco.gsf");

  assert.equal(resource.IsFullyLoaded(), false, "no document yet");

  resource.SetPayload({
    stateMachine: { states: [] },
    animationSets: [
      { index: 0, sourceFileReferences: [ "../anim/idle.gr2", "../anim/walk.gr2" ] },
      { index: 1, sourceFileReferences: [ "../anim/idle.gr2" ] }
    ]
  });

  const paths = resource.GetGStateAnimFileRefPaths();
  assert.deepEqual(paths, [ "res:/char/anim/idle.gr2", "res:/char/anim/walk.gr2" ],
    "references are resolved and deduplicated across sets, in first-seen order");
  assert.equal(resource.IsFullyLoaded(), false);

  resource.SetAnimationResource(paths[0], { name: "idle" });
  assert.equal(resource.IsFullyLoaded(), false, "one clip short is not loaded");

  resource.SetAnimationResource(paths[1], { name: "walk" });
  assert.equal(resource.IsFullyLoaded(), true);
  assert.deepEqual(resource.GetAnimationResource(paths[0]), { name: "idle" });
  assert.equal(resource.GetAnimationResource("res:/nope.gr2"), null);
});


test("DoLoad takes a projection, and refuses bytes without an injected reader", () =>
{
  const projected = CjsGr2Format.readGsf(gsfRaw());

  const fromDocument = new Tr2GrannyStateRes().DoLoad(projected);
  assert.equal(fromDocument.GetStateMachine(), projected.stateMachine);

  const fromBytes = new Tr2GrannyStateRes().DoLoad(gsfRaw(), { format: CjsGr2Format });
  assert.deepEqual(fromBytes.GetAnimationSlots(), [ { Name: "base" } ]);
  assert.ok(fromBytes.GetCharacterInfo());

  // The resource must not import gr2 - that would drag the whole reader into
  // every consumer of GState and destroy the tree-shakeable subpath.
  assert.throws(
    () => new Tr2GrannyStateRes().DoLoad(gsfRaw()),
    error => error.code === "CJS_RESOURCE_FORMAT_REQUIRED",
    "raw input needs a reader supplied, not imported"
  );
});
