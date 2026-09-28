// Tr2GpuParticleSystem: Carbon's frame schedule and data packing
// (Tr2GpuParticleSystem.cpp), against a recording render context and
// Tr2Renderer's compute helpers replaced by recorders. No GPU.
import test from "node:test";
import assert from "node:assert/strict";
import { CjsSchema } from "../../npm/dist/global/schema/index.js";
import { RenderingMode } from "../../npm/dist/global/consts/graphics/index.js";
import { Topology } from "../../npm/dist/global/consts/renderContext/index.js";
import { Tr2Renderer } from "../../npm/dist/trinity/core/index.js";
import { Tr2GpuParticleSystem, Tr2GpuSharedEmitter, Tr2Effect } from "../../npm/dist/trinity/index.js";

/** A shader-state stand-in: usable, with `passes` passes. */
function effect(name, passes = 1)
{
  const applied = [];
  return {
    name,
    applied,
    GetShaderStateInterface: () => ({
      GetPassCount: () => passes,
      ApplyAllStateForPass: (technique, pass) => applied.push([ technique, pass ])
    }),
    ApplyMaterialDataForPass() {},
    StartUpdate() {},
    SetVariableStore(store) { this.store = store; },
    EndUpdate() {}
  };
}

/** A render context that records what the system asks of it. */
function recordingContext()
{
  const log = [];
  const constantBuffer = () =>
  {
    let size = 0;
    const bytes = { current: new Uint8Array(0) };
    return {
      IsValid: () => size > 0,
      GetSize: () => size,
      Create(bytesWanted) { size = bytesWanted; bytes.current = new Uint8Array(size); return 0; },
      Lock: () => ({ result: 0, data: bytes.current }),
      Unlock() { log.push([ "constants", Array.from(new Uint32Array(bytes.current.buffer.slice(0, 16))) ]); return 0; },
      GetMemoryClass: () => 1
    };
  };
  const esm = {
    ApplyStandardStates: mode => log.push([ "states", mode ]),
    ApplyVertexDeclaration: handle => log.push([ "declaration", handle ])
  };
  return {
    log,
    CreateBuffer: desc => ({
      GetDesc: () => desc,
      SetName() {},
      UpdateBuffer: (offset, size) => log.push([ "upload", offset, size ])
    }),
    CreateConstantBuffer: constantBuffer,
    SetConstants: () => 0,
    ClearUav: (buffer, values) => log.push([ "clearUav", Array.from(values) ]),
    GetFrustumPlane: (index, out) => { out.fill(index); return out; },
    GetEffectStateManager: () => esm,
    SetTopology: topology => log.push([ "topology", topology ]),
    DrawInstancedIndirect: (buffer, offset) => log.push([ "drawIndirect", buffer, offset ])
  };
}

/** Replaces Tr2Renderer's compute helpers with recorders for one test. */
function recordCompute(t, log)
{
  const direct = Tr2Renderer.runComputeShader;
  const indirect = Tr2Renderer.runComputeShaderIndirect;
  Tr2Renderer.runComputeShader = (fx, ...args) =>
  {
    const named = typeof args[0] === "string";
    log.push([ "dispatch", fx.name, ...(named ? [ args[0], args[1], args[2], args[3] ] : [ args[0], args[1], args[2] ]) ]);
    return true;
  };
  Tr2Renderer.runComputeShaderIndirect = (fx, buffer, offset) =>
  {
    log.push([ "dispatchIndirect", fx.name, buffer, offset ]);
    return true;
  };
  t.after(() =>
  {
    Tr2Renderer.runComputeShader = direct;
    Tr2Renderer.runComputeShaderIndirect = indirect;
  });
}

/** A system with every effect slot filled by a recording stand-in. */
function system(maxParticles = 1024)
{
  const ps = new Tr2GpuParticleSystem();
  for (const slot of [ "emit", "update", "render", "clear", "setDrawParameters", "setSortParameters", "sort", "sortStep", "sortInner" ])
  {
    ps[slot] = effect(slot);
  }
  ps.maxParticles = maxParticles;
  return ps;
}

