import assert from "node:assert/strict";
import test from "node:test";

import { Tr2GpuTimerALStub, Tr2OcclusionQueryALStub, Tr2PipelineStatsQueryALStub, Tr2RegisterMapAL, Tr2ResourceSetAL, Tr2ResourceSetALStub, Tr2VideoAdapterInfoStub } from "../../npm/dist/trinityal/index.js";
import { Tr2BitmapDimensions, Tr2BufferDescriptionAL, Tr2FenceALStub, Tr2RenderContextALStub, Tr2ResourceSetDescriptionAL, Tr2SamplerStateAL, ALResult } from "../../npm/dist/trinityal/index.js";
import { Tr2FenceAL, Tr2GpuTimerAL, Tr2OcclusionQueryAL, Tr2PipelineStatsQueryAL, Tr2ShaderAL, Tr2ShaderProgramAL, Tr2SwapChainAL, Tr2VertexLayoutAL } from "../../npm/dist/trinityal/index.js";
import { PixelFormat, Tr2GpuUsage, Tr2CpuUsage, ShaderType } from "../../npm/dist/global/consts/renderContext/index.js";

const device = () =>
{
  const context = new Tr2RenderContextALStub();

  context.CreateDevice();

  return context;
};

function resources(t)
{
  const al = device();
  const texture = al.CreateTexture(Tr2BitmapDimensions.create__WidthHeightMipCountFormat(4, 4, 1, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM), { gpuUsage: Tr2GpuUsage.RENDER_TARGET });
  const buffer = al.CreateBuffer(Tr2BufferDescriptionAL.create__Stride(4, 4, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE));
  t.after(() => { texture.Destroy(); buffer.Destroy(); al.Destroy(); });
  return { texture, buffer };
}

const signature = (...registers) => ({ registers: registers.map(([ registerType, registerIndex ]) => ({ registerType, registerIndex })) });
const mapFor = () => new Tr2RegisterMapAL({
  stages: [ 1, 0 ],
  signatures: [ signature([36, 3], [64, 4], [1, 2]), signature([36, 3]) ]
});

test("register maps retain input traversal, counts and 255 sentinels", () =>
{
  const map = mapFor();
  assert.equal(map.srvCount, 2);
  assert.equal(map.srvs[1][3], 0);
  assert.equal(map.srvs[0][3], 1);
  assert.equal(map.srvs[0][0], 255);
  assert.equal(map.uavCount, 1);
  assert.equal(map.samplerCount, 1);
  const copy = new Tr2RegisterMapAL({ copy: map });
  assert.equal(map.equals(copy), true);
  copy.srvs[0][0] = 4;
  assert.equal(map.equals(copy), false, "compares the whole populated category");
  const empty = new Tr2RegisterMapAL();
  const other = new Tr2RegisterMapAL();
  other.srvs[0][0] = 9;
  assert.equal(empty.equals(other), true, "zero-count arrays are ignored");
  const duplicate = new Tr2RegisterMapAL({ stage: 1, signature: signature([36, 7], [36, 7], [0, 2]) });
  assert.equal(duplicate.srvCount, 2);
  assert.equal(duplicate.srvs[1][7], 1, "duplicates increment and overwrite; constants are ignored");
});

