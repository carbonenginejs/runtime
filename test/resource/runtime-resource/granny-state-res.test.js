import { blue, CjsBlueResMan } from "../../../npm/dist/global/blue/index.js";
import assert from "node:assert/strict";
import test from "node:test";

import { CjsFormatStore, Tr2GrannyStateRes, TriGrannyRes } from "../../../npm/dist/resource/index.js";
import { CjsGr2Format } from "../../../npm/dist/resource/formats/gr2/index.js";
import { configureResourceManager } from "../../support/configuredResMan.js";

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


test("what readGsf produces is what the native GState load accepts", async t =>
{
  const projected = CjsGr2Format.readGsf(gsfRaw());
  const manager = managerFor(t, projected);
  manager.RegisterObjectLoader("gsf", data => data);
  manager.RegisterExtension("gsf", Tr2GrannyStateRes);
  const resource = await manager.FetchResource("res:/state.gsf");
  assert.equal(resource.GetStateMachine(), projected.stateMachine);
  assert.equal(resource.GetAnimationSets(), projected.animationSets);
  assert.equal(manager.GetResourcePayload(resource), null);
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


test("geometry is not mistaken for a GState during native loading", async t =>
{
  const manager = managerFor(t, {models: [], meshes: []});
  manager.RegisterObjectLoader("gsf", data => data);
  manager.RegisterExtension("gsf", Tr2GrannyStateRes);
  await assert.rejects(manager.FetchResource("res:/wrong.gsf"), {code: "CJS_RESOURCE_PAYLOAD_INVALID"});
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
  const resource = new Tr2GrannyStateRes();
  resource._path = "res:/char/gstate/loco.gsf";
  assert.equal(resource.IsFullyLoaded(), false);
  // Query fixture: the native load owns this decoded state file.
  resource._gStateFile = {stateMachine: {states: []}, animationSets: [
    {index: 0, sourceFileReferences: ["../anim/idle.gr2", "../anim/walk.gr2"]},
    {index: 1, sourceFileReferences: ["../anim/idle.gr2"]}
  ]};
  const paths = resource.GetGStateAnimFileRefPaths();
  assert.deepEqual(paths, ["res:/char/anim/idle.gr2", "res:/char/anim/walk.gr2"]);
  assert.equal(resource.IsFullyLoaded(), false);
  resource.SetAnimationResource(paths[0], {name: "idle"});
  assert.equal(resource.IsFullyLoaded(), false);
  resource.SetAnimationResource(paths[1], {name: "walk"});
  assert.equal(resource.IsFullyLoaded(), true);
  assert.deepEqual(resource.GetAnimationResource(paths[0]), {name: "idle"});
  assert.equal(resource.GetAnimationResource("res:/nope.gr2"), null);
});


test("the configured reader supplies GState data through the native load hook", async t =>
{
  const manager = managerFor(t, gsfRaw());
  manager.RegisterObjectLoader("gsf", data => CjsGr2Format.readGsf(data));
  manager.RegisterExtension("gsf", Tr2GrannyStateRes);
  const resource = await manager.FetchResource("res:/read.gsf");
  assert.deepEqual(resource.GetAnimationSlots(), [{Name: "base"}]);
  assert.ok(resource.GetCharacterInfo());
});


test("format stores distinguish GState content from geometry in the same container", () =>
{
  const store = new CjsFormatStore().Register(CjsGr2Format, {
    extensions: [".gr2", ".gsf"], read: "readGsf", accepts: "isGsf"
  }).Register(CjsGr2Format, {
    extensions: [".gr2", ".gsf"], accepts: data => !CjsGr2Format.isGsf(data)
  });
  assert.equal(store.Resolve(".gsf", gsfRaw()).read, "readGsf");
  assert.equal(store.Resolve(".gr2", gsfRaw()).read, "readGsf");
  assert.equal(store.Resolve(".gsf", {version: 6, secCount: 8, fileInfo: {Meshes: [], Models: []}}).read, "read");
  assert.equal(store.Resolve(".unknown", gsfRaw()), null);
});


test("native resource families retain no per-resource format-store attachment", () =>
{
  const resource = new Tr2GrannyStateRes();
  assert.equal("SetFormatStore" in resource, false);
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


test("an empty Granny container fails while animation-only and geometry files load", async t =>
{
  // The application's gr2raw route (CjsLibrary's configuration) reads real bytes.
  const manager = managerFor(t, null);
  await configureResourceManager(manager);
  let data = CjsGr2Format.writeShared({meshes: [], models: [], animations: []});
  manager.SetSource({Read: () => data});
  await assert.rejects(manager.FetchResource("res:/empty.gr2", {ex: "raw"}), {code: "CJS_RESOURCE_PAYLOAD_INVALID"});
  data = CjsGr2Format.writeShared({meshes: [], models: [], animations: [{name: "idle"}]});
  const clip = await manager.FetchResource("res:/clip.gr2", {ex: "raw"});
  assert.equal(clip.GetGrannyFile().animations.length, 1);
  data = CjsGr2Format.writeShared({meshes: [{name: "hull"}]});
  assert.ok(await manager.FetchResource("res:/mesh.gr2", {ex: "raw"}));
});

/** Route fixture data through the real native load/prepare path. */
function managerFor(t, data)
{
  const previous = blue.resMan;
  const manager = new CjsBlueResMan({source: {Read: () => data}});
  blue.resMan = manager;
  t.after(() => { try { manager.Clear(); } finally { blue.resMan = previous; } });
  return manager;
}
