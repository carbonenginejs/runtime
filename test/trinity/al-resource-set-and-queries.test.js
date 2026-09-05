import assert from "node:assert/strict";
import test from "node:test";

import {
  Tr2FenceALStub,
  Tr2GpuTimerALStub,
  Tr2OcclusionQueryALStub,
  Tr2PipelineStatsQueryALStub,
  Tr2RegisterMapAL,
  Tr2RenderContextALStub,
  Tr2ResourceSetALStub,
  Tr2ResourceSetDescriptionAL,
  Tr2VideoAdapterInfoStub,
  ALResult
} from "../../npm/dist/trinity/core/index.js";
import { ShaderType } from "../../npm/dist/global/consts/renderContext/index.js";

const device = () =>
{
  const context = new Tr2RenderContextALStub();

  context.CreateDevice();

  return context;
};

test("a register is per shader stage, not global", () =>
{
  // The part a flat binding model loses: t3 in a vertex shader and t3 in a
  // pixel shader are different bindings, which is why Carbon's register map is
  // indexed by stage first.
  const description = new Tr2ResourceSetDescriptionAL();
  const vertexTexture = { id: "vs" };
  const pixelTexture = { id: "ps" };

  assert.equal(description.SetSrv(ShaderType.VERTEX_SHADER, 3, vertexTexture), true);
  assert.equal(description.SetSrv(ShaderType.PIXEL_SHADER, 3, pixelTexture), true);

  assert.equal(description.Get("srv", ShaderType.VERTEX_SHADER, 3).resource, vertexTexture);
  assert.equal(description.Get("srv", ShaderType.PIXEL_SHADER, 3).resource, pixelTexture);
  assert.equal(description.GetRegisterMap().Count("srv"), 2, "two bindings, not one");
});

test("a slot outside the stage or register range is refused", () =>
{
  const description = new Tr2ResourceSetDescriptionAL();

  assert.equal(description.SetSrv(ShaderType.VERTEX_SHADER, 32, {}), false, "32 registers per stage");
  assert.equal(description.SetSrv(ShaderType.VERTEX_SHADER, -1, {}), false);
  assert.equal(description.SetSampler(99, 0, {}), false, "no such stage");
  assert.equal(description.Get("srv", ShaderType.VERTEX_SHADER, 32), null);
});

test("two descriptions with the same registers have the same map", () =>
{
  // Carbon compares whole register maps, and that comparison is how it decides
  // two draws can share a resource set.
  const first = new Tr2ResourceSetDescriptionAL();
  const second = new Tr2ResourceSetDescriptionAL();

  first.SetSrv(ShaderType.PIXEL_SHADER, 0, { id: "a" });
  first.SetSampler(ShaderType.PIXEL_SHADER, 0, { id: "s" });

  second.SetSrv(ShaderType.PIXEL_SHADER, 0, { id: "b" });
  second.SetSampler(ShaderType.PIXEL_SHADER, 0, { id: "t" });

  assert.equal(first.GetRegisterMap().Equals(second.GetRegisterMap()), true, "same shape, different resources");

  second.SetSrv(ShaderType.PIXEL_SHADER, 1, { id: "c" });

  assert.equal(first.GetRegisterMap().Equals(second.GetRegisterMap()), false, "an extra register is a different shape");
  assert.equal(new Tr2RegisterMapAL().Equals(null), false);
});

test("a resource set keeps what it was asked to bind", () =>
{
  const set = new Tr2ResourceSetALStub();
  const description = new Tr2ResourceSetDescriptionAL();
  const program = { id: "program" };

  assert.equal(set.Create(description, program, null), ALResult.E_INVALIDARG, "no context");
  assert.equal(set.IsValid(), false);

  assert.equal(set.Create(description, program, device()), ALResult.S_OK);
  assert.equal(set.IsValid(), true);
  assert.equal(set.GetDescription(), description);
  assert.equal(set.GetProgram(), program);

  set.Destroy();

  assert.equal(set.IsValid(), false);
  assert.equal(set.GetDescription(), null);
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
