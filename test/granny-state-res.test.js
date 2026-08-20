import assert from "node:assert/strict";
import test from "node:test";

import { CjsFormatStore, Tr2GrannyStateRes, TriGrannyRes } from "../npm/dist/index.js";
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


test("a bound format store answers instead of the caller naming the reader", () =>
{
  // .gr2 and .gsf are the SAME format and the same container - both go through
  // readRawInput, and the suffix only denotes what the Granny root holds. So
  // the routes are registered under both suffixes and CONTENT decides, which is
  // what isGsf is for. Registering readGsf against the .gsf suffix alone would
  // have encoded a naming convention as if it were a format boundary.
  const store = new CjsFormatStore()
    .Register(CjsGr2Format, {
      extensions: [ ".gr2", ".gsf" ],
      read: "readGsf",
      accepts: "isGsf"
    })
    // Geometry is the not-a-state-machine case, and saying so is better than
    // leaving it to Format.isSupported - that answers "is this a Granny file",
    // which is true of both and so separates nothing.
    .Register(CjsGr2Format, {
      extensions: [ ".gr2", ".gsf" ],
      accepts: data => !CjsGr2Format.isGsf(data)
    });

  const resource = new Tr2GrannyStateRes()
    .Initialize("res:/char/gstate/loco.gsf")
    .SetFormatStore(store);

  assert.equal(resource.GetFormatStore(), store);

  const route = resource.ResolveFormat(gsfRaw());
  assert.equal(route.Format, CjsGr2Format);
  assert.equal(route.read, "readGsf", "content selected the state-machine projection");

  resource.DoLoad(gsfRaw());
  assert.ok(resource.GetStateMachine(), "the store-resolved reader produced the document");

  // The same suffix carrying geometry resolves to the ordinary reader, because
  // isGsf says no. The extension never entered into it.
  const geometry = { version: 6, secCount: 8, fileInfo: { Meshes: [], Models: [] } };
  assert.equal(store.Resolve(".gsf", geometry).read, "read");
  assert.equal(store.Resolve(".gr2", gsfRaw()).read, "readGsf");

  // A store that routes nothing for this extension is not a reader.
  const empty = new Tr2GrannyStateRes()
    .Initialize("res:/char/gstate/loco.unknown")
    .SetFormatStore(store);
  assert.equal(empty.ResolveFormat(), null);
  assert.throws(
    () => empty.DoLoad(gsfRaw()),
    error => error.code === "CJS_RESOURCE_FORMAT_REQUIRED"
  );
});


test("a format store binding is a store or nothing", () =>
{
  assert.throws(
    () => new Tr2GrannyStateRes().SetFormatStore({}),
    TypeError,
    "an object that cannot resolve is not a store"
  );
  assert.equal(new Tr2GrannyStateRes().SetFormatStore(null).GetFormatStore(), null);
});


test("a GSF read as geometry succeeds and yields nothing, which is why content must route", () =>
{
  // The asymmetry worth knowing about. projectGsf guards its input and throws
  // on a geometry root, but the geometry path does not guard at all: it walks
  // `json.meshes || []`, so a state machine read as geometry produces a valid
  // document with no meshes and NO ERROR.
  //
  // That is the whole argument for routing on content rather than on the
  // suffix. Get it wrong toward GSF and you get a thrown error; get it wrong
  // toward geometry and you get a model that silently has nothing in it.
  const gsf = gsfRaw();

  assert.equal(CjsGr2Format.isGsf(gsf), true);
  assert.throws(
    () => CjsGr2Format.read(gsf, { emit: "raw" }) && CjsGr2Format.readGsf({ version: 6, secCount: 8, fileInfo: {} }),
    /Granny State root schema/u,
    "the state-machine projection refuses a root that is not one"
  );

  const asGeometry = CjsGr2Format.read(gsf);
  assert.ok(asGeometry, "reading a state machine as geometry does not throw");
  assert.equal((asGeometry.meshes || []).length, 0, "it just has no meshes");
});


test("an empty Granny container is refused rather than published as a model", () =>
{
  // The other half of the same problem. `CjsGr2Format.read` always builds
  // `meshes`, `models` and `animations`, so a state machine read as geometry
  // produced three empty arrays - and the old guard, which asked only whether
  // the arrays EXISTED, passed it straight through.
  const asGeometry = CjsGr2Format.read(gsfRaw());
  assert.deepEqual(asGeometry.meshes, []);
  assert.deepEqual(asGeometry.models, []);

  assert.throws(
    () => new TriGrannyRes().SetPayload(asGeometry),
    error => error.code === "CJS_RESOURCE_PAYLOAD_INVALID",
    "a container with nothing in it is not geometry"
  );

  // An animation-only .gr2 is a real file and must still load: a GSF's
  // referenced clips are exactly that, and they carry no meshes by design.
  const clip = new TriGrannyRes().SetPayload({
    meshes: [],
    models: [],
    animations: [ { name: "idle" } ]
  });
  assert.equal(clip.GetPayload().animations.length, 1);

  // And ordinary geometry is unaffected.
  assert.ok(new TriGrannyRes().SetPayload({ meshes: [ { name: "hull" } ] }));
});