test("the schema carries Carbon's fields and the constructor's capacity", () =>
{
  const ps = new Tr2GpuParticleSystem();

  assert.ok(CjsSchema.getField(Tr2GpuParticleSystem, "maxParticles"), "schema canary");
  assert.equal(ps.maxParticles, 1024 * 1024, "DEFAULT_MAX_PARTICLES (cpp:19, :81)");
  assert.equal(ps.display, true);

  // The effects read the buffers from the local store under Carbon's names (cpp:140-149).
  for (const name of [ "ParticleBuffer", "DeadBuffer", "VisibleBuffer", "DrawParameters", "SortParameters", "Emitters", "ParticleCounters" ])
  {
    assert.ok(ps._variableStore.FindLocalVariable(name), `${name} registered`);
  }
});

test("Initialize and OnModified give every effect slot the local store", () =>
{
  const ps = system();

  ps.Initialize();
  assert.equal(ps.update.store, ps._variableStore);

  const replacement = effect("render");
  ps.render = replacement;
  ps.OnModified("render");
  assert.equal(replacement.store, ps._variableStore);
});

test("Emit packs EmitterGpu and EmitterParamsGpu as Carbon lays them out", () =>
{
  const ps = system(100);
  const emitter = Tr2GpuSharedEmitter._createEmitter();
  const params = Tr2GpuSharedEmitter._createParams();

  emitter.position.set([ 1, 2, 3 ]);
  emitter.count = 500;
  emitter.maxSpeed = 7;
  params.minLifeTime = 2;
  params.maxLifeTime = 3;
  params.textureIndex = 5;
  params.colorMidpoint = 0.25;
  params.turbulenceFrequency = 2048;
  params.velocityStretchRotation = 9;

  ps.Emit(emitter, 42, 99, params);

  const request = ps._emitRequests[0];
  const words = request.emitterWords;
  assert.equal(ps._emitRequestCount, 1);
  assert.deepEqual([ words.getFloat32(0, true), words.getFloat32(4, true), words.getFloat32(8, true) ], [ 1, 2, 3 ]);
  assert.equal(words.getUint32(12, true), 100, "count capped at the capacity (cpp:724)");
  assert.equal(words.getFloat32(92, true), 7, "maxSpeed at its offset");
  assert.equal(words.getUint32(60, true) & 0xffff, 0, "the seed is rand() << 16 (cpp:725)");

  // EmitterParamsGpu (cpp:59-77): the midpoint rides in the texture index's
  // fraction, and the frequency is scaled into turbulence space.
  assert.equal(request.params[2], 5.75);
  assert.equal(request.params[25], 0.5);
  assert.equal(request.params[31], 9);
  assert.equal(request.id, 42);

  // Negative control: with emitting off nothing is queued (cpp:719-722).
  ps.enableEmit = false;
  ps.Emit(emitter, 1, 1, params);
  assert.equal(ps._emitRequestCount, 1);
});

test("params slots are shared by id, re-uploaded on a hash change, and freed after their lifetime", () =>
{
  const ps = system();
  const context = recordingContext();
  const emitter = Tr2GpuSharedEmitter._createEmitter();
  const params = Tr2GpuSharedEmitter._createParams();
  params.minLifeTime = 1;
  params.maxLifeTime = 1;

  ps.Emit(emitter, 7, 1, params);
  ps.Emit(emitter, 7, 1, params);
  ps.Emit(emitter, 8, 1, params);
  ps.UpdateEmitterParams(context);

  assert.equal(ps._emitterParamsCount, 2, "two ids, two slots");
  assert.equal(ps._emitRequests[1].emitterWords.getUint32(60, true) & 0xffff, 0, "id 7 is slot 0, ORed into the seed");
  assert.equal(ps._emitRequests[2].emitterWords.getUint32(60, true) & 0xffff, 1, "id 8 is slot 1");
  assert.equal(ps._emitterParamsIndex.get(7).lifetime, 2, "max(min, max) life + 1 (cpp:492)");
  assert.deepEqual(context.log.filter(entry => entry[0] === "upload"), [ [ "upload", 0, 256 ] ], "two 128-byte params entries uploaded once");

  // Negative control: the same ids and hashes again upload nothing (cpp:519, :527-530).
  ps._emitRequestCount = 0;
  ps.Emit(emitter, 7, 1, params);
  ps.UpdateEmitterParams(context);
  assert.equal(context.log.filter(entry => entry[0] === "upload").length, 1, "unchanged params are not re-uploaded");

  // A changed hash is.
  ps._emitRequestCount = 0;
  ps.Emit(emitter, 7, 2, params);
  ps.UpdateEmitterParams(context);
  assert.equal(context.log.filter(entry => entry[0] === "upload").length, 2);
  ps._emitRequestCount = 0;
  ps.Emit(emitter, 7, 1, params);
  ps.Emit(emitter, 8, 1, params);
  ps.UpdateEmitterParams(context);

  // Negative control: before the lifetime runs out the slot stays.
  ps.ExpireEmitterParams(1.5);
  assert.equal(ps._expiredEmitters.length, 0);

  ps.ExpireEmitterParams(1);
  assert.deepEqual(ps._expiredEmitters.sort(), [ 0, 1 ], "both freed once their lifetime passes");

  // A new id reuses a freed slot rather than growing the mirror.
  ps._emitRequestCount = 0;
  ps.Emit(emitter, 9, 1, params);
  ps.UpdateEmitterParams(context);
  assert.equal(ps._emitterParamsCount, 2);
});

