import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { BlueList, IListNotify, IInitialize, INotify } from "../../npm/dist/global/blue/index.js";
import { mappedInterfaces } from "../../npm/dist/global/compose/interface.js";
import { Tr2MeshBase, Tr2Mesh, Tr2InstancedMesh, Tr2MeshArea } from "../../npm/dist/trinity/index.js";
import { TriBatchType } from "../../npm/dist/global/consts/graphics/index.js";

test("real Crisis mesh retains native area ownership and shared particle initialization", () =>
{
  const values = JSON.parse(readFileSync(new URL("../support/crisisParticleHost.json", import.meta.url), "utf8"));
  const host = CjsSchema.from(values._type, values);
  const mesh = host.mesh;
  const list = mesh.transparentAreas;
  const area = list[0];
  assert.ok(mesh instanceof Tr2InstancedMesh);
  assert.ok(list instanceof BlueList);
  assert.deepEqual(area.GetOwnerMeshes(), [mesh]);
  assert.equal(mesh.instanceGeometryResource, host.particleSystems[0]);
  assert.equal(host.particleEmitters[0].particleSystem, host.particleSystems[0]);
  assert.equal(host.particleEmitters[0].isValid, true);
  assert.equal(mesh.RemoveArea(TriBatchType.TRIBATCHTYPE_TRANSPARENT, area), true);
  assert.deepEqual(area.GetOwnerMeshes(), []);
  assert.equal(mesh.AddArea(TriBatchType.TRIBATCHTYPE_TRANSPARENT, area), true);
  assert.deepEqual(area.GetOwnerMeshes(), [mesh]);
  CjsSchema.setValues(mesh, { transparentAreas: [{ _type: "Tr2MeshArea", name: "replacement" }] });
  assert.equal(mesh.transparentAreas, list);
  assert.deepEqual(area.GetOwnerMeshes(), []);
  assert.deepEqual(list[0].GetOwnerMeshes(), [mesh]);
  const detached = new Tr2MeshArea();
  list.push(detached);
  assert.deepEqual(detached.GetOwnerMeshes(), [], "raw array insertion does not notify");
  for (const field of ["decalNormalAreas", "flareAreas"])
  {
    const unobserved = new Tr2MeshArea();
    mesh[field].Append(unobserved);
    assert.deepEqual(unobserved.GetOwnerMeshes(), [], field + " has no native observer");
  }
  const control = new Tr2Mesh();
  control.transparentAreas.SetNotify(null);
  const orphan = new Tr2MeshArea();
  control.transparentAreas.Append(orphan);
  assert.deepEqual(orphan.GetOwnerMeshes(), [], "negative control: missing subscription loses ownership");
  assert.equal(mesh.RemoveArea(TriBatchType.TRIBATCHTYPE_TRANSPARENT, area), false);
  assert.equal(mesh.RemoveArea(-1, area), false);
  assert.equal(mesh.AddArea(-1, area), false);
  assert.equal("SetValues" in mesh, false);
  assert.equal(CjsSchema.cast(mesh, IListNotify), mesh);
  assert.deepEqual(mappedInterfaces(Tr2MeshBase), new Set());
  assert.deepEqual(mappedInterfaces(Tr2Mesh), new Set([Tr2Mesh, IInitialize, INotify]));
  assert.deepEqual(mappedInterfaces(Tr2InstancedMesh), new Set([Tr2InstancedMesh, Tr2Mesh, IInitialize, INotify]));
});
