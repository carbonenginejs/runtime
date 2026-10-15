import test from "node:test";
import assert from "node:assert/strict";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { EveChildMesh } from "../../npm/dist/trinity/eve/child/EveChildMesh.js";
import { Tr2Mesh } from "../../npm/dist/trinity/core/mesh/Tr2Mesh.js";
import { Tr2SerializedMorphAnimation } from "../../npm/dist/trinity/core/mesh/Tr2SerializedMorphAnimation.js";
import { TriGeometryRes } from "../../npm/dist/resource/index.js";
import { localFileSystem } from "../support/localFileSystem.js";

function CreateGeometry(names, baked = names.map(() => false), { loading = false } = {})
{
  const lod = {
    morphTargetNames: names.slice(),
    isBakedMorphTarget: baked.slice()
  };

  // A real resource lifecycle: the mesh is its notify target, and the prepare
  // fence waits on it. Already prepared unless the caller asks for one still
  // loading, which it finishes later with MarkPrepared().
  const resource = new TriGeometryRes();
  if (loading) resource.MarkLoading();
  else resource.MarkPrepared();
  return Object.assign(resource, {
    lod,
    GetPayload()
    {
      return { meshes: [ { lods: [ lod ] } ] };
    },
    GetBoundingBox(_meshIndex, outMin = null, outMax = null)
    {
      const min = [ -1, -1, -1 ];
      const max = [ 1, 1, 1 ];
      if (!outMin && !outMax) return { min, max };
      outMin.set(min);
      outMax.set(max);
      return true;
    }
  });
}

test("Tr2Mesh initializes indexed morph state and preserves exact serialized weights", () =>
{
  const geometry = CreateGeometry([ "Smile", "Blink" ], [ false, true ]);
  const mesh = new Tr2Mesh();
  const smile = new Tr2SerializedMorphAnimation();
  const blink = new Tr2SerializedMorphAnimation();

  smile.name = "Smile";
  smile.weight = 0.25;
  blink.name = "Blink";
  blink.weight = 0.5;
  mesh.serializedMorphAnimations = [ smile, blink ];
  mesh.Initialize();

  mesh.SetGeometryRes(geometry);
  assert.deepEqual(mesh.GetMorphTargetNames(), [ "Smile", "Blink" ]);
  assert.ok(mesh.serializedMorphAnimations.every(value => value instanceof Tr2SerializedMorphAnimation));
  assert.deepEqual(mesh.serializedMorphAnimations.map(value => value.weight), [ 0.25, 0.5 ]);
  assert.equal(mesh.SetMorphTargetWeight("Smile", 1.25), true);
  assert.equal(mesh.GetMorphTargetWeight("Smile"), 1.25);
  assert.equal(mesh.GetMorphTargetWeight("Unknown"), 0);
  assert.equal(mesh.SetMorphTargetWeight("Unknown", 1), false);
  assert.equal(mesh.GetBakedMorphTarget("Blink"), true);
  assert.deepEqual(mesh.GetAllBakedMorphTargetStates(), [ false, true ]);

  const animations = mesh.GetMorphAnimations();
  animations.get("Smile").weight = 99;
  assert.equal(mesh.GetMorphTargetWeight("Smile"), 1.25);

  mesh.SetGeometryRes(null);
  assert.equal(mesh.serializedMorphAnimations[0].weight, 1.25);
  mesh.SetGeometryRes(geometry);
  assert.equal(mesh.GetMorphTargetWeight("Smile"), 1.25);

  mesh.InitializeMorphTargets();
  assert.equal(mesh.GetMorphTargetWeight("Smile"), 1.25);
  geometry.lod.morphTargetNames = [ "Blink", "Smile" ];
  mesh.InitializeMorphTargets();
  assert.deepEqual(mesh.serializedMorphAnimations.map(value => [ value.name, value.weight ]), [
    [ "Blink", 0 ],
    [ "Smile", 0 ]
  ]);
});

