import assert from "node:assert/strict";
import test from "node:test";

import { Tr2GpuTimerALStub, Tr2OcclusionQueryALStub, Tr2PipelineStatsQueryALStub, Tr2RegisterMapAL, Tr2ResourceSetAL, Tr2ResourceSetALStub, Tr2VideoAdapterInfoStub } from "../../npm/dist/trinityal/index.js";
import { Tr2FenceALStub, Tr2RenderContextALStub, Tr2ResourceSetDescriptionAL, ALResult } from "../../npm/dist/trinityal/index.js";
import { ShaderType } from "../../npm/dist/global/consts/renderContext/index.js";

const device = () =>
{
  const context = new Tr2RenderContextALStub();

  context.CreateDevice();

  return context;
};

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

test("descriptions allocate from maps and retain inactive fields and qualifiers", () =>
{
  const desc = new Tr2ResourceSetDescriptionAL({ registers: mapFor() });
  const texture = {}, buffer = {}, sampler = {};
  assert.equal(new Tr2ResourceSetDescriptionAL().SetSrv(1, 3, texture), false);
  assert.equal(desc.SetSrv(1, 31, texture), false);
  assert.equal(desc.SetSrv(99, 3, texture), false);
  assert.equal(desc.SetSrv(1, -1, texture), false);
  assert.equal(desc.SetSrv(1, 3, texture), true);
  assert.equal(desc.SetSrv(1, 3, texture), false);
  assert.equal(desc.SetSrv(1, 3, texture, 1), true);
  const hash = desc.ComputeHash();
  assert.equal(desc.SetSrv(1, 3, texture, 0), true);
  assert.equal(desc.ComputeHash(), hash, "Carbon quirk: qualifiers are absent from the hash");
  assert.equal(desc.SetSrv(1, 3, buffer, 0, 1), true);
  assert.equal(desc.m_srv[0].texture, texture, "inactive texture is retained");
  assert.equal(desc.SetUav(1, 4, texture, 7), true);
  assert.equal(desc.SetUav(1, 4, buffer, 0, 1), true);
  assert.equal(desc.m_uav[0].colorSpace, 7, "union qualifier survives the buffer overload");
  assert.equal(desc.SetSampler(1, 2, sampler), true);
  desc.ClearResources();
  assert.equal(desc.m_srv[0].type, 0);
  assert.equal(desc.m_srv[0].buffer, null);
  assert.equal(desc.m_uav[0].colorSpace, 7);
  assert.equal(desc.m_samplers[0].sampler, sampler);
  assert.equal(desc.m_registerMap.srvCount, 2);
});

test("copy and move preserve Carbon's array-identity equality quirk", () =>
{
  const first = new Tr2ResourceSetDescriptionAL({ registers: mapFor() });
  const resource = {};
  first.SetSrv(1, 3, resource);
  const copy = new Tr2ResourceSetDescriptionAL({ copy: first });
  assert.equal(copy.Equals(first), false);
  assert.equal(copy.m_srv[0].texture, resource);
  assert.notEqual(copy.m_srv[0], first.m_srv[0]);
  assert.equal(copy.ComputeHash(), first.ComputeHash());
  copy.ClearResources();
  assert.equal(first.m_srv[0].texture, resource);
  const allocation = first.m_srv;
  const moved = new Tr2ResourceSetDescriptionAL({ move: first });
  assert.equal(moved.m_srv, allocation);
  assert.equal(first.m_srv, null);
  assert.equal(first.m_registerMap.srvCount, 2, "native moved-from map is not reset");
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
  assert.equal(set.GetDescription(), description);
  set.Destroy();
  assert.equal(set.IsValid(), false);
});

test("public resource-set copies retain implementations across recreate and reset", () =>
{
  const context = device();
  const description = new Tr2ResourceSetDescriptionAL();
  const original = context.CreateResourceSet(description, {});
  const copy = new Tr2ResourceSetAL({ copy: original });
  const old = copy.m_resourceSet.implementation;
  assert.equal(original.SetName(null), ALResult.E_INVALIDARG);
  assert.equal(original.SetName(""), ALResult.S_OK);
  assert.equal(original.Create(description, {}, context), ALResult.S_OK);
  assert.notEqual(original.m_resourceSet.implementation, old);
  original.Destroy();
  assert.equal(original.SetName("x"), ALResult.E_INVALIDCALL);
  assert.equal(copy.IsValid(), true);
  assert.equal(copy.Create(description, {}, context, true), ALResult.E_FAIL);
  assert.equal(copy.IsValid(), false);
  old.Destroy();
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

  assert.deepEqual(query.GetPixelCount(), { result: ALResult.S_OK, count: 0 });
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


test("stub program maps remain empty while signature-built descriptions have resources", () =>
{
  const context = device();
  const input = signature([36, 3]);
  const shader = context.CreateShader(ShaderType.PIXEL_SHADER, new Uint8Array([1]), input);
  const program = context.CreateShaderProgram([shader]);
  assert.equal(program.IsValid(), true);
  assert.equal(program.GetRegisterMap().srvCount, 0, "Carbon stub quirk");
  const desc = new Tr2ResourceSetDescriptionAL({ registers: new Tr2RegisterMapAL({ shaders: [shader] }) });
  assert.equal(desc.m_registerMap.srvCount, 1);
  assert.equal(desc.SetSrv(ShaderType.PIXEL_SHADER, 3, {}), true);
  shader.Destroy();
  program.Destroy();
});


test("explicit invalid buffer, texture and sampler bindings retain distinct hash identities", () =>
{
  const desc = new Tr2ResourceSetDescriptionAL({ registers: mapFor() });
  desc.SetSrv(1, 3, null, 0, 1);
  const bufferHash = desc.ComputeHash();
  desc.SetSrv(1, 3, null);
  const textureHash = desc.ComputeHash();
  desc.ClearResources();
  desc.SetSampler(1, 2, null);
  const samplerHash = desc.ComputeHash();
  assert.equal(new Set([0, bufferHash, textureHash, samplerHash]).size, 4);
});
