import assert from "node:assert/strict";
import test from "node:test";
import { Tr2ParticleSystem, Tr2ParticleElementDeclaration, ITr2GenericEmitterUpdateArguments,
  Tr2RenderContext_GetMainThreadRenderContext, Tr2EffectStateManager } from "../../npm/dist/trinity/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { Tr2CpuUsage, Tr2GpuUsage } from "../../npm/dist/global/consts/renderContext/index.js";

function setup(t, ready = true)
{
  const context = Tr2RenderContext_GetMainThreadRenderContext();
  const previous = context.GetRenderContextAL();
  const al = new Tr2RenderContextALStub();
  context.SetRenderContextAL(al);
  if (ready) al.CreateDevice();
  t.after(() => context.SetRenderContextAL(previous));
  return context;
}

function system(t)
{
  const value = new Tr2ParticleSystem();
  value.maxParticleCount = 4;
  for (const fields of [
    { elementType: 0 }, { customName: "size", dimension: 2, usageIndex: 3 },
    { elementType: 2 }, { elementType: 1 }, { elementType: 3, usedByGPU: false }
  ]) value.elements.push(Object.assign(new Tr2ParticleElementDeclaration(), fields));
  value.Initialize();
  t.after(() => value.ReleaseResources());
  return value;
}

test("particle allocation carries Carbon's aligned current/previous declaration and AL buffer", t =>
{
  setup(t);
  const value = system(t);
  assert.equal(value.GetElement(1).startOffset, 0, "Tr2ParticleSystem.cpp:935-985 POSITION aligned first");
  assert.equal(value.GetElement(2).startOffset, 4, "cpp:965-973 VELOCITY aligned second");
  assert.equal(value.GetElement(0).startOffset, 8);
  assert.equal(value.GetElement("size").startOffset, 10);
  assert.equal(value.GetElement(1).instanceStride, 24, "cpp:1243 doubles 12 floats for previous data");
  assert.equal(value.GetElement(3).instanceStride, 4, "CPU stream is padded, not doubled");
  const data = value.GetInstanceData();
  assert.equal(data.buffer, value.GetGpuBuffer());
  assert.equal(data.buffer.IsValid(), true, "cpp:276-289 creates a physical AL buffer");
  assert.deepEqual([data.offset, data.stride, data.count], [0, 96, 0], "cpp:306-308 instance record");
  const desc = data.buffer.GetDesc();
  assert.deepEqual([desc.stride, desc.count, desc.gpuUsage, desc.cpuUsage],
    [96, 4, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE_OFTEN]);
  const definition = Tr2EffectStateManager.getVertexDeclarationElements(value.GetInstanceBufferVertexDeclaration());
  assert.deepEqual(definition.items.map(i => [i.usage, i.usageIndex, i.offset, i.type]), [
    [3, 0, 32, "FLOAT32_2"], [3, 1, 80, "FLOAT32_2"],
    [0, 0, 0, "FLOAT32_3"], [0, 1, 48, "FLOAT32_3"],
    [2, 0, 16, "FLOAT32_3"], [2, 1, 64, "FLOAT32_3"],
    [5, 3, 40, "FLOAT32_2"]
  ], "cpp:884-927 map order and previous semantic copies; CUSTOM remains single");
  assert.equal(definition.nextOffset[0], 88);
  assert.equal(value.IsInstanceDataReady(), true);
});

test("particle release preserves simulation; prepare and resize replace physical allocations", t =>
{
  setup(t);
  const value = system(t);
  value.SpawnParticle({ position: [2, 3, 4], velocity: [1, 0, 0], lifetime: [0, 10] });
  const original = value.GetGpuBuffer();
  const stream = value.GetElement(1).buffer;
  value.ReleaseResources();
  assert.equal(original.IsValid(), false);
  assert.equal(value.IsInstanceDataReady(), false, "cpp:251-255 resets declaration");
  assert.equal(value.GetInstanceBufferVertexDeclaration(), Tr2EffectStateManager.Unknown);
  assert.equal(value.aliveCount, 1);
  assert.equal(value.GetElement(1).buffer, stream, "cpp:251-255 does not destroy CPU particles");
  assert.equal(value.OnPrepareResources(), true);
  assert.equal(value.GetGpuBuffer().IsValid(), true);
  const replacement = value.GetGpuBuffer();
  value.SetMaxParticleCount(2);
  assert.equal(replacement.IsValid(), false);
  assert.equal(value.aliveCount, 0);
  assert.equal(value.GetGpuBuffer().GetDesc().count, 2);
});

test("particle readiness follows declaration even without a device; zero capacity allocates nothing", t =>
{
  setup(t, false);
  const value = system(t);
  assert.equal(value.GetGpuBuffer(), null);
  assert.equal(value.CreateVertexBuffer(), false);
  assert.equal(value.IsInstanceDataReady(), true, "cpp:301-303 deliberately checks declaration alone");
  value.SetMaxParticleCount(0);
  assert.equal(value.CreateVertexBuffer(), true, "cpp:279 zero-capacity buffer is unnecessary");
  assert.equal(value.GetGpuBuffer(), null);
});

test("particle Update preserves the prior GPU record before integrating the next frame", t =>
{
  setup(t);
  const value = system(t);
  value.SpawnParticle({ position: [2, 3, 4], velocity: [1, 0, 0], lifetime: [0, 10], size: [5, 6] });
  const args = new ITr2GenericEmitterUpdateArguments();
  args.time = 1;
  value.Update(args);
  args.time = 1.1;
  value.Update(args);
  const position = value.GetElement(1);
  assert.ok(Math.abs(position.buffer[0] - 2.1) < 1e-6);
  assert.deepEqual(Array.from(position.buffer.subarray(12, 15)), [2, 3, 4], "cpp:493-510 previous half is before simulation");
  assert.deepEqual(Array.from(position.buffer.subarray(22, 24)), [5, 6], "native copies the entire current half, including CUSTOM");
});