test("descriptions allocate from maps and retain inactive fields and qualifiers", t =>
{
  const desc = new Tr2ResourceSetDescriptionAL({ registers: mapFor() });
  const { texture, buffer } = resources(t);
  const sampler = new Tr2RenderContextALStub().CreateSamplerState({ minFilter: 2, magFilter: 2, mipFilter: 2, addressU: 1, addressV: 1, addressW: 1 });
  assert.equal(new Tr2ResourceSetDescriptionAL().SetSrv__TextureAL(1, 3, texture), false);
  assert.equal(desc.SetSrv__TextureAL(1, 31, texture), false);
  assert.equal(desc.SetSrv__TextureAL(99, 3, texture), false);
  assert.equal(desc.SetSrv__TextureAL(1, -1, texture), false);
  assert.equal(desc.SetSrv__TextureAL(1, 3, texture), true);
  assert.equal(desc.SetSrv__TextureAL(1, 3, texture), false);
  assert.equal(desc.SetSrv__TextureAL(1, 3, texture, 1), true);
  const hash = desc.ComputeHash();
  assert.equal(desc.SetSrv__TextureAL(1, 3, texture, 0), true);
  assert.equal(desc.ComputeHash(), hash, "Carbon quirk: qualifiers are absent from the hash");
  assert.equal(desc.SetSrv__BufferAL(1, 3, buffer), true);
  assert.notEqual(desc._srv[0].texture, texture);
  assert.equal(desc._srv[0].texture.Equals(texture), true, "inactive texture is retained");
  assert.equal(desc.SetUav__TextureAL(1, 4, texture, 7), true);
  assert.equal(desc.SetUav__BufferAL(1, 4, buffer), true);
  assert.equal(desc._uav[0].colorSpace, 7, "union qualifier survives the buffer overload");
  assert.equal(desc.SetSampler(1, 2, sampler), true);
  desc.ClearResources();
  assert.equal(desc._srv[0].type, 0);
  assert.equal(desc._srv[0].buffer, null);
  assert.equal(desc._uav[0].colorSpace, 7);
  assert.equal(desc._samplers[0].sampler.Equals(sampler), true, "the sampler record keeps its value (Tr2ResourceSetAL.cpp:439-455)");
  assert.equal(desc._registerMap.srvCount, 2);
});

test("copy and move preserve Carbon's array-identity equality quirk", t =>
{
  const first = new Tr2ResourceSetDescriptionAL({ registers: mapFor() });
  const { texture: resource } = resources(t);
  first.SetSrv__TextureAL(1, 3, resource);
  const copy = new Tr2ResourceSetDescriptionAL({ copy: first });
  assert.equal(copy.Equals(first), false);
  assert.notEqual(copy._srv[0].texture, resource);
  assert.equal(copy._srv[0].texture.Equals(resource), true);
  assert.notEqual(copy._srv[0], first._srv[0]);
  assert.equal(copy.ComputeHash(), first.ComputeHash());
  copy.ClearResources();
  assert.equal(first._srv[0].texture.Equals(resource), true);
  const allocation = first._srv;
  const moved = new Tr2ResourceSetDescriptionAL({ move: first });
  assert.equal(moved._srv, allocation);
  t.after(() => moved.ClearResources());
  assert.equal(first._srv, null);
  assert.equal(first._registerMap.srvCount, 2, "native moved-from map is not reset");
  assert.equal(new Tr2ResourceSetDescriptionAL().Equals(new Tr2ResourceSetDescriptionAL()), true);
});

test("heap views are shared description operations, with native enum-byte hashes", () =>
{
  const desc = new Tr2ResourceSetDescriptionAL({ registers: mapFor() });
  assert.equal(desc.ComputeHash(), 0);
  assert.equal(desc.SetSrvHeapView(1, 3), true);
  assert.equal(desc.SetSrvHeapView(1, 3), false);
  assert.equal(desc.ComputeHash(), 0xBCB419E1, "FNV1 from seed zero over int32 enum 3");
  assert.equal(desc.SetUavHeapView(1, 4), true);
  assert.equal(desc.SetSamplerHeapView(1, 2), true);
  assert.equal(desc.SetSamplerHeapView(1, 2), false);
});

test("the stub Create succeeds even without a context, as the donor does", () =>
{
  const set = new Tr2ResourceSetALStub();
  const description = new Tr2ResourceSetDescriptionAL();
  const program = {};
  assert.equal(set.Create(description, program, null), ALResult.S_OK);
  assert.equal(set.IsValid(), true);
  assert.notEqual(set.GetDescription(), description);
  assert.equal(set.GetDescription().ComputeHash(), description.ComputeHash());
  assert.equal(set.GetDescription()._registerMap.equals(description._registerMap), true);
  set.Destroy();
  assert.equal(set.IsValid(), false);
});

