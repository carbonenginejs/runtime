// EveChildInstancedMeshes - the InstancedMeshProvider registration lifecycle
// (EveChildInstancedMeshes.cpp: AddMeshesToManager cpp:472-553,
// UnregisterFromMeshManager cpp:50-71, SetShaderOption cpp:343-359,
// SetMeshDisplay cpp:663-691, UpdateAsyncronous CPU half cpp:202-281,
// AddMesh flag stamping cpp:418-428).
import test from "node:test";
import assert from "node:assert/strict";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import {
  EveChildInstancedMeshes,
  INSTANCE_FLAG_CASTS_SHADOW,
  INSTANCE_FLAG_RENDER_IN_REFLECTION
} from "../npm/dist/index.js";


const EPSILON = 1e-4;

function assertClose(actual, expected, message, epsilon = EPSILON)
{
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `${message}: expected ${expected}, got ${actual}`
  );
}

function MakeManager()
{
  const calls = {
    perObject: [], spheres: [], groups: [],
    removedGroups: [], removedSpheres: [], removedPerObject: []
  };
  return {
    calls,
    AddPerObjectData(data)
    {
      const handle = { kind: "pod", data };
      calls.perObject.push(handle);
      return handle;
    },
    AddBoundingSphereGroup(bounds, flags, spheres, count)
    {
      const handle = { kind: "sphere", bounds, flags, spheres, count };
      calls.spheres.push(handle);
      return handle;
    },
    AddMeshGroup(...args)
    {
      const handle = { kind: "group", args };
      calls.groups.push(handle);
      return handle;
    },
    RemoveMeshGroup(handle) { calls.removedGroups.push(handle); },
    RemoveBoundingSphereGroup(handle) { calls.removedSpheres.push(handle); },
    RemovePerObjectData(handle) { calls.removedPerObject.push(handle); }
  };
}

const GEOMETRY = { GetMeshData: () => ({ minBounds: [-1, -1, -1], maxBounds: [1, 1, 1] }) };

function MakeProvider({ geometry = GEOMETRY } = {})
{
  const provider = new EveChildInstancedMeshes();
  const instance1 = mat4.create();
  mat4.translate(instance1, instance1, [10, 0, 0]);
  mat4.scale(instance1, instance1, [3, 3, 3]);
  provider.AddMesh(
    "res:/geo",
    true,
    0,
    0,
    [
      { effect: { name: "fx" }, batchType: 0, areaIndex: 0, areaCount: 1 },
      { effect: { name: "fx2" }, batchType: 2, areaIndex: 1, areaCount: 2 }
    ],
    [instance1, mat4.create()]
  );
  if (geometry)
  {
    provider.SetGeometryResource(0, geometry);
  }
  const world = mat4.create();
  mat4.translate(world, world, [100, 0, 0]);
  mat4.scale(world, world, [2, 2, 2]);
  provider.UpdateSyncronous(null, { localToWorldTransform: world });
  provider.UpdateAsyncronous(null, {});
  return provider;
}

test("UpdateAsyncronous: instance cull spheres, combined world bounds, reflection flag (cpp:202-281)", () =>
{
  const provider = MakeProvider();
  const mesh = provider.meshes[0];

  // Local sphere: unit box -> radius sqrt(12)/2 = sqrt(3), center 0 ->
  // localRadius = sqrt(3). Instance T(10,0,0)*S(3) under world T(100)*S(2):
  // position (10,0,0) -> (120, 0, 0); scale 3 * worldScale 2 = 6.
  assert.equal(mesh.instanceSpheres.length, 2, "one sphere per instance");
  assertClose(mesh.instanceSpheres[0].center[0], 120, "instance world position");
  assertClose(mesh.instanceSpheres[0].radius, Math.sqrt(3) * 6, "scaled instance radius");
  assertClose(mesh.instanceSpheres[1].center[0], 100, "identity instance at the world origin");
  assertClose(mesh.instanceSpheres[1].radius, Math.sqrt(3) * 2, "world-scaled identity instance");

  // Flags: batch types 0 and 2, castsShadow, reflection refresh
  // (reflectionMode 0 = REFLECT_HIGH -> ShouldReflect true at HIGH).
  const expected = ((1 << 0) | (1 << 2) | INSTANCE_FLAG_CASTS_SHADOW | INSTANCE_FLAG_RENDER_IN_REFLECTION) >>> 0;
  assert.equal(mesh.flags, expected, "flag bits");

  assert.equal(provider.hasUpdated, true, "hasUpdated stamped (cpp:281)");
});

