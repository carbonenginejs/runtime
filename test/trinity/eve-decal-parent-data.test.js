import test from "node:test";
import assert from "node:assert/strict";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { EveSpaceObject2, EveUpdateContext, Tr2Lod } from "../../npm/dist/trinity/index.js";
import { EveChildMesh } from "../../npm/dist/trinity/eve/child/EveChildMesh.js";

// Carbon's decal data flow is an UPDATE PASS, not a values transport: the owner
// fills one ParentData for the pass and each decal copies the struct.
// EveSpaceObject2.cpp:1694-1706 (hull), EveChildMesh.cpp:1015 + 450 (child).

function decalSpy()
{
  const seen = [];
  return {
    seen,
    boneCalls: 0,
    SetBoneMatrix() { this.boneCalls += 1; },
    UpdateVisibility(_updateContext, parentData) { seen.push(parentData); return true; }
  };
}

function visibleHull()
{
  const object = new EveSpaceObject2();
  object.mesh = {
    GetMeshIndex: () => 0,
    GetGeometryResource: () => ({ IsGood: () => true, GetLodIndexForScreenSize: () => 0 }),
    GetBoundingBox(min, max)
    {
      min.set([ -1, -1, -1 ]);
      max.set([ 1, 1, 1 ]);
      return true;
    },
    IsLoading: () => false,
    UseWithScreenSize() {}
  };
  object.translationCurve = { Update(_time, out) { out.set([ 10, 20, 30 ]); } };
  object.SetBoundingSphereInformation(new Float32Array([ 0, 0, 0, 5 ]));
  object.UpdateWorldTransform(1);
  object.UpdateWorldBounds();
  return object;
}

const visibleContext = {
  frustum: {
    IsSphereVisible: () => true,
    IsBoxVisible: () => true,
    GetPixelSizeAccross: () => 80,
    GetPixelSizeAccrossEst: () => 75
  },
  visibilityThreshold: 1,
  lowDetailThreshold: 20,
  mediumDetailThreshold: 60,
  lodFactor: 1
};

test("a visible hull hands its decals one ParentData built for the pass", () =>
{
  const object = visibleHull();
  object.spaceObjectShipData.set([ 0.1, 0.2, 0.3, 0.4 ]);
  const decal = decalSpy();
  object.decals.push(decal);

  assert.equal(object.UpdateVisibility(visibleContext), true);
  assert.equal(decal.seen.length, 1, "the decal pass ran");

  const parentData = decal.seen[0];
  assert.notEqual(parentData, object, "a ParentData record, not the hull");
  assert.deepEqual(Array.from(parentData.transform), Array.from(object.worldTransform));
  assert.deepEqual(Array.from(parentData.shipData), Array.from(object.spaceObjectShipData));
  assert.equal(decal.boneCalls, 0, "no animation updater, so no bone palette");

  object.UpdateVisibility(visibleContext);
  assert.equal(decal.seen[1], parentData, "the same record is refreshed, not reallocated");
});

test("a hull whose mesh is not visible runs no decal pass", () =>
{
  const object = visibleHull();
  const decal = decalSpy();
  object.decals.push(decal);

  object.UpdateVisibility({ ...visibleContext, frustum: { ...visibleContext.frustum, IsSphereVisible: () => false } });
  assert.equal(decal.seen.length, 0);
});

test("a child mesh hands its decals its own ParentData, placed by the child", () =>
{
  const parent = new EveSpaceObject2();
  parent.spaceObjectShipData.set([ 0.5, 0.6, 0.7, 0.8 ]);

  const child = new EveChildMesh();
  child.mesh = {
    GetBounds: () => ({ min: [ -1, -1, -1 ], max: [ 1, 1, 1 ] }),
    GetAreas: () => [],
    GetGeometryResource: () => null,
    UseWithScreenSize() {}
  };
  const decal = decalSpy();
  child.decals.push(decal);

  child.UpdateAsyncronous(new EveUpdateContext(), {
    localToWorldTransform: mat4.fromTranslation(mat4.create(), [ 7, 8, 9 ]),
    spaceObjectParent: parent,
    activationStrength: 1,
    boneCount: 0,
    bones: null
  });
  assert.equal(child.UpdateVisibility(visibleContext, null, Tr2Lod.TR2_LOD_HIGH), true);
  assert.equal(decal.seen.length, 1, "the child's decal pass ran");

  const parentData = decal.seen[0];
  assert.notEqual(parentData, child, "a ParentData record, not the child mesh");
  assert.deepEqual(Array.from(parentData.transform), Array.from(child.worldTransform),
    "cpp:1044 - the decal is placed by the child's world transform");
  assert.deepEqual(Array.from(parentData.transform.slice(12, 15)), [ 7, 8, 9 ]);
  assert.deepEqual(Array.from(parentData.shipData), [ 0.5, 0.6, 0.7, 0.8 ].map(Math.fround),
    "cpp:1015 - the rest comes from the space object parent");
});
