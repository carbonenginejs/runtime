// Offline CPU particle proof. Fixtures are immutable copies; no graphics device.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { blue } from "../../npm/dist/global/blue/index.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import { EveChildParticleSystem, Tr2EffectStateManager, ITr2GenericEmitterUpdateArguments,
  Tr2RenderContext_GetMainThreadRenderContext } from "../../npm/dist/trinity/index.js";
import { Tr2RenderContextALStub } from "../../npm/dist/trinityal/index.js";
import { StubResMan } from "../support/stubResMan.js";

const corpus = process.env.PARTICLE_BLACK_CORPUS_DIR;

test("real Crisis Dark_Front smoke emits into Carbon's physical particle layout", {
  skip: !corpus && "set PARTICLE_BLACK_CORPUS_DIR for the real Crisis CPU particle proof"
}, async t =>
{
  const bytes = await readFile(join(corpus, "angbc1_t1_crisis_fx.black"));
  assert.equal(bytes.length, 81204);
  assert.equal(createHash("sha256").update(bytes).digest("hex"),
    "b6818c31899f1e7d1d9204a1072b95f41c4894c934191e27f364acaf9bbc1753");
  const context = Tr2RenderContext_GetMainThreadRenderContext();
  const previousAL = context.GetRenderContextAL();
  const previousManager = blue.resMan;
  const al = new Tr2RenderContextALStub();
  context.SetRenderContextAL(al);
  al.CreateDevice();
  blue.resMan = new StubResMan();
  t.after(() => { context.SetRenderContextAL(previousAL); blue.resMan = previousManager; });
  // Hydrate the whole child so mesh, emitter and system references stay shared.
  const authored = CjsBlackFormat.readPayload(bytes).object.objects[2].objects[0];
  assert.equal(authored.name, "Dark_Front");
  const child = EveChildParticleSystem.from(authored);
  const system = child.particleSystems[0];
  t.after(() => system.ReleaseResources());
  assert.equal(child.mesh.instanceGeometryResource, system);
  const emitter = child.particleEmitters[0];
  assert.equal(emitter.particleSystem, system);
  assert.equal(system.requiresSorting, true);
  assert.equal(system.maxParticleCount, 20);
  assert.equal(system.isValid, true);
  assert.equal(emitter.isValid, true);
  emitter.UpdateSimulation(4);
  assert.equal(system.aliveCount, 2, "real authored rate 0.5 emits two particles in four seconds");
  const data = system.GetInstanceData();
  assert.equal(data.buffer.IsValid(), true, "Tr2ParticleSystem.cpp:276-308 physical buffer rather than CPU mirror");
  assert.deepEqual([data.stride, data.count, data.buffer.GetSize()], [128, 2, 2560]);
  const declaration = Tr2EffectStateManager.getVertexDeclarationElements(system.GetInstanceBufferVertexDeclaration());
  assert.equal(declaration.items.length, 9, "three semantic pairs plus three custom attributes");
  for (let i = 0; i < system.aliveCount; i++)
  {
    const position = system.GetParticleElement(i, 1);
    assert.ok(position.every(Number.isFinite));
    assert.ok(Math.hypot(...position) >= 9.999 && Math.hypot(...position) <= 15.001);
    const lifetime = system.GetParticleElement(i, 0);
    assert.ok(lifetime[1] >= 6.25 && lifetime[1] <= 8);
  }
  const args = new ITr2GenericEmitterUpdateArguments(); args.time = 1;
  system.Update(args);
  const cpu = system.GetElement(1).buffer.slice();
  const stride = data.stride / 4;
  const position = system.GetElement(1);
  const indices = [0, 1].sort((a, b) =>
  {
    const p = system.GetParticleElement(a, 1), q = system.GetParticleElement(b, 1);
    return Math.hypot(...q) - Math.hypot(...p);
  });
  let mapped = null, unmaps = 0;
  const buffer = system.GetGpuBuffer();
  const map = buffer.MapForWriting.bind(buffer), unmap = buffer.UnmapForWriting.bind(buffer);
  buffer.MapForWriting = context => {const result = map(context); mapped = result.data; return result;};
  buffer.UnmapForWriting = context => {unmaps++; unmap(context);};
  system.UpdateViewDependentData(null, mat4.create());
  child._isVisible = false; child.GetRenderables([]);
  assert.equal(mapped, null, "native invisible child does not sort or upload");
  child._isVisible = true;
  assert.deepEqual(child.GetRenderables([]), [child]);
  assert.ok(mapped, "EveChildParticleSystem.cpp:130 requires SortParticles upload before publication");
  assert.equal(unmaps, 1);
  const uploaded = new Float32Array(mapped.buffer, mapped.byteOffset, mapped.byteLength / 4);
  for (let i = 0; i < 2; i++)
  {
    assert.deepEqual(uploaded.subarray(i * stride, (i + 1) * stride), cpu.subarray(indices[i] * stride, (indices[i] + 1) * stride),
      "Tr2ParticleSystem.cpp:1114 copies the entire sorted record, including previous frame");
  }
  assert.deepEqual(position.buffer, cpu, "GPU sorting preserves real simulation order");
  const original = system.GetGpuBuffer();
  system.ReleaseResources();
  assert.equal(original.IsValid(), false, "negative control: releasing the AL allocation removes render readiness");
  assert.equal(system.IsInstanceDataReady(), false);
  assert.equal(system.aliveCount, 2);
  system.OnPrepareResources();
  assert.equal(system.GetGpuBuffer().IsValid(), true);
  t.diagnostic("Crisis Dark_Front: two emitted CPU particles, 128-byte instance records, 2560-byte AL allocation; visible child uploads two far-to-near records");
});
