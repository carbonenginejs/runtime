// EveInstancedMeshManager, stage 1: the records, the registration handles and
// their swap-with-back removal (EveInstancedMeshManager.cpp:123-383), the
// InstanceFlags bits (cpp:1002-1052), the instance-buffer ring (cpp:398-507)
// and the CollectMeshes route through the component registry (cpp:71-121).
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { TriBatchType } from "../../npm/dist/global/consts/graphics/index.js";
import {
  EveChildInstancedMeshInstance,
  EveComponentRegistry,
  EveInstancedMeshManager,
  EveInstancedMeshManagerDataHandle,
  EveInstancedMeshManagerDynamicPerInstanceData,
  EveInstancedMeshManagerInstanceBuffer,
  EveInstancedMeshManagerInstanceFlags,
  EveInstancedMeshManagerMeshKey,
  EveInstancedMeshManagerSphereGroup,
  EveSpaceScene,
  RawData,
  Tr2RenderContext_GetMainThreadRenderContext
} from "../../npm/dist/trinity/index.js";
import { Tr2VariableStore } from "../../npm/dist/trinity/core/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";


const INVALID = 0xFFFFFFFF;

beforeEach(t =>
{
  const context = Tr2RenderContext_GetMainThreadRenderContext();
  const prior = context.GetRenderContextAL();
  const al = new Tr2RenderContextALStub();
  context.SetRenderContextAL(al);
  al.CreateDevice();
  t.after(() => context.SetRenderContextAL(prior));
});

/** A decoded-mesh stand-in: a 2-unit box at the origin with two LODs. */
function FakeGeometry()
{
  const mesh = { minBounds: [ -1, -1, -1 ], maxBounds: [ 1, 1, 1 ], lods: [ { maxScreenSize: 100 }, { maxScreenSize: 10 } ] };
  return { GetMeshData: () => mesh };
}

function Sphere(x, radius)
{
  return { center: new Float32Array([ x, 0, 0 ]), radius };
}

/** One static mesh group under the given handles, with defaults for the rest. */
function AddStatic(manager, pod, sphere, { geometry = FakeGeometry(), areaIndex = 0, count = 1, owner = null } = {})
{
  const instances = Array.from({ length: count }, () => new EveChildInstancedMeshInstance());
  return manager.AddMeshGroup__StaticPerInstanceData(geometry, 0, TriBatchType.TRIBATCHTYPE_OPAQUE, 0, areaIndex, 1, false,
    null, 7, pod, sphere, instances, count, owner, 0);
}

function AddSphereGroup(manager)
{
  return manager.AddBoundingSphereGroup(Sphere(0, 1), new EveInstancedMeshManagerInstanceFlags(), [ Sphere(0, 1) ], 1);
}


test("records carry Carbon's defaults (EveInstancedMeshManager.h:13-269)", () =>
{
  assert.equal(new EveInstancedMeshManagerInstanceFlags().flags, 0, "m_flags = 0 (h:25)");

  const handle = new EveInstancedMeshManagerDataHandle();
  assert.equal(handle.index, INVALID, "index = InvalidIndex (h:90)");
  assert.equal(handle.owner, null, "owner = nullptr (h:89)");
  assert.equal(handle.IsValid(), false, "operator bool (h:82-85)");
  assert.equal(EveInstancedMeshManagerDataHandle.invalidIndex, INVALID, "InvalidIndex (h:88)");

  const dynamic = new EveInstancedMeshManagerDynamicPerInstanceData();
  assert.equal(dynamic.worldTransform.length, 12, "Float4x3 (h:30)");
  assert.equal(dynamic.prevWorldTransform.length, 12, "Float4x3 (h:31)");
  assert.equal(dynamic.sphereIndex, 0);
  assert.equal(dynamic.mirrored, false);

  const key = new EveInstancedMeshManagerMeshKey();
  assert.equal(key.combinedVertexDeclaration, INVALID, "UNINITIALIZED_DECLARATION (h:171)");
  assert.equal(key.batchType, TriBatchType.TRIBATCHTYPE_OPAQUE, "h:172");
  assert.equal(key.areaCount, 1, "h:175");
  assert.equal(key.isDynamic, false, "h:177");

  const group = new EveInstancedMeshManagerSphereGroup();
  assert.equal(group.bounds.radius, -1, "Sphere() radius -1 (Sphere_inline.h:9-13)");
  assert.equal(group.lastTestResult, 0, "TriFrustumTestResult::Outside (h:268)");

  assert.equal(EveInstancedMeshManager.StaticPerInstanceData, EveChildInstancedMeshInstance, "StaticPerInstanceData is the child's instance record");
  assert.equal(EveInstancedMeshManager.PerObjectDataHandle, EveInstancedMeshManagerDataHandle, "h:93");
  assert.equal(EveInstancedMeshManager.BoundingSphereHandle, EveInstancedMeshManagerDataHandle, "h:94");
  assert.equal(EveInstancedMeshManager.MeshGroupHandle, EveInstancedMeshManagerDataHandle, "h:95");
});