test("Update runs Carbon's schedule: clear, emit, counters, simulate, sort, draw arguments", (t) =>
{
  const ps = system(2048);
  const context = recordingContext();
  recordCompute(t, context.log);
  ps._sortParameters.IsValid = () => true;
  ps._sortParameters.GetGpuBuffer = () => "sortArgs";

  const emitter = Tr2GpuSharedEmitter._createEmitter();
  emitter.count = 10;
  ps.Emit(emitter, 1, 1, Tr2GpuSharedEmitter._createParams());
  ps.Update(10, [ 0, 0, 0 ], context);

  const steps = context.log.filter(entry => entry[0] !== "constants").map(entry => entry.slice(0, 2).join(":"));
  assert.deepEqual(steps, [
    "clearUav:0,0,0,0",
    "dispatch:clear",
    "upload:0",
    "dispatch:emit",
    "dispatch:update",
    "dispatch:update",
    "dispatch:setSortParameters",
    "dispatchIndirect:sort",
    "dispatch:sortStep",
    "dispatch:sortInner",
    "dispatch:sortStep",
    "dispatch:sortStep",
    "dispatch:sortInner",
    "dispatch:setDrawParameters"
  ]);

  const dispatches = context.log.filter(entry => entry[0] === "dispatch");
  assert.deepEqual(dispatches[1], [ "dispatch", "emit", 1, 1, 1 ], "one group per queued emitter");
  assert.deepEqual(dispatches[2], [ "dispatch", "update", "ClearCounters", 1, 1, 1 ], "the counter reset technique first (cpp:452)");
  assert.deepEqual(dispatches[3], [ "dispatch", "update", 32, 1, 1 ], "groups from the capacity (cpp:438-440)");
  assert.deepEqual(context.log.find(entry => entry[0] === "dispatchIndirect"), [ "dispatchIndirect", "sort", "sortArgs", 0 ]);
  assert.equal(ps._emitRequestCount, 0, "requests are consumed");
});

test("an empty system clears and emits nothing, and neither simulates nor sorts", (t) =>
{
  // Negative control for the schedule above: with nothing emitted the live
  // time stays 0 and Update returns before the simulation (cpp:356-360).
  const ps = system();
  const context = recordingContext();
  recordCompute(t, context.log);

  ps.Update(10, [ 0, 0, 0 ], context);

  assert.deepEqual(context.log.filter(entry => entry[0] === "dispatch").map(entry => entry[1]), [ "clear" ]);
  assert.equal(ps.HasParticles(), false);
});

test("Render draws through the render effect with additive states and an indirect draw", () =>
{
  const ps = system();
  const context = recordingContext();
  ps._drawParameters.IsValid = () => true;
  ps._drawParameters.GetGpuBuffer = () => "drawArgs";

  // Negative control: no live particles, nothing drawn (cpp:684-687).
  ps.Render(context);
  assert.equal(context.log.length, 0);

  ps._liveTime = 1;
  ps.render = new Tr2Effect();
  ps.render.GetShaderStateInterface = effect("render", 2).GetShaderStateInterface;
  ps.render.ApplyMaterialDataForPass = () => {};
  ps.Render(context);

  assert.deepEqual(context.log[0], [ "states", RenderingMode.RM_ALPHA_ADDITIVE ]);
  assert.deepEqual(context.log.filter(entry => entry[0] === "drawIndirect"), [ [ "drawIndirect", "drawArgs", 0 ], [ "drawIndirect", "drawArgs", 0 ] ],
    "Tr2Effect.Render submits once per pass (Tr2Effect.cpp:1505-1510)");
  assert.ok(context.log.some(entry => entry[0] === "topology" && entry[1] === Topology.TOP_TRIANGLES));
});