test("AddMeshesToManager: full registration, add-once idempotence, hasUpdated gate (cpp:472-553)", () =>
{
  const fresh = new EveChildInstancedMeshes();
  const gatedManager = MakeManager();
  fresh.AddMeshesToManager(gatedManager);
  assert.equal(gatedManager.calls.perObject.length, 0, "nothing before the first update pass (cpp:474)");

  const provider = MakeProvider();
  const manager = MakeManager();
  provider.AddMeshesToManager(manager);
  assert.equal(manager.calls.perObject.length, 1, "one per-object registration");
  assert.equal(manager.calls.perObject[0].data, provider, "per-object payload is the provider");
  assert.equal(manager.calls.spheres.length, 1, "one sphere group per mesh");
  assert.equal(manager.calls.spheres[0].count, 2, "instance sphere count");
  assert.equal(manager.calls.groups.length, 2, "one mesh group per area");
  // AddMeshGroup positional contract: geometry, declaration(0), batchType,
  // meshIndex, areaIndex, areaCount, effect, effectHash, podHandle,
  // sphereHandle, instances, count, pickingOwner, pickingOwnerIndex.
  const args = manager.calls.groups[1].args;
  assert.equal(args[0], GEOMETRY, "geometry threaded");
  assert.equal(args[2], 2, "area batch type");
  assert.equal(args[5], 2, "area count");
  assert.equal(args[8], manager.calls.perObject[0], "per-object handle threaded");
  assert.equal(args[9], manager.calls.spheres[0], "sphere handle threaded");
  assert.equal(args[12], provider, "picking owner is the provider");
  assert.equal(args[13], 0, "picking owner index = mesh ordinal");

  provider.AddMeshesToManager(manager);
  assert.equal(manager.calls.groups.length, 2, "latch: nothing re-registers");
});

test("Latch retry: geometry streaming in completes registration on a later pass (cpp:499-518)", () =>
{
  const provider = MakeProvider({ geometry: null });
  const manager = MakeManager();
  provider.AddMeshesToManager(manager);
  assert.equal(manager.calls.perObject.length, 1, "per-object registers immediately");
  assert.equal(manager.calls.spheres.length, 0, "no sphere group without geometry");
  assert.equal(manager.calls.groups.length, 0, "no mesh groups without geometry");

  provider.SetGeometryResource(0, GEOMETRY);
  provider.UpdateAsyncronous(null, {});
  provider.AddMeshesToManager(manager);
  assert.equal(manager.calls.perObject.length, 1, "per-object stays add-once");
  assert.equal(manager.calls.spheres.length, 1, "sphere group registered on retry");
  assert.equal(manager.calls.groups.length, 2, "mesh groups registered on retry");
});

test("SetShaderOption removes mesh groups only; groups re-add with the new hash (cpp:343-359)", () =>
{
  const provider = MakeProvider();
  const manager = MakeManager();
  provider.AddMeshesToManager(manager);

  provider.SetShaderOption("MODE", "FANCY");
  assert.equal(manager.calls.removedGroups.length, 2, "both mesh groups removed");
  assert.equal(manager.calls.removedSpheres.length, 0, "sphere group untouched");
  assert.equal(manager.calls.removedPerObject.length, 0, "per-object untouched");

  provider.AddMeshesToManager(manager);
  assert.equal(manager.calls.groups.length, 4, "groups re-registered");
  assert.equal(manager.calls.spheres.length, 1, "sphere still add-once");
});

test("SetMeshDisplay(false) removes eagerly; the display-off skip does NOT clear the latch (cpp:495-498, 663-691)", () =>
{
  const provider = MakeProvider();
  const manager = MakeManager();
  provider.AddMeshesToManager(manager);

  provider.SetMeshDisplay(0, false);
  assert.equal(manager.calls.removedSpheres.length, 1, "sphere removed on display off");
  assert.equal(manager.calls.removedGroups.length, 2, "groups removed on display off");

  provider.AddMeshesToManager(manager);
  assert.equal(manager.calls.spheres.length, 1, "hidden mesh does not re-register");
  provider.AddMeshesToManager(manager);
  assert.equal(manager.calls.groups.length, 2, "latch settled with the mesh hidden");

  provider.SetMeshDisplay(0, true);
  provider.AddMeshesToManager(manager);
  assert.equal(manager.calls.spheres.length, 2, "re-registered on display on");
  assert.equal(manager.calls.groups.length, 4, "groups re-registered on display on");
});

test("Manager switch tears everything down through the old handles (cpp:478-481, 50-71)", () =>
{
  const provider = MakeProvider();
  const first = MakeManager();
  provider.AddMeshesToManager(first);

  const second = MakeManager();
  provider.AddMeshesToManager(second);
  assert.equal(first.calls.removedGroups.length, 2, "old manager's groups removed");
  assert.equal(first.calls.removedSpheres.length, 1, "old manager's sphere removed");
  assert.equal(first.calls.removedPerObject.length, 1, "old manager's per-object removed");
  assert.equal(second.calls.perObject.length, 1, "re-registered on the new manager");
  assert.equal(second.calls.groups.length, 2, "groups on the new manager");
});