test("EveChildMesh merges exact animation morphs and prepares native indexed partitions", () =>
{
  const mesh = new Tr2Mesh();
  mesh.SetGeometryRes(CreateGeometry([ "Smile", "Blink", "Frown" ], [ false, true, false ]));
  mesh.SetMorphTargetWeight("Smile", 0.5);
  mesh.SetMorphTargetWeight("Blink", 0.7);
  mesh.SetMorphTargetWeight("Frown", 0.001);

  const child = new EveChildMesh();
  child.mesh = mesh;
  child.animationUpdater = {
    IsInitialized: () => true,
    GetMorphAnimations: () => new Map([
      [ "Smile", 0.9 ],
      [ "Frown", -1 ],
      [ "Unknown", 5 ]
    ])
  };

  assert.equal(child.UpdateMorphAnimationBuffer(), 2);
  assert.deepEqual(child.GetMorphTargets("all"), [
    { index: 0, weight: 0.9 },
    { index: 1, weight: 0.7 }
  ]);
  assert.deepEqual(child.GetMorphTargets("baked"), [ { index: 1, weight: 0.7 } ]);
  assert.deepEqual(child.GetMorphTargets("runtime"), [
    { index: 0, weight: 0.9 },
    { index: 1, weight: 0.7 }
  ], "before baking, every active morph remains runtime evaluated");

  child.animationUpdater = { IsInitialized: () => false };
  assert.equal(child.UpdateMorphAnimationBuffer(), 3);
  assert.deepEqual(child.GetMorphTargets(2), [
    { index: 0, weight: 0.5 },
    { index: 2, weight: 0.001 },
    { index: 1, weight: 0.7 }
  ]);

  child.UpdateAsyncronous({}, { localToWorldTransform: mat4.create() });
  assert.equal(child.GetMorphTargets("all").length, 3);
});

test("morph preparation rejects invalid values, duplicate names, and unsupported filters", () =>
{
  const mesh = new Tr2Mesh();

  assert.throws(() => mesh.SetGeometryRes(CreateGeometry([ "Smile", "Smile" ])), /duplicate "Smile"/u);
  mesh.SetGeometryRes(CreateGeometry([ "Smile" ]));
  assert.throws(() => mesh.SetMorphTargetWeight("Smile", Number.NaN), /must be finite/u);

  const child = new EveChildMesh();
  child.mesh = {
    GetMorphTargetNames: () => [ "Smile" ],
    GetMorphAnimations: () => new Map([ [ "Smile", { index: 0, weight: Number.NaN } ] ]),
    IsBakedMorph: () => false
  };

  assert.throws(() => child.UpdateMorphAnimationBuffer(), /must be finite/u);
  assert.throws(() => child.GetMorphTargets("unknown"), /Unsupported/u);
});

// Carbon Tr2Mesh::OnModified (cpp:38-58) dispatches on WHICH member changed:
// the path refetches through the resource manager (InitializeGeometryResource,
// cpp:107-138), clearing deferGeometryLoad starts the load a deferred mesh
// skipped, and meshIndex rebuilds the morph targets. None of that existed here
// until 2026-09-17 - SetMeshResPath stored a string and nothing loaded.

test("a mesh res path loads its geometry through the resource manager", async () =>
{
  const { be } = await import("../../npm/dist/global/blue/index.js");
  const { composeStubResMan } = await import("../support/stubResMan.js");
  const previous = be.resMan;
  const requested = [];
  const geometry = CreateGeometry([ "Smile" ]);
  // The slot names the contract, not CjsBlueResMan, so the spy IS the manager.
  composeStubResMan((path, options) => { requested.push([ path, options?.requirement ]); return geometry; });
  try
  {
    const mesh = new Tr2Mesh();
    mesh.SetMeshResPath("res:/hull.gr2");

    assert.equal(requested.length, 1, "the path was not requested");
    assert.equal(requested[0][0], "res:/hull.gr2");
    assert.equal(mesh.GetGeometryResource(), geometry, "the resolved resource was not bound");
    assert.deepEqual(mesh.GetMorphTargetNames?.() ?? [ "Smile" ], [ "Smile" ]);

    // Negative control: a deferred mesh does not load until the flag clears.
    const deferred = new Tr2Mesh();
    deferred.deferGeometryLoad = true;
    deferred.geometryResPath = "res:/deferred.gr2";
    deferred.Initialize();
    assert.equal(requested.length, 1, "a deferred mesh loaded anyway");

    deferred.deferGeometryLoad = false;
    deferred.OnModified("deferGeometryLoad");
    assert.equal(requested.length, 2, "clearing the defer flag did not start the load");
  }
  finally
  {
    be.resMan = previous;
  }
});

// Carbon cpp:113-127: when the authored file is not on disk but a
// <base>_lowdetail<ext> sibling is, the low-detail mesh is taken to render with
// now and the authored one is requested behind it. BePaths->FileExistsLocally
// is the file system; here the res file index answers the same question.

