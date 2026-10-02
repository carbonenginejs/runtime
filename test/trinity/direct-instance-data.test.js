import assert from "node:assert/strict";
import test from "node:test";
import { blue } from "../../npm/dist/global/blue/index.js";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { Tr2CpuUsage, Tr2GpuUsage } from "../../npm/dist/global/consts/renderContext/index.js";
import { Tr2DirectInstanceData, Tr2InstancedMesh, Tr2EffectStateManager, Tr2VertexDefinition,
  Tr2RenderContext_GetMainThreadRenderContext, TriDevice, EveShip2, ITr2InstanceData } from "../../npm/dist/trinity/index.js";
import { Tr2RenderContextALStub, ALResult } from "../../npm/dist/trinityal/index.js";
import { EveSOF } from "../../npm/dist/sof/index.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { StubResMan } from "../support/stubResMan.js";
import "../../npm/dist/audio/index.js";

function setup(t)
{
  const context = Tr2RenderContext_GetMainThreadRenderContext();
  const previous = context.GetRenderContextAL(), manager = blue.resMan;
  const registered = new Set(TriDevice.GetResourcesRegistered());
  const al = new Tr2RenderContextALStub();
  al.CreateDevice();
  al.BeginScene();
  context.SetRenderContextAL(al);
  blue.resMan = new StubResMan();
  t.after(() =>
  {
    for (const resource of TriDevice.GetResourcesRegistered())
    {
      if (registered.has(resource)) continue;
      resource.ReleaseResources();
      TriDevice.UnregisterResource(resource);
    }
    context.SetRenderContextAL(previous);
    blue.resMan = manager;
    al.Destroy();
  });
  return { context, al };
}

function layout()
{
  const definition = new Tr2VertexDefinition();
  definition.Add("FLOAT32_3", "POSITION");
  definition.Add("FLOAT32_1", "TEXCOORD");
  return definition;
}

test("direct instance buffer implements Carbon allocation, mapping and reset lifetime", t =>
{
  setup(t);
  const provider = new Tr2DirectInstanceData();
  assert.ok(TriDevice.GetResourcesRegistered().includes(provider));
  assert.equal(provider.IsInstanceDataReady(), false);
  assert.equal(provider.GetInstanceBufferVertexDeclaration(), Tr2EffectStateManager.Unknown);
  assert.equal(provider.GetData(3), null, "no stride means no allocation (cpp:175-178)");
  provider.SetLayout(layout());
  assert.equal(provider.GetCount(), 0);
  assert.equal(provider.GetStride(), 16);
  assert.equal(provider.IsInstanceDataReady(), false, "a declaration alone is insufficient (cpp:74-77)");
  const mapped = provider.GetData(3);
  assert.equal(mapped.byteLength, 48);
  mapped.set([1, 2, 3, 4]);
  provider.UpdateData();
  const data = provider.GetInstanceData(99, 0.5);
  assert.equal(data.offset, 0);
  assert.equal(data.count, 3);
  assert.equal(data.stride, 16);
  assert.equal(data.buffer.GetDesc().gpuUsage, Tr2GpuUsage.VERTEX_BUFFER);
  assert.equal(data.buffer.GetDesc().cpuUsage, Tr2CpuUsage.WRITE_OFTEN);
  assert.equal(provider.IsInstanceDataReady(), true);
  assert.equal(provider.GetData(2), mapped, "a smaller count reuses the allocation (cpp:182-198)");
  assert.deepEqual(Array.from(mapped.subarray(0, 4)), [1, 2, 3, 4]);
  provider.UpdateData();
  const grown = provider.GetData(5);
  assert.equal(grown.byteLength, 80);
  assert.notEqual(grown, mapped);
  provider.UpdateData();
  const declaration = provider.GetInstanceBufferVertexDeclaration();
  provider.ReleaseResources();
  assert.equal(provider.IsInstanceDataReady(), false);
  assert.equal(provider.GetCount(), 5, "device release retains requested count (cpp:25-29)");
  assert.equal(provider.PrepareResources(), true);
  assert.equal(provider.IsInstanceDataReady(), true);
  assert.equal(provider.GetInstanceBufferVertexDeclaration(), declaration);
  provider.DestroyData();
  assert.equal(provider.GetCount(), 0);
  assert.equal(provider.IsInstanceDataReady(), false);
  assert.equal(provider.GetInstanceBufferVertexDeclaration(), declaration);
  provider.Destroy();
  assert.equal(TriDevice.GetResourcesRegistered().includes(provider), false);
});