test("InstanceFlags bits, filter and equality (cpp:1002-1052)", () =>
{
  const { castsShadow, renderInReflection } = EveInstancedMeshManagerInstanceFlags;
  assert.equal(castsShadow, 1 << 30, "CASTS_SHADOW (h:23)");
  assert.equal(renderInReflection, 2 ** 31, "RENDER_IN_REFLECTION (h:24), unsigned");

  const flags = new EveInstancedMeshManagerInstanceFlags();
  flags.AddBatchType(TriBatchType.TRIBATCHTYPE_OPAQUE);
  flags.AddBatchType(TriBatchType.TRIBATCHTYPE_TRANSPARENT);
  assert.equal(flags.flags, 0b101, "one bit per batch type (cpp:1004)");

  flags.SetCastsShadow(true);
  flags.SetRenderInReflections(true);
  assert.equal(flags.flags, (0b101 | castsShadow | renderInReflection) >>> 0, "stays an unsigned uint32");
  assert.ok(flags.flags > 0, "bit 31 does not read back negative");
  assert.equal(flags.GetCastsShadow(), true, "cpp:1019-1022");

  flags.SetCastsShadow(false);
  assert.equal(flags.GetCastsShadow(), false, "cleared (cpp:1015)");
  flags.SetRenderInReflections(false);
  assert.equal(flags.flags, 0b101, "cleared (cpp:1032)");

  const filter = new EveInstancedMeshManagerInstanceFlags();
  filter.AddBatchType(TriBatchType.TRIBATCHTYPE_OPAQUE);
  assert.equal(flags.MatchesFilter(filter), true, "a shared batch bit matches (cpp:1041)");
  filter.SetCastsShadow(true);
  assert.equal(flags.MatchesFilter(filter), false, "every filter render-pass bit is required");
  flags.SetCastsShadow(true);
  assert.equal(flags.MatchesFilter(filter), true, "render-pass bit present");
  const other = new EveInstancedMeshManagerInstanceFlags();
  other.AddBatchType(TriBatchType.TRIBATCHTYPE_DECAL);
  other.SetCastsShadow(true);
  assert.equal(other.MatchesFilter(filter), false, "no shared batch bit");

  const copy = new EveInstancedMeshManagerInstanceFlags();
  copy.flags = flags.flags;
  assert.equal(flags.Equals(copy), true, "operator== (cpp:1044-1047)");
  assert.equal(flags.NotEquals(copy), false, "operator!= (cpp:1049-1052)");
  assert.equal(flags.NotEquals(other), true);
});

test("per-object data: swap-with-back removal patches the moved handle and its mesh groups (cpp:123-158)", () =>
{
  const manager = new EveInstancedMeshManager();
  const pods = [ 0, 1, 2 ].map(() => manager.AddPerObjectData(RawData.create("EveSpacePerObjectData")));
  assert.deepEqual(pods.map(pod => pod.index), [ 0, 1, 2 ], "appended in order (cpp:128-130)");
  assert.equal(pods[0].owner, manager, "owner = this (cpp:131)");

  const sphere = AddSphereGroup(manager);
  AddStatic(manager, pods[2], sphere);
  const [ , meshData ] = [ ...manager._meshInstances.values() ][0];
  assert.equal(meshData.meshGroups[0].perObjectDataIndex, 2);

  manager.RemovePerObjectData(pods[0]);
  assert.equal(pods[0].index, INVALID, "removed handle invalidated (cpp:157)");
  assert.equal(pods[0].owner, manager, "Carbon quirk: RemovePerObjectData leaves owner set");
  assert.equal(pods[2].index, 0, "the back record moved into slot 0 (cpp:154)");
  assert.equal(pods[1].index, 1, "untouched");
  assert.equal(manager._perObjectData.length, 2);
  assert.equal(manager._perObjectData[0][1], pods[2], "slot 0 holds the moved record");
  assert.equal(meshData.meshGroups[0].perObjectDataIndex, 0, "the group that used the back slot follows it (cpp:139-151)");

  manager.RemovePerObjectData(pods[1]);
  assert.equal(pods[1].index, INVALID, "removing the back record");
  assert.equal(pods[2].index, 0);
});