test("public resource-set copies retain implementations across recreate and reset", () =>
{
  const context = device();
  const description = new Tr2ResourceSetDescriptionAL();
  const original = context.CreateResourceSet(description, {});
  const copy = new Tr2ResourceSetAL({ copy: original });
  const old = copy._resourceSet.implementation;
  assert.equal(original.SetName(null), ALResult.E_INVALIDARG);
  assert.equal(original.SetName(""), ALResult.S_OK);
  assert.equal(original.Create__Program(description, {}, context), ALResult.S_OK);
  assert.notEqual(original._resourceSet.implementation, old);
  original.Destroy();
  assert.equal(original.SetName("x"), ALResult.E_INVALIDCALL);
  assert.equal(copy.IsValid(), true);
  assert.equal(copy.Create__Pipeline(description, {}, context), ALResult.E_FAIL);
  assert.equal(copy.IsValid(), false);
  assert.equal(old.IsValid(), false, "failed recreation released the final owner");
  context.Destroy();
});

test("a fence marks one point, and a second is an error", () =>
{
  // A fence names one point. Putting a second before waiting means the caller
  // has lost track of which point it is waiting for, so Carbon refuses it.
  const fence = new Tr2FenceALStub();

  assert.equal(fence.PutFence(), ALResult.E_FAIL, "no device");
  assert.equal(fence.Create(device()), ALResult.S_OK);

  assert.deepEqual(fence.IsReached(), { result: ALResult.S_OK, isReached: true }, "nothing outstanding");
  assert.equal(fence.Wait(), ALResult.E_INVALIDCALL, "nothing to wait for");

  assert.equal(fence.PutFence(), ALResult.S_OK);
  assert.equal(fence.IsReached().isReached, false, "outstanding");
  assert.equal(fence.PutFence(), ALResult.E_INVALIDCALL, "two at once");

  assert.equal(fence.Wait(), ALResult.S_OK);
  assert.equal(fence.IsReached().isReached, true);
});

test("an occlusion query catches a mispaired End", () =>
{
  // This is the interface lens-flare occlusion has been missing. It reports
  // zero pixels rather than refusing, because on a device that draws nothing
  // zero is the correct answer.
  const query = new Tr2OcclusionQueryALStub();

  assert.equal(query.Create(null), ALResult.E_INVALIDARG);
  assert.equal(query.Create(device()), ALResult.S_OK);

  assert.equal(query.End(), ALResult.E_INVALIDCALL, "never began");
  assert.equal(query.Begin(), ALResult.S_OK);
  assert.equal(query.End(), ALResult.S_OK);

  assert.deepEqual(query.GetPixelCount(null), { result: ALResult.S_OK, count: 0 });
});

test("a GPU timer reports a tiny time, and minus one without a device", () =>
{
  // Carbon returns 0.0001 rather than zero, which a caller computing a rate can
  // divide by, and -1 to distinguish "no timer" from "no time".
  const timer = new Tr2GpuTimerALStub();

  assert.equal(timer.GetTime(), -1, "no timer");

  timer.Create(device());

  assert.equal(timer.GetTime(), 0.0001);
  assert.equal(timer.Begin(), true);

  timer.Destroy();

  assert.equal(timer.GetTime(), -1);
});

test("pipeline statistics succeed and report nothing", () =>
{
  const query = new Tr2PipelineStatsQueryALStub();

  assert.equal(query.IsValid(), true, "always valid; nothing to allocate");
  assert.equal(query.Begin(), ALResult.S_OK);
  assert.equal(query.End(), ALResult.S_OK);

  const { result, data } = query.GetStats();

  assert.equal(result, ALResult.S_OK);
  assert.equal(Tr2PipelineStatsQueryALStub.GetValueCount(data), 0);
  assert.equal(Tr2PipelineStatsQueryALStub.GetLabel(data, 0), "");
  assert.equal(Tr2PipelineStatsQueryALStub.GetValue(data, 0), 0);
});