test("direct instance allocation and mapping failures remain visible", t =>
{
  const { al } = setup(t);
  const provider = new Tr2DirectInstanceData();
  provider.SetLayout(layout());
  const create = al.CreateBuffer.bind(al);
  al.CreateBuffer = () => ({ result: ALResult.E_OUTOFMEMORY, implementation: null });
  assert.equal(provider.GetData(2), null);
  assert.equal(provider.OnPrepareResources(), false);
  assert.equal(provider.IsInstanceDataReady(), false);
  al.CreateBuffer = create;
  assert.equal(provider.OnPrepareResources(), true);
  const buffer = provider.GetInstanceData().buffer;
  const map = buffer.MapForWriting;
  buffer.MapForWriting = () => ({ result: ALResult.E_INVALIDCALL, data: null });
  assert.equal(provider.GetData(2), null);
  buffer.MapForWriting = map;
  assert.ok(provider.GetData(2));
  provider.UpdateData();
});

test("direct instance layouts copy authored offsets and reject nonzero streams", t =>
{
  setup(t);
  const provider = new Tr2DirectInstanceData(), definition = layout();
  definition.items[1].offset = 24;
  provider.SetLayout(definition);
  assert.equal(provider.GetStride(), 28);
  definition.items[1].offset = 100;
  assert.equal(provider.GetLayout().items[1].offset, 24);
  provider.GetData(1);
  provider.UpdateData();
  const previous = provider.GetLayout(), declaration = provider.GetInstanceBufferVertexDeclaration();
  const error = t.mock.method(console, "error", () => {});
  provider.SetLayout([{ stream: 1, offset: 0, byteSize: 16 }]);
  assert.equal(error.mock.callCount(), 1);
  assert.equal(provider.GetCount(), 0);
  assert.equal(provider.IsInstanceDataReady(), false);
  assert.equal(provider.GetLayout(), previous, "invalid stream retains prior layout (cpp:137-142)");
  assert.equal(provider.GetInstanceBufferVertexDeclaration(), declaration);
});

test("real gc3_t1 SOF ship prepares direct instance providers without an abstract throw", {
  skip: !process.env.DIRECT_INSTANCE_RESOURCE_BASE && "set DIRECT_INSTANCE_RESOURCE_BASE to a resource server's /resource/ URL"
}, async t =>
{
  setup(t);
  const bytes = async path =>
  {
    const name = path.replace(/^res:\/+/, "").replace(/\.red$/u, ".black");
    const response = await fetch(new URL(name, process.env.DIRECT_INSTANCE_RESOURCE_BASE), { signal: AbortSignal.timeout(30000) });
    assert.equal(response.ok, true, `${path}: HTTP ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  };
  const sof = (await new EveSOF().Register({
    lazyData: { source: bytes },
    resources: { getObject: async path =>
    {
      const read = CjsBlackFormat.read(await bytes(path), { emit: "json" });
      return (read.root ?? read).object ?? null;
    } },
    volumetricTrailPath: "res:/dx9/model/ship/booster/volumetrictrail.gr2"
  }));
  await sof.InitializeAsync();
  const values = await sof.BuildValuesFromDNAAsync("gc3_t1:gallentebase:gallente");
  const ship = CjsSchema.from("EveShip2", values);
  assert.ok(ship);
  const meshes = TriDevice.GetResourcesRegistered().filter(resource =>
    CjsSchema.cast(resource, Tr2InstancedMesh) &&
    CjsSchema.cast(resource.GetInstanceGeometryResource(), Tr2DirectInstanceData));
  assert.equal(meshes.length, 4, "real ship's authored direct-provider meshes");
  for (const mesh of meshes)
  {
    assert.doesNotThrow(() => mesh.PrepareResources());
    assert.equal(mesh.GetInstanceGeometryResource().IsInstanceDataReady(), false,
      "an unpopulated authored direct stream has no allocation");
  }
  const provider = meshes[0].GetInstanceGeometryResource();
  // Negative control restores the exact inherited placeholder from the old port.
  const ready = provider.IsInstanceDataReady;
  provider.IsInstanceDataReady = ITr2InstanceData.prototype.IsInstanceDataReady;
  assert.throws(() => meshes[0].PrepareResources(), /ITr2InstanceData.IsInstanceDataReady must be implemented/);
  provider.IsInstanceDataReady = ready;
  assert.doesNotThrow(() => meshes[0].PrepareResources());
  t.diagnostic("SOF gc3_t1:gallentebase:gallente: 4 direct-provider meshes, original abstract throw reproduced by negative control");
});