test("sphere groups: copy-in, bounds update and swap-with-back removal (cpp:169-220)", () =>
{
  const manager = new EveInstancedMeshManager();
  const pod = manager.AddPerObjectData(RawData.create("EveSpacePerObjectData"));
  const bounds = Sphere(5, 2);
  const flags = new EveInstancedMeshManagerInstanceFlags();
  flags.AddBatchType(TriBatchType.TRIBATCHTYPE_OPAQUE);
  const spheres = [ Sphere(0, 1), Sphere(1, 1) ];
  const first = manager.AddBoundingSphereGroup(bounds, flags, spheres, 2);
  const second = AddSphereGroup(manager);

  const group = manager._sphereGroups[0];
  assert.equal(group.bounds.center[0], 5, "bounds copied (cpp:175)");
  assert.notEqual(group.bounds, bounds, "by value");
  assert.notEqual(group.flags, flags, "flags by value (cpp:176)");
  assert.equal(group.flags.flags, flags.flags);
  assert.equal(group.boundingSpheres, spheres, "spheres read in place (cpp:178)");
  assert.equal(group.screenSizes.length, 2, "one screen size per sphere (cpp:180)");
  assert.equal(first.index, 0);
  assert.equal(second.index, 1);

  const updated = new EveInstancedMeshManagerInstanceFlags();
  updated.SetCastsShadow(true);
  manager.SetSphereGroupBounds(first, Sphere(9, 3), updated);
  assert.equal(group.bounds.center[0], 9, "cpp:218");
  assert.equal(group.bounds.radius, 3);
  assert.equal(group.flags.GetCastsShadow(), true, "cpp:219");

  AddStatic(manager, pod, second);
  const [ , meshData ] = [ ...manager._meshInstances.values() ][0];
  manager.RemoveBoundingSphereGroup(first);
  assert.equal(first.index, INVALID, "cpp:210");
  assert.equal(first.owner, null, "cpp:211");
  assert.equal(second.index, 0, "the back group moved into slot 0 (cpp:208)");
  assert.equal(manager._sphereGroups.length, 1);
  assert.equal(meshData.meshGroups[0].sphereGroupIndex, 0, "its mesh group follows (cpp:191-205)");

  manager.RemoveBoundingSphereGroup(first);
  assert.equal(manager._sphereGroups.length, 1, "an empty handle removes nothing (cpp:189)");
});

test("mesh groups: keyed MeshData, first-registration mesh data, swap-with-back removal (cpp:231-383)", () =>
{
  const manager = new EveInstancedMeshManager();
  const pod = manager.AddPerObjectData(RawData.create("EveSpacePerObjectData"));
  const sphere = AddSphereGroup(manager);
  const geometry = FakeGeometry();

  const owner = {};
  const a = AddStatic(manager, pod, sphere, { geometry, count: 2, owner });
  const b = AddStatic(manager, pod, sphere, { geometry, count: 3 });
  assert.equal(manager._meshInstances.size, 1, "the same MeshKey shares one MeshData");
  assert.deepEqual([ a.index, b.index ], [ 0, 1 ], "cpp:354");
  assert.equal(a.owner, manager, "cpp:353");
  assert.equal(manager._instanceCount, 5, "cpp:356");

  const [ key, meshData ] = [ ...manager._meshInstances.values() ][0];
  assert.equal(key.isDynamic, false, "static overload");
  assert.ok(Math.abs(meshData.radius - Math.sqrt(3)) < 1e-6, "sphere radius + |centre| of the mesh box (cpp:327-332)");
  assert.equal(meshData.lodIndices.length, 4, "SLOTS_PER_LOD per LOD (cpp:337)");
  assert.deepEqual(Array.from(meshData.screenSizeThresholds), [ 100, 10 ], "per-LOD maxScreenSize (cpp:339-342)");
  assert.equal(meshData.meshGroups[0].owner, owner, "picking owner (cpp:351)");
  assert.equal(meshData.meshGroups[0].staticInstances.length, 2);

  const other = AddStatic(manager, pod, sphere, { geometry, areaIndex: 1 });
  assert.equal(manager._meshInstances.size, 2, "a different area is a different key");
  const dynamic = manager.AddMeshGroup__DynamicPerInstanceData(geometry, 0, TriBatchType.TRIBATCHTYPE_OPAQUE, 0, 0, 1, null, 7,
    pod, sphere, [ new EveInstancedMeshManagerDynamicPerInstanceData() ], 1, null, 0);
  assert.equal(manager._meshInstances.size, 3, "a dynamic group of the same mesh keeps its own MeshData (KeyHasher quirk)");
  assert.equal(dynamic.index, 0);

  manager.RemoveMeshGroup(a);
  assert.equal(a.index, INVALID, "cpp:381");
  assert.equal(b.index, 0, "the back group moved into slot 0 (cpp:371)");
  assert.equal(meshData.meshGroups.length, 1);
  assert.equal(manager._instanceCount, 5 - 2 + 1 + 1, "cpp:368");

  manager.RemoveMeshGroup(b);
  assert.equal(manager._meshInstances.size, 2, "an emptied MeshData is erased (cpp:374-377)");
  manager.RemoveMeshGroup(other);
  manager.RemoveMeshGroup(dynamic);
  assert.equal(manager._meshInstances.size, 0);
  assert.equal(manager._instanceCount, 0);
});

