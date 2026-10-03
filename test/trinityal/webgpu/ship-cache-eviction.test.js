import assert from "node:assert/strict";
import { test } from "node:test";
import { CjsBlueResMan, CjsMotherLode, CjsResource, TriGeometryRes, RegisterTextureResources } from "../../../npm/dist/resource/index.js";
import { CjsWebgpuDevice } from "../../../npm/dist/trinityal/webgpu/index.js";
import { CjsWebgpuRenderContextAL } from "../../../npm/dist/trinityal/webgpu/internal.js";
import { Tr2RenderContext } from "../../../npm/dist/trinity/core/index.js";
import { RealizeTexture } from "../../../npm/dist/trinity/core/Tr2ImageIOHelpers.js";
import { CreateLodAllocations, SharedGeometryBuffer, ReleaseSharedGeometryBuffer } from "../../../npm/dist/trinity/core/mesh/TriGeometryResAllocations.js";
import { Tr2BufferDescriptionAL } from "../../../npm/dist/trinityal/index.js";
import { Tr2GpuUsage, Tr2CpuUsage } from "../../../npm/dist/global/consts/renderContext/index.js";

// The real resource manager, texture/geometry owners and WebGPU AL run against
// this counting GPUDevice. No browser, adapter or physical GPU is involved.
function context()
{
  const live = { textures: new Set(), buffers: new Set() };
  const destroyed = [];
  function create(kind, descriptor)
  {
    const object = { descriptor, createView: () => ({}), destroy() {
      assert.ok(live[kind].delete(object), "each physical object is destroyed once");
      destroyed.push(object);
    } };
    live[kind].add(object);
    return object;
  }
  const device = {
    createTexture: d => create("textures", d), createBuffer: d => create("buffers", d),
    createShaderModule: () => ({}), pushErrorScope() {}, popErrorScope: async () => null,
    limits: { maxTextureDimension2D: 8192, maxTextureDimension3D: 2048 },
    queue: { writeTexture() {}, writeBuffer() {} }
  };
  const webgpu = new CjsWebgpuDevice({ device,
    shaderStage: { VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 },
    textureUsage: { TEXTURE_BINDING: 4, COPY_DST: 2, RENDER_ATTACHMENT: 16 },
    bufferUsage: { COPY_SRC: 4, COPY_DST: 8, UNIFORM: 16, VERTEX: 32, INDEX: 64, STORAGE: 128 }
  });
  const al = new CjsWebgpuRenderContextAL({ webgpu,
    dispatcher: { PrepareAccumulator: () => null, EncodeAccumulator() {} },
    renderTarget: { GetWidth: () => 1, GetHeight: () => 1, GetFormat: () => "bgra8unorm", GetDepthFormat: () => null, GetSampleCount: () => 1 }
  });
  al.CreateDevice();
  const render = new Tr2RenderContext();
  render.SetRenderContextAL(al);
  return { al, render, live, destroyed };
}

function dds()
{
  const bytes = new Uint8Array(132), view = new DataView(bytes.buffer);
  for (const [ offset, value ] of [[0,0x20534444],[4,124],[8,0x1007],[12,1],[16,1],[28,1],
    [76,32],[80,0x41],[88,32],[92,255],[96,65280],[100,16711680],[104,4278190080],[108,0x1000]])
    view.setUint32(offset, value, true);
  bytes.fill(255, 128);
  return bytes;
}

test("switching ships lets the idle owner's GPU objects expire while the current ship survives", async () =>
{
  let now = 0;
  const { al, render, live, destroyed } = context();
  const manager = new CjsBlueResMan({ motherLode: new CjsMotherLode({ now: () => now }), source: { Read: () => dds() } });
  RegisterTextureResources(manager);
  manager.SetAutoPurgePolicy({ intervalMilliseconds: 1, maxIdleMilliseconds: 10, now: () => now });
  const counts = () => [ live.textures.size, live.buffers.size ];
  const initial = counts();
  async function ship(name)
  {
    const texture = await manager.FetchResource(`res:/${name}.dds`);
    RealizeTexture(texture, al);
    const geometry = new TriGeometryRes();
    geometry.Initialize(`res:/${name}.gr2`, "gr2");
    const mesh = {
      decl: [ { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 } ],
      vertex: { position: new Float32Array([0,0,0, 1,0,0, 0,1,0]) },
      indices: [ { faces: new Uint16Array([0,1,2]) } ], areas: [ { firstElement: 0, elementCount: 1 } ]
    };
    geometry.SetPayload({ meshes: [mesh] });
    geometry.MarkPrepared();
    manager.motherLode.Insert(geometry.GetPath(), geometry);
    CreateLodAllocations(geometry, 0, mesh, render);
    const allocation = mesh.vertexAllocation;
    // A private adapter buffer exercises physical buffer destruction separately
    // from Carbon's shared geometry pool, whose surviving slices must stay valid.
    const privateResource = new CjsResource();
    privateResource.Initialize(`res:/${name}.private`);
    privateResource.SetPayload(new Uint8Array(16));
    privateResource.MarkPrepared();
    const buffer = al.CreateBuffer(Tr2BufferDescriptionAL.FromStride(4, 4, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.IMMUTABLE), new Uint8Array(16));
    privateResource.SetAdapterResource("webgpu", buffer);
    manager.motherLode.Insert(privateResource.GetPath(), privateResource);
    return { texture, geometry, privateResource, buffer, allocation, mesh };
  }
  const a = await ship("first");
  const first = counts();
  now = 5;
  const b = await ship("second");
  assert.deepEqual(counts(), [first[0] + 1, first[1] + 1]);
  now = 11;
  manager.Update();
  assert.deepEqual(counts(), first, "physical texture and private buffer counts return to one ship");
  assert.equal(destroyed.length, 2);
  for (const resource of [a.texture, a.geometry, a.privateResource])
  {
    assert.equal(manager.motherLode.Lookup(resource.GetPath()), null);
    assert.equal(resource.HasPayload(), false);
  }
  assert.equal(a.buffer.IsValid(), false);
  assert.equal(a.allocation.IsValid(), false);
  assert.equal(b.buffer.IsValid(), true);
  assert.equal(b.allocation.IsValid(), true);
  const pool = SharedGeometryBuffer(render);
  assert.equal(pool.m_allocations.length, 3, "only second ship's vertex, index and reversed-index slices remain");
  const beforeReuse = counts();
  now = 12;
  const again = await ship("first");
  assert.equal(pool.GetBlocks().length, 1, "the expired geometry's space is reused");
  assert.deepEqual(counts(), [beforeReuse[0] + 1, beforeReuse[1] + 1]);
  assert.equal(again.allocation.IsValid(), true);
  manager.Clear();
  ReleaseSharedGeometryBuffer(render);
  assert.deepEqual(counts(), initial, "context shutdown releases the shared GPU block too");
});
