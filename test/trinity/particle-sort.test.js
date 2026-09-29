import assert from "node:assert/strict";
import test from "node:test";
import { Tr2ParticleSystem, Tr2ParticleElementDeclaration, ITr2GenericEmitterUpdateArguments,
  Tr2RenderContext_GetMainThreadRenderContext, EveChildParticleSystem } from "../../npm/dist/trinity/index.js";
import { Tr2RenderContextALStub, ALResult } from "../../npm/dist/trinityal/index.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";

function setup(t, cpuPosition = false, withPosition = true)
{
  const context = Tr2RenderContext_GetMainThreadRenderContext();
  const previous = context.GetRenderContextAL(), view = mat4.clone(context.GetViewTransform());
  context.SetRenderContextAL(new Tr2RenderContextALStub());
  context.GetRenderContextAL().CreateDevice();
  context.SetViewTransform(mat4.create());
  const system = new Tr2ParticleSystem();
  system.maxParticleCount = 5;
  system.requiresSorting = true;
  if (withPosition) system.elements.push(Object.assign(new Tr2ParticleElementDeclaration(), {elementType: 1, usedByGPU: !cpuPosition}));
  system.elements.push(Object.assign(new Tr2ParticleElementDeclaration(), {customName: "tag"}));
  system.Initialize();
  for (const x of [1, 3, 2]) system.SpawnParticle({position: [x, 0, 0], tag: x * 10});
  const args = new ITr2GenericEmitterUpdateArguments(); args.time = 1;
  system.Update(args);
  t.after(() => {system.ReleaseResources(); context.SetRenderContextAL(previous); context.SetViewTransform(view);});
  const buffer = system.GetGpuBuffer();
  const map = buffer.MapForWriting.bind(buffer), unmap = buffer.UnmapForWriting.bind(buffer);
  const state = {maps: 0, unmaps: 0, bytes: null, fail: false};
  buffer.MapForWriting = value =>
  {
    state.maps++;
    if (state.fail) return {result: ALResult.E_FAIL, data: null};
    const result = map(value);
    state.bytes = result.data;
    return result;
  };
  buffer.UnmapForWriting = value => { state.unmaps++; unmap(value); };
  return {context, system, args, state};
}

function tags(system, state)
{
  const floats = new Float32Array(state.bytes.buffer, state.bytes.byteOffset, state.bytes.byteLength / 4);
  const tag = system.GetElement("tag");
  return Array.from({length: system.aliveCount}, (_, i) => floats[i * tag.instanceStride + tag.startOffset]);
}

test("SortParticles uploads far-to-near full records without reordering CPU storage", t =>
{
  const {system, state} = setup(t);
  const source = system.GetElement(1).buffer.slice();
  system.UpdateViewDependentData(null, mat4.create());
  system.SortParticles();
  assert.deepEqual(tags(system, state), [30, 20, 10], "Tr2ParticleSystem.cpp:818-834 sorts descending squared distance");
  assert.deepEqual(system.GetElement(1).buffer, source, "cpp:1114-1121 copies ordered records; does not reorder simulation");
  const floats = new Float32Array(state.bytes.buffer, state.bytes.byteOffset, state.bytes.byteLength / 4);
  const stride = system.GetInstanceData().stride / 4;
  for (const [destination, original] of [1, 2, 0].entries())
    assert.deepEqual(floats.subarray(destination * stride, (destination + 1) * stride), source.subarray(original * stride, (original + 1) * stride));
  assert.equal(state.maps, 1); assert.equal(state.unmaps, 1);
});

test("SortParticles uses inverse world coordinates and accepts CPU-only POSITION", t =>
{
  const {system, state, context} = setup(t, true);
  const world = new Float32Array([0, 2, 0, 0, -3, 0, 0, 0, 0, 0, 4, 0, 10, 20, 30, 1]);
  const view = mat4.fromTranslation(mat4.create(), [-7, -16, -30]);
  context.SetViewTransform(view); // world eye [7,16,30], local eye [-2,1,0]
  system.UpdateViewDependentData(null, world);
  system.SortParticles();
  assert.deepEqual(tags(system, state), [30, 20, 10], "cpp:1080-1088 transforms camera into system coordinates before comparing");
  assert.equal(system.CompareParticles(1, 0), true, "cpp:822 POSITION may belong to either buffer");
});