test("bare AddMeshGroup names both overloads (h:113-145)", () =>
{
  assert.throws(() => new EveInstancedMeshManager().AddMeshGroup(),
    /AddMeshGroup__DynamicPerInstanceData.*AddMeshGroup__StaticPerInstanceData/);
});

test("instance buffer ring: allocate, merge, trim (cpp:398-507)", () =>
{
  const buffer = new EveInstancedMeshManagerInstanceBuffer();
  assert.equal(buffer.GetUnusedRegion(16), null, "no buffer, no region (cpp:436-439)");
  assert.equal(buffer.GetSize(), 0, "cpp:506");

  const first = buffer.Allocate(256);
  assert.equal(first.offset, 0, "a new buffer starts at 0 (cpp:418)");
  assert.equal(buffer.GetSize(), 128 * 1024 * 4, "at least 128K stride-4 elements (cpp:415-416)");
  assert.ok(first.data.byteLength >= 256, "mapped bytes from the span");

  const second = buffer.Allocate(64);
  assert.equal(second.offset, 256, "allocated after the last region (cpp:451)");
  assert.equal(buffer._regions.length, 1, "same frame and contiguous: merged (cpp:423-426)");
  assert.equal(buffer._regions[0].length, 320);
  buffer.DoneCopying();
  assert.equal(buffer._mappedData, null, "cpp:479");

  const frame = buffer._regions[0].recordedFrame;
  buffer.TrimRegions(frame - 1);
  assert.equal(buffer._regions.length, 1, "a frame not yet rendered stays reserved (cpp:494)");
  buffer.TrimRegions(frame);
  assert.equal(buffer._regions.length, 0, "rendered frames free their regions");
});

test("CollectMeshes drives InstancedMeshProvider components and uploads their per-object data (cpp:71-121)", () =>
{
  const registry = new EveComponentRegistry();
  const geometry = FakeGeometry();
  const provider = {
    calls: 0,
    pod: null,
    sphere: null,
    group: null,
    data: RawData.create("EveSpacePerObjectData"),
    state: new Map(),
    GetComponentIndex(bit) { return this.state.get(bit); },
    SetComponentState(bit, index) { this.state.set(bit, index); },
    AddMeshesToManager(manager)
    {
      this.calls++;
      if (this.group) return;
      this.pod = manager.AddPerObjectData(this.data);
      this.sphere = AddSphereGroup(manager);
      this.group = AddStatic(manager, this.pod, this.sphere, { geometry, owner: this });
    }
  };
  provider.data.GetData()[0] = 42;
  registry.RegisterComponent("InstancedMeshProvider", provider);

  const manager = new EveInstancedMeshManager();
  manager.CollectMeshes(registry);
  manager.CollectMeshes(registry);

  assert.equal(provider.calls, 2, "every frame asks every provider (cpp:80-82)");
  assert.equal(provider.pod.IsValid(), true, "per-object handle");
  assert.equal(provider.sphere.IsValid(), true, "sphere handle");
  assert.equal(provider.group.IsValid(), true, "mesh-group handle");
  assert.equal(provider.group.owner, manager);

  const buffer = manager._perObjectDataBuffer;
  assert.ok(buffer, "created on the first frame with per-object data (cpp:87-90)");
  assert.equal(buffer.GetCount(), 1, "max( count, 2 * old ) (cpp:94)");
  const view = buffer.GetGpuBuffer(0).MapForWriting(Tr2RenderContext_GetMainThreadRenderContext()).data;
  assert.equal(new Float32Array(view.buffer, view.byteOffset, 1)[0], 42, "the record's bytes were copied (cpp:100-104)");
  assert.equal(Tr2VariableStore.globalStore().GetVariable("InstancedPerObjectBuffer").GetValue(), buffer,
    "published as InstancedPerObjectBuffer (cpp:117)");
});

test("the scene owns an instanced mesh manager (EveSpaceScene.cpp:301)", () =>
{
  const scene = new EveSpaceScene();
  assert.equal(scene.instancedMeshManager.constructor, EveInstancedMeshManager);
  scene.Destroy();
});
