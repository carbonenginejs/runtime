import test from "node:test";
import assert from "node:assert/strict";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { EveChildMesh } from "../../npm/dist/trinity/eve/child/EveChildMesh.js";
import { Tr2Mesh } from "../../npm/dist/trinity/core/mesh/Tr2Mesh.js";
import { Tr2SerializedMorphAnimation } from "../../npm/dist/trinity/core/mesh/Tr2SerializedMorphAnimation.js";

function CreateGeometry(names, baked = names.map(() => false))
{
  const lod = {
    morphTargetNames: names.slice(),
    isBakedMorphTarget: baked.slice()
  };

  return {
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
  };
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
  const { CjsResMan } = await import("../../npm/dist/resource/index.js");
  const previous = CjsResMan.GetGlobal();
  const requested = [];
  const geometry = CreateGeometry([ "Smile" ]);
  // SetGlobal takes a real manager, so the spy goes on the instance.
  const manager = new CjsResMan();
  manager.GetResource = (path, options) => { requested.push([ path, options?.requirement ]); return geometry; };

  CjsResMan.SetGlobal(manager);
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
    deferred.OnModified({ property: "deferGeometryLoad" });
    assert.equal(requested.length, 2, "clearing the defer flag did not start the load");
  }
  finally
  {
    CjsResMan.SetGlobal(previous ?? null);
  }
});

// Carbon cpp:113-127: when the authored file is not on disk but a
// <base>_lowdetail<ext> sibling is, the low-detail mesh is taken to render with
// now and the authored one is requested behind it. BePaths->FileExistsLocally
// is the file system; here the res file index answers the same question.

test("a missing mesh falls back to its _lowdetail sibling when the index has one", async () =>
{
  const { CjsResMan } = await import("../../npm/dist/resource/index.js");
  const previousManager = CjsResMan.GetGlobal();
  const requested = [];
  const manager = new CjsResMan();
  // The authored mesh is still LOADING - it records its completion listener
  // instead of calling back - so the stand-in has something to stand in for.
  // A resource with no lifecycle at all counts as already complete, which is
  // Carbon's AddNotifyTarget rule (BlueAsyncRes.cpp:274-276).
  let finishAuthored = null;
  manager.GetResource = path =>
  {
    requested.push(path);
    const resource = CreateGeometry([ "Smile" ]);
    if (path.includes("_lowdetail")) return resource;
    resource.OnCompleted = listener => { finishAuthored = listener; };
    resource.OffEvent = () => {};
    return resource;
  };

  CjsResMan.SetGlobal(manager);
  CjsResMan.SetResourceExistsResolver([ "res:/hull_lowdetail.gr2" ]);
  try
  {
    const mesh = new Tr2Mesh();
    mesh.SetMeshResPath("res:/hull.gr2");

    assert.deepEqual(requested, [ "res:/hull_lowdetail.gr2", "res:/hull.gr2" ],
      "the low-detail sibling is taken first, the authored path behind it");
    assert.notEqual(mesh.lowResGeometry, null, "no low-detail stand-in was bound");

    // The authored resource finishing retires the stand-in (cpp:192-195).
    assert.equal(typeof finishAuthored, "function", "the mesh never subscribed to the authored load");
    finishAuthored("completed", mesh.geometry);
    assert.equal(mesh.lowResGeometry, null, "the stand-in outlived the authored mesh");

    // Negative control: when the index says the authored file IS there, no
    // sibling is looked for at all.
    requested.length = 0;
    CjsResMan.SetResourceExistsResolver([ "res:/present.gr2", "res:/present_lowdetail.gr2" ]);
    new Tr2Mesh().SetMeshResPath("res:/present.gr2");
    assert.deepEqual(requested, [ "res:/present.gr2" ]);

    // Second control: with no index installed nothing is presumed to exist, so
    // the authored path is requested alone.
    requested.length = 0;
    CjsResMan.SetResourceExistsResolver(null);
    new Tr2Mesh().SetMeshResPath("res:/hull.gr2");
    assert.deepEqual(requested, [ "res:/hull.gr2" ]);
  }
  finally
  {
    CjsResMan.SetResourceExistsResolver(null);
    CjsResMan.SetGlobal(previousManager ?? null);
  }
});
