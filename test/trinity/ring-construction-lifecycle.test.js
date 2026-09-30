import assert from "node:assert/strict";
import test from "node:test";
import {
  EveSpaceScene, Tr2Effect, TriDevice, Tr2RingBuffer, Tr2RingBufferOffsets, Tr2RenderContext,
  Tr2RenderContext_GetMainThreadRenderContext, Tr2VariableStore
} from "../../npm/dist/trinity/index.js";
import { Tr2BaseDeviceResourceAL, Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";

/** Starts without device storage, as a scene loaded before device creation does. */
function reset()
{
  Tr2RingBuffer.ResetInstances();
  Tr2VariableStore.SetGlobalStore();
  const context = Tr2RenderContext_GetMainThreadRenderContext();
  context.SetRenderContextAL(new Tr2RenderContextALStub());
  return context;
}

/** Minimal reflected resource stage; mapping follows native Tr2Effect.cpp:1436-1489. */
function mappedResources()
{
  const stage = {
    exists: true, constants: [], uavs: new Map(), samplers: new Map(),
    resources: new Map([ "BoneTransforms", "EveSpaceSceneEnvMap", "SSAOMap" ]
      .map((name, register) => [ register, { name, isAutoregister: false } ])),
    constantValues: new Uint8Array(0), GetConstantBufferSize: () => 0
  };
  const effect = new Tr2Effect();
  effect.shader = {
    GetEffect: () => ({ techniques: [{ passes: [{ stageInputs: [stage],
      resourceSetDesc: null, renderStateValues: [], stageOrder: [] }] }] }),
    ProcessEffect() {}
  };
  effect.RebuildCachedData();
  return effect.parametersForPasses[0].passes[0].stageInput[0].textures;
}

test("scene construction registers the bone provider before material mapping and device creation", () =>
{
  const context = reset();
  const before = Tr2BaseDeviceResourceAL.GetResourceCount();
  Tr2RingBuffer.GetInstance("Float4x3", 48, context);
  assert.equal(Tr2BaseDeviceResourceAL.GetResourceCount(), before, "deferred ring allocation leaks no invalid factory resource");
  new EveSpaceScene();
  const variable = Tr2VariableStore.GlobalStore().FindVariable("BoneTransforms");
  const ring = variable.GetValue();
  assert.equal(context.IsValid(), false);
  assert.equal(ring.GetGpuBuffer(), null, "native Resize retains the ring after failed Create (cpp:105-108)");
  assert.ok(TriDevice.GetResourcesRegistered().includes(ring), "Tr2DeviceResource.cpp:10-13 registers the ring");
  const mappings = mappedResources();
  assert.deepEqual(mappings.map(v => v.sourceName), ["BoneTransforms", "EveSpaceSceneEnvMap", "SSAOMap"],
    "EveSpaceScene.cpp:253-258 registers all three before effect construction");
  assert.equal(mappings[0].sourceValue, variable);
  context.GetRenderContextAL().CreateDevice();
  new TriDevice().PrepareDeviceResources();
  assert.ok(ring.GetGpuBuffer().IsValid());
  assert.equal(mappings[0].sourceValue.GetValue(), ring, "preparation preserves the mapped provider");
  Tr2RingBuffer.ResetInstances();
});

test("old-order negative control misses only BoneTransforms and later registration does not remap", () =>
{
  reset();
  new EveSpaceScene();
  const store = Tr2VariableStore.GlobalStore();
  const ring = store.FindVariable("BoneTransforms").GetValue();
  store.UnregisterVariable("BoneTransforms");
  const mappings = mappedResources();
  store.RegisterVariable("BoneTransforms", ring);
  assert.deepEqual(mappings.map(v => v.sourceName), ["EveSpaceSceneEnvMap", "SSAOMap"],
    "Tr2Effect.cpp:1481-1488 stores only resources resolved at mapping time");
  assert.equal(mappedResources().length, 3, "effects completed after registration bind normally");
  Tr2RingBuffer.ResetInstances();
});

test("device preparation preserves pre-device uploads and recreates invalid or foreign-backend storage", () =>
{
  const context = reset();
  const ring = Tr2RingBuffer.GetInstance("Float4x3", 48, context);
  const offsets = new Tr2RingBufferOffsets();
  const input = new Uint8Array(2 * 48).fill(37);
  offsets.UploadTransforms(ring, input, 2);
  assert.equal(ring.PrepareResources(), true);
  assert.equal(ring.GetGpuBuffer(), null, "Tr2DeviceResource.cpp:24 gates unavailable device creation");
  const device = new TriDevice();
  const creations = [];
  const create = context.CreateBuffer.bind(context);
  context.CreateBuffer = (desc, bytes) =>
  {
    creations.push(bytes ? bytes.slice() : null);
    return create(desc, bytes);
  };
  try
  {
    context.GetRenderContextAL().CreateDevice();
    device.PrepareDeviceResources();
    const first = ring.GetGpuBuffer();
    assert.deepEqual(creations[0].subarray(0, input.length), input,
      "Tr2RingBuffer.cpp:152 recreates from the retained mirror");
    first.Destroy();
    device.PrepareDeviceResources();
    const second = ring.GetGpuBuffer();
    assert.notEqual(second, first);
    assert.ok(second.IsValid());
    assert.deepEqual(creations[1].subarray(0, input.length), input);
    const replacement = new Tr2RenderContextALStub();
    replacement.CreateDevice();
    context.SetRenderContextAL(replacement);
    device.PrepareDeviceResources();
    assert.notEqual(ring.GetGpuBuffer(), second, "JS runtime backend replacement cannot retain old AL storage");
    assert.equal(second.IsValid(), false);
    assert.deepEqual(creations[2].subarray(0, input.length), input);
    assert.equal(ring.head, 2);
    assert.equal(offsets.GetCurrentFrameOffset(), 0);
    assert.equal(offsets.GetPreviousFrameOffset(), 0);
    device.ReleaseDeviceResources();
    assert.equal(ring.head, 2, "native ReleaseResources is empty; the CPU arena survives");
  }
  finally
  {
    context.CreateBuffer = create;
    Tr2RingBuffer.ResetInstances();
  }
  assert.ok(!TriDevice.GetResourcesRegistered().includes(ring), "explicit teardown unregisters the arena");
});

test("failed allocation with dirty data preserves native failure bookkeeping and later restores the mirror", () =>
{
  const context = reset();
  const ring = Tr2RingBuffer.GetInstance("Float4x3", 48, context);
  context.GetRenderContextAL().CreateDevice();
  const create = context.CreateBuffer.bind(context);
  context.CreateBuffer = () => null;
  const data = new Uint8Array(48).fill(19);
  try
  {
    ring.UploadTransforms(data, 1);
    assert.equal(ring.PrepareResources(), true, "Tr2RingBuffer.cpp:147-158 does not propagate failed Create");
    assert.doesNotThrow(() => ring.PrepareBuffer(context), "invalid native buffer update returns failure, not a null dereference");
    let restored;
    context.CreateBuffer = (desc, initialData) =>
    {
      restored = initialData.slice();
      return create(desc, initialData);
    };
    ring.PrepareResources();
    assert.deepEqual(restored.subarray(0, data.length), data);
    assert.ok(ring.GetGpuBuffer().IsValid());
    assert.equal(ring.head, 1);
  }
  finally
  {
    context.CreateBuffer = create;
    Tr2RingBuffer.ResetInstances();
  }
});

test("ambient context recreation preserves provider identity and realizes through the new context", () =>
{
  const previous = reset();
  previous.GetRenderContextAL().CreateDevice();
  new EveSpaceScene();
  const provider = Tr2VariableStore.GlobalStore().FindVariable("BoneTransforms").GetValue();
  const oldBuffer = provider.GetGpuBuffer();
  Tr2RenderContext.DestroyMainThreadRenderContext();
  const current = Tr2RenderContext_GetMainThreadRenderContext();
  current.GetRenderContextAL().CreateDevice();
  let creations = 0;
  const create = current.CreateBuffer.bind(current);
  current.CreateBuffer = (...args) => { creations++; return create(...args); };
  try
  {
    new TriDevice().PrepareDeviceResources();
    assert.equal(creations, 1, "native OnPrepareResources reacquires USE_MAIN_THREAD_RENDER_CONTEXT (cpp:151)");
    assert.equal(Tr2VariableStore.GlobalStore().FindVariable("BoneTransforms").GetValue(), provider);
    assert.notEqual(provider.GetGpuBuffer(), oldBuffer);
    assert.equal(oldBuffer.IsValid(), false);
    assert.ok(provider.GetGpuBuffer().IsValid());
  }
  finally
  {
    current.CreateBuffer = create;
    Tr2RingBuffer.ResetInstances();
  }
});
