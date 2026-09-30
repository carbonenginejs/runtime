import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { EveShip2, EveSpaceObjectDecal, Tr2Mesh } from "../../npm/dist/trinity/index.js";
import { TriGeometryRes } from "../../npm/dist/resource/index.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { makePerObjectStore } from "./helpers/perObjectStore.js";

const corpus = process.env.ANGBC2_DECAL_CORPUS_DIR;

test("real angbc2 crisis decals follow flat mesh binding 8 through the hull visibility handoff", {
  skip: !corpus && "set ANGBC2_DECAL_CORPUS_DIR with build 3552227 angbc2_t1.gr2 and SOF hull angbc2_t1.black"
}, async () =>
{
  const geometryBytes = await readFile(join(corpus, "angbc2_t1.gr2"));
  const hullBytes = await readFile(join(corpus, "angbc2_t1.black"));
  assert.equal(createHash("md5").update(geometryBytes).digest("hex"), "6c0c21ab87a4e9694e20fb638eb7e6e6");
  assert.equal(createHash("md5").update(hullBytes).digest("hex"), "045a12346e6ce2ac3739870709ca5be5");
  const hull = CjsBlackFormat.readPayload(hullBytes).object;
  const items = hull.decalSets.find(set => set.name === "crisis").items.filter(item =>
    item.name === "Crisis_Blackbody_Rear_Right" || item.name === "Crisis_Blackbody_Meter_Front_Right");
  assert.equal(items.length, 2);
  const geometry = new TriGeometryRes();
  geometry.SetPayload(geometry.ReadGrannyFile(geometryBytes));
  geometry.MarkPrepared();
  const ship = new EveShip2();
  const mesh = new Tr2Mesh();
  mesh.SetGeometryRes(geometry);
  ship.SetMesh(mesh);
  const updater = ship.animationUpdater;
  assert.equal(updater.GetMeshBoneCount(), 45);
  assert.equal(geometry.GetMeshData(0).boneBindings[8].name, "thrusterCover_01");
  assert.equal(geometry.GetSkeletonData(0).bones.indexOf("thrusterCover_01"), 10,
    "binding 8 already selects skeleton joint 10; no consumer remapping");
  ship.decals = items.map(item =>
  {
    const decal = new EveSpaceObjectDecal();
    decal.parentBoneIndex = item.boneIndex;
    assert.equal(decal.parentBoneIndex, 8);
    decal.position.set(item.position);
    decal.rotation.set(item.rotation);
    decal.scaling.set(item.scaling);
    decal.Initialize();
    return decal;
  });
  ship.SetBoundingSphereInformation(new Float32Array([0, 0, 0, 1000]));
  ship.UpdateWorldTransform(0);
  ship.UpdateWorldBounds();
  const context = {
    GetLodFactor: () => 1,
    frustum: {
      viewPos: new Float32Array([2000, 1000, -2000]),
      IsSphereVisible: () => true,
      IsBoxVisible: () => true,
      GetPixelSizeAccross: () => 1000,
      GetPixelSizeAccrossEst: () => 1000
    },
    visibilityThreshold: 1, lowDetailThreshold: 20, mediumDetailThreshold: 60, lodFactor: 1
  };
  const store = makePerObjectStore();
  for (const [name, expectedZ] of [["NormalLoop", 12.42023468], ["WarpLoop", 0]])
  {
    assert.equal(updater.PlayAnimation(name, true, 0, 0, 1, false), true);
    updater.Update(0);
    const palette = updater.GetMeshBoneMatrixList();
    assert.equal(palette.length, 45 * 12);
    assert.equal(palette[8], 0, "old nested-array read would skip the actual binding-8 matrix");
    ship.UpdateVisibility(context);
    for (const decal of ship.decals)
    {
      assert.ok(Math.abs(decal._parentBoneMatrix[14] - expectedZ) < 1e-5,
        `EveSpaceObject2.cpp:1694-1706 -> EveSpaceObjectDecal.cpp:490 ${name} binding 8`);
      const data = decal.GetPerObjectData({ Alloc: key => store.Allocate(key) });
      const parent = data.vs.GetTransposed("parentBoneMatrix");
      const inverse = data.vs.GetTransposed("invParentBoneMatrix");
      assert.ok(Array.from(parent).every(Number.isFinite));
      assert.ok(Array.from(inverse).every(Number.isFinite));
      assert.ok(Math.abs(parent[11] - expectedZ) < 1e-5);
      assert.ok(Math.abs(inverse[11] + expectedZ) < 1e-5);
    }
  }
});