test("the adapter's available mode is not its current mode", () =>
{
  // Carbon's stub reports 1920x1200 as available against 800x600 as current,
  // which catches a caller that treats the two as interchangeable.
  const current = Tr2VideoAdapterInfoStub.GetAdapterDisplayMode().mode;
  const available = Tr2VideoAdapterInfoStub.GetAdapterMode().mode;

  assert.deepEqual([ current.width, current.height ], [ 800, 600 ]);
  assert.deepEqual([ available.width, available.height ], [ 1920, 1200 ]);

  assert.equal(Tr2VideoAdapterInfoStub.GetAdapterCount().count, 1);
  assert.equal(Tr2VideoAdapterInfoStub.GetAdapterInfo().info.driver, "stub");
  assert.equal(Tr2VideoAdapterInfoStub.GetAdapterMaxTextureWidth().maxWidth, 16384);
  assert.equal(Tr2VideoAdapterInfoStub.AreAdaptersDifferent(0, 1), true);
  assert.equal(Tr2VideoAdapterInfoStub.AreAdaptersDifferent(0, 0), false);
});


test("stub program maps remain empty while signature-built descriptions have resources", t =>
{
  const context = device();
  const input = signature([36, 3]);
  const shader = context.CreateShader(ShaderType.PIXEL_SHADER, new Uint8Array([1]), input);
  const program = context.CreateShaderProgram([shader]);
  assert.equal(program.IsValid(), true);
  assert.equal(program.GetRegisterMap().srvCount, 0, "Carbon stub quirk");
  const desc = new Tr2ResourceSetDescriptionAL({ registers: new Tr2RegisterMapAL({ shaders: [shader] }) });
  assert.equal(desc._registerMap.srvCount, 1);
  assert.equal(desc.SetSrv__TextureAL(ShaderType.PIXEL_SHADER, 3, resources(t).texture), true);
  desc.ClearResources();
  shader.Destroy();
  program.Destroy();
});


test("explicit invalid buffer, texture and sampler bindings retain distinct hash identities", () =>
{
  const desc = new Tr2ResourceSetDescriptionAL({ registers: mapFor() });
  desc.SetSrv__BufferAL(1, 3, null);
  const bufferHash = desc.ComputeHash();
  desc.SetSrv__TextureAL(1, 3, null);
  const textureHash = desc.ComputeHash();
  desc.ClearResources();
  desc.SetSampler(1, 2, new Tr2SamplerStateAL());
  const samplerHash = desc.ComputeHash();
  assert.equal(new Set([0, bufferHash, textureHash, samplerHash]).size, 4);
});

// THE BACKEND-NEUTRAL HANDLES (trinityal/include/*.h): each is invalid until
// Create, realized against a context whose backend supplies the
// implementation, and a failed Create leaves it on the shared null
// implementation (e.g. Tr2FenceAL.cpp:22-31).
test("every handle is invalid until Create, and shares its implementation by copy", () =>
{
  const al = device();
  const cases = [
    [ Tr2FenceAL, value => value.Create(al) ],
    [ Tr2VertexLayoutAL, value => value.Create([ { usage: 0, usageIndex: 0, type: "FLOAT32_3", offset: 0, stream: 0 } ], al) ],
    [ Tr2ShaderAL, value => value.Create(ShaderType.VERTEX_SHADER, new Uint8Array([ 1 ]), null, "", al) ],
    [ Tr2SwapChainAL, value => value.Create(0, al) ],
    [ Tr2GpuTimerAL, value => value.Create(al) ],
    [ Tr2OcclusionQueryAL, value => value.Create(al) ]
  ];

  for (const [ Handle, create ] of cases)
  {
    const value = new Handle();

    assert.equal(value.IsValid(), false, `${Handle.name} starts invalid`);
    assert.equal(value.SetName("x"), ALResult.E_INVALIDCALL, `${Handle.name} refuses a name while invalid`);
    assert.ok(new Handle().Equals(value), `${Handle.name}: every default shares the null implementation`);

    assert.equal(create(value), ALResult.S_OK, Handle.name);
    assert.equal(value.IsValid(), true, Handle.name);

    const copy = new Handle({ copy: value });

    assert.ok(copy.Equals(value), `${Handle.name}: a copy shares the implementation`);
    value.Destroy();
    assert.equal(value.IsValid(), false, `${Handle.name}: Destroy returns to the null implementation`);
    assert.equal(copy.IsValid(), true, `${Handle.name}: the copy keeps it alive`);
    copy.Destroy();
  }
});

