import assert from "node:assert/strict";
import test from "node:test";
import {
  EveSceneStaticParticles,
  Tr2InstancedMesh,
  Tr2RuntimeInstanceData,
  Tr2DirectInstanceData
} from "../../npm/dist/trinity/index.js";

/** Creates real runtime receivers and releases their device registrations. */
function setup(t)
{
  const particles = new EveSceneStaticParticles();
  const mesh = new Tr2InstancedMesh();
  const data = new Tr2RuntimeInstanceData();
  mesh.SetInstanceGeometryRes(data);
  particles.mesh = mesh;
  particles.clusterParticleDensity = 1;
  particles.AddCluster([0, 0, 0], 1, [1, 0, 0, 1], [0, 1, 0, 1], 10);
  t.after(() =>
  {
    mesh.Destruct();
    data.Destruct();
  });
  return { particles, mesh, data };
}

test("particle operations retain Carbon's missing-mesh guard", () =>
{
  const particles = new EveSceneStaticParticles();
  particles.AddCluster([0, 0, 0], 1, [1, 0, 0, 1], [0, 1, 0, 1], 10);
  assert.doesNotThrow(() => particles.Rebuild(), "EveSceneStaticParticles.cpp:227-229");
  particles.ClearClusters();
  assert.equal(particles.clusters.length, 0, "EveSceneStaticParticles.cpp:67-72");
});

test("particle operations reject a different instance-data class despite matching methods", t =>
{
  const { particles, mesh } = setup(t);
  const foreign = new Tr2DirectInstanceData();
  const unexpected = () => assert.fail("EveSceneStaticParticles.cpp:211-215 rejects the wrong concrete class");
  Object.assign(foreign, { SetElementLayout: unexpected, SetData: unexpected, DestroyData: unexpected });
  mesh.SetInstanceGeometryRes(foreign);
  t.after(() => foreign.Destruct());
  assert.doesNotThrow(() => particles.Rebuild());
  particles.ClearClusters();
  assert.equal(particles.clusters.length, 0);
});

for (const operation of ["Rebuild", "ClearClusters"])
{
  test(`${operation} requires the mesh instance-resource getter`, t =>
  {
    const { particles, mesh } = setup(t);
    mesh.GetInstanceGeometryResource = undefined;
    assert.throws(() => particles[operation](), TypeError, "EveSceneStaticParticles.cpp:208 calls directly");
  });
}

for (const method of ["SetElementLayout", "SetData", "UpdateBoundingBox", "UpdateData", "GetBoundingBox"])
{
  test(`particle rebuild requires ${method} on its runtime instance data`, t =>
  {
    const { particles, data } = setup(t);
    data[method] = undefined;
    assert.throws(() => particles.Rebuild(), TypeError, "EveSceneStaticParticles.cpp:244,279,320-323 require the instance-data contract");
  });
}

test("particle rebuild requires mesh bounds publication", t =>
{
  const { particles, mesh } = setup(t);
  mesh.SetBoundingBox = undefined;
  assert.throws(() => particles.Rebuild(), TypeError, "EveSceneStaticParticles.cpp:324 calls SetBoundingBox directly");
});

test("particle clear requires DestroyData after clearing clusters", t =>
{
  const { particles, data } = setup(t);
  data.DestroyData = undefined;
  assert.throws(() => particles.ClearClusters(), TypeError, "EveSceneStaticParticles.cpp:74 calls DestroyData directly");
  assert.equal(particles.clusters.length, 0, "EveSceneStaticParticles.cpp:67 clears before querying data");
});

test("particle rebuild publishes real bounds and clear releases real instance data", t =>
{
  const { particles, mesh, data } = setup(t);
  particles.Rebuild();
  assert.equal(data.GetCount(), 1);
  const bounds = data.GetBoundingBox();
  assert.deepEqual(Array.from(mesh.minBounds), Array.from(bounds.min), "EveSceneStaticParticles.cpp:323-324");
  assert.deepEqual(Array.from(mesh.maxBounds), Array.from(bounds.max), "EveSceneStaticParticles.cpp:323-324");
  particles.ClearClusters();
  assert.equal(data.GetCount(), 0, "Tr2RuntimeInstanceData.cpp:514-519");
});