test("sorting gates preserve native camera threshold, invisible order, and failed-map retry", t =>
{
  const {system, state, context} = setup(t);
  system.UpdateViewDependentData(null, mat4.create()); system.SortParticles();
  context.SetViewTransform(mat4.fromTranslation(mat4.create(), [-0.02, 0, 0]));
  system.UpdateViewDependentData(null, mat4.create()); system.SortParticles();
  assert.equal(state.maps, 1, "cpp:1089 movement squared below0.001 skips clean upload");
  context.SetViewTransform(mat4.fromTranslation(mat4.create(), [-0.04, 0, 0]));
  system.UpdateViewDependentData(null, mat4.create()); system.SortParticles();
  assert.equal(state.maps, 2);
  system.SetParticleElement(0, "tag", 11);
  system.UpdateSimulation(0); // refresh bounds
  system.UpdateViewDependentData({IsSphereVisible: () => false}, mat4.create());
  system.SortParticles();
  assert.deepEqual(tags(system, state), [11, 30, 20], "cpp:1125 invisible dirty systems upload unsorted");
  system.SetParticleElement(0, "tag", 12);
  state.fail = true; system.SortParticles();
  const failedMaps = state.maps, unmaps = state.unmaps;
  state.fail = false; system.SortParticles();
  assert.equal(state.maps, failedMaps + 1, "cpp:1112 failed map retains dirty flag for retry");
  assert.equal(state.unmaps, unmaps + 1);
  assert.deepEqual(tags(system, state), [12, 30, 20]);
  system.requiresSorting = false;
  context.SetViewTransform(mat4.fromTranslation(mat4.create(), [-100, 0, 0]));
  const before = state.maps; system.SortParticles();
  assert.equal(state.maps, before, "cpp:1070 clean non-sorting systems never remap for camera movement");
});

test("sorting hysteresis disables above35ms and stays disabled until below20ms", t =>
{
  const {system, state, args} = setup(t);
  for (const [dt, expected] of [[0.04, [10, 30, 20]], [0.025, [10, 30, 20]], [0.01, [30, 20, 10]]])
  {
    args.time += dt; system.Update(args);
    system.SetParticleElement(0, "tag", 10);
    system.UpdateViewDependentData(null, mat4.create()); system.SortParticles();
    assert.deepEqual(tags(system, state), expected, "Tr2ParticleSystem.cpp:534-540 sorting hysteresis");
  }
});

test("missing POSITION uploads insertion order; empty or released buffers do not map", t =>
{
  const {system, state} = setup(t, false, false);
  system.UpdateViewDependentData(null, mat4.create()); system.SortParticles();
  assert.deepEqual(tags(system, state), [10, 30, 20], "cpp:1099 POSITION is a sorting prerequisite");
  system.ClearParticles(); system.SetParticleElement(0, "tag", 99);
  const before = state.maps; system.SortParticles(); system.SortParticles();
  assert.equal(state.maps, before, "cpp:1097 zero alive clears dirty state without a map");
  system.ReleaseResources(); system.SortParticles();
  assert.equal(state.maps, before);
});

test("child requires SortParticles before publishing a visible renderable", () =>
{
  const child = new EveChildParticleSystem(); child._isVisible = true;
  const order = [];
  child.particleSystems = [{SortParticles(){order.push("sort");}}];
  const output = {push(value){assert.equal(value, child); order.push("publish");}};
  child.GetRenderables(output);
  assert.deepEqual(order, ["sort", "publish"], "EveChildParticleSystem.cpp:120-132");
  child.particleSystems = [{}];
  assert.throws(() => child.GetRenderables([]), /SortParticles/, "owned missing implementations must be visible failures");
  child._isVisible = false;
  assert.deepEqual(child.GetRenderables([]), []);
});