test("a shader program links Tr2ShaderAL values, and a failed Create leaves the null program", () =>
{
  const al = device();
  const vertex = new Tr2ShaderAL();
  const pixel = new Tr2ShaderAL();

  vertex.Create(ShaderType.VERTEX_SHADER, new Uint8Array([ 1 ]), null, "", al);
  pixel.Create(ShaderType.PIXEL_SHADER, new Uint8Array([ 1 ]), null, "", al);

  const program = new Tr2ShaderProgramAL();

  assert.equal(program.Create([ vertex, pixel ], 2, al), ALResult.S_OK);
  assert.equal(program.IsValid(), true);
  assert.equal(program.TrinityALImpl_GetObject().GetShaders()[0], vertex, "the stub keeps the values it linked");

  assert.equal(program.Create([ vertex, vertex ], 2, al), ALResult.E_INVALIDARG, "two stages of one type");
  assert.ok(program.Equals(new Tr2ShaderProgramAL()), "a refused Create leaves the null program");
  assert.equal(program.GetRegisterMap().equals(new Tr2RegisterMapAL()), true);
  assert.equal(program.CreateCommandSignatures({}, al), ALResult.E_FAIL, "DX12 alone builds command signatures");
});

test("the occlusion query's WaitMode is Carbon's, declared on the handle", () =>
{
  // Tr2OcclusionQueryAL.h:20-24: WAIT first. The stub's own copy had them swapped.
  assert.deepEqual({ ...Tr2OcclusionQueryAL.WaitMode }, { WAIT: 0, DO_NOT_WAIT: 1 });

  const query = new Tr2OcclusionQueryAL();
  const al = device();

  assert.deepEqual(query.GetPixelCount(al), { result: ALResult.E_INVALIDCALL, count: 0 }, "the null query refuses");
  query.Create(al);
  assert.equal(query.Begin(al), ALResult.S_OK);
  assert.equal(query.End(al), ALResult.S_OK);
  assert.deepEqual(query.GetPixelCount(al), { result: ALResult.S_OK, count: 0 });
});

test("a pipeline statistics record is read through the backend that made it", () =>
{
  const query = new Tr2PipelineStatsQueryAL();
  const al = device();

  assert.equal(query.IsValid(), false, "the null query is invalid, as dx11's default is");
  assert.equal(query.Create(al), ALResult.S_OK);
  assert.equal(query.IsValid(), true, "the stub's is always valid");

  const { result, data } = query.GetStats(al);

  assert.equal(result, ALResult.S_OK);
  assert.equal(Tr2PipelineStatsQueryAL.GetValueCount(data), 0);
  assert.equal(Tr2PipelineStatsQueryAL.GetLabel(data, 0), "");
  assert.equal(Tr2PipelineStatsQueryAL.GetValue(data, 0), 0);
});

test("a backend without a query or a standalone swap chain refuses Create with E_FAIL", async () =>
{
  // Metal refuses a counter the device cannot sample with E_FAIL
  // (Tr2GpuTimerALMetal.mm:48-51); the handle stays on the null implementation.
  const { CjsWebgpuRenderContextAL } = await import("../../npm/dist/trinityal/webgpu/internal.js");
  const webgpu = new CjsWebgpuRenderContextAL();

  for (const Handle of [ Tr2SwapChainAL, Tr2GpuTimerAL, Tr2OcclusionQueryAL, Tr2PipelineStatsQueryAL ])
  {
    const value = new Handle();
    const result = Handle === Tr2SwapChainAL ? value.Create(0, webgpu) : value.Create(webgpu);

    assert.equal(result, ALResult.E_FAIL, Handle.name);
    assert.equal(value.IsValid(), false, Handle.name);
  }
});