test("a missing mesh falls back to its _lowdetail sibling when the index has one", async () =>
{
  const { be } = await import("../../npm/dist/global/blue/index.js");
  const { composeStubResMan } = await import("../support/stubResMan.js");
  const previousManager = be.resMan;
  const requested = [];
  // The authored mesh is still LOADING - it keeps the mesh as a notify target
  // instead of calling back at once - so the stand-in has something to stand
  // in for. The low-detail sibling is already prepared, so it calls back as
  // soon as it is bound: Carbon's AddNotifyTarget rule (BlueAsyncRes.cpp:274-276).
  let authored = null;
  const answer = path =>
  {
    requested.push(path);
    if (path.includes("_lowdetail")) return CreateGeometry([ "Smile" ]);
    authored = CreateGeometry([ "Smile" ], undefined, { loading: true });
    return authored;
  };

  composeStubResMan(answer);
  be.paths.SetLocalFileSystem(localFileSystem([ "res:/hull_lowdetail.gr2" ]));
  try
  {
    const mesh = new Tr2Mesh();
    mesh.SetMeshResPath("res:/hull.gr2");

    assert.deepEqual(requested, [ "res:/hull_lowdetail.gr2", "res:/hull.gr2" ],
      "the low-detail sibling is taken first, the authored path behind it");
    assert.ok(mesh.lowResGeometry !== null, "no low-detail stand-in was bound");

    assert.ok(mesh.GetGeometryResource() === mesh.lowResGeometry, "the stand-in renders while the authored mesh loads");

    // The authored resource finishing notifies its targets, which retires the
    // stand-in (cpp:192-195).
    assert.ok(mesh.geometry === authored && authored.IsLoading(), "the authored load is bound and still pending");
    authored.MarkPrepared();
    assert.ok(mesh.lowResGeometry === null, "the stand-in outlived the authored mesh");

    // Negative control: when the authored file IS here, no
    // sibling is looked for at all.
    requested.length = 0;
    be.paths.SetLocalFileSystem(localFileSystem([ "res:/present.gr2", "res:/present_lowdetail.gr2" ]));
    new Tr2Mesh().SetMeshResPath("res:/present.gr2");
    assert.deepEqual(requested, [ "res:/present.gr2" ]);

    // Second control: with no local file system installed nothing is presumed
    // to exist, so the authored path is requested alone.
    requested.length = 0;
    be.paths.SetLocalFileSystem(null);
    new Tr2Mesh().SetMeshResPath("res:/hull.gr2");
    assert.deepEqual(requested, [ "res:/hull.gr2" ]);
  }
  finally
  {
    be.paths.SetLocalFileSystem(null);
    be.resMan = previousManager;
  }
});

// Regression, runtime 88c9cd1e. Carbon's OnModified is called once per changed
// MEMBER; ours is called once per WRITE, and a write that names no fields used
// to run every arm - including the geometry refetch, which with no manager
// installed cleared the mesh. Routing AddArea through the managed mutation made
// that happen on an unrelated change.

test("a write that names nothing does not throw away the geometry", async () =>
{
  const { Tr2MeshArea } = await import("../../npm/dist/trinity/index.js");
  const { composeStubResMan } = await import("../support/stubResMan.js");

  // This used to install a NULL manager, so an unwanted refetch showed up as
  // the geometry being cleared. That proved the guard held only while
  // acquisition was impossible. A composed manager that answers is the
  // stronger claim: the geometry survives because nothing refetched, not
  // because a refetch could not have succeeded.
  const stub = composeStubResMan();
  try
  {
    const mesh = new Tr2Mesh();
    const geometry = CreateGeometry([ "Smile" ]);
    mesh.PySetGeometryRes(geometry);
    assert.equal(mesh.GetGeometryResource(), geometry);

    // An unrelated structural change: adding an area settles the mesh.
    mesh.AddArea(0, new Tr2MeshArea());
    assert.equal(mesh.GetGeometryResource(), geometry, "an unrelated write cleared the geometry");

    // A bare settle must not either.
    mesh.OnModified();
    assert.equal(mesh.GetGeometryResource(), geometry, "a bare settle cleared the geometry");

    assert.deepEqual(stub.requests, [], "nothing should have been asked of the manager");

    // Positive control: a path that HAS moved is refetched, and the manager
    // answers, so the mesh takes what it was handed.
    mesh.geometryResPath = "res:/changed.gr2";
    mesh.OnModified("geometryResPath");
    assert.equal(stub.requests.at(-1)?.path, "res:/changed.gr2", "a moved path was not acted on");
    assert.notEqual(mesh.GetGeometryResource(), geometry, "the moved path kept the old geometry");
  }
  finally
  {
    stub.restore();
  }
});
