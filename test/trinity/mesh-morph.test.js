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
