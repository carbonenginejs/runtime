// Offline CPU particle proof. Fixtures are immutable copies; no graphics device.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { blue } from "../../npm/dist/global/blue/index.js";
import { CjsBlackFormat } from "../../npm/dist/resource/formats/black/index.js";
import { EveChildParticleSystem, Tr2EffectStateManager,
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
  const original = system.GetGpuBuffer();
  system.ReleaseResources();
  assert.equal(original.IsValid(), false, "negative control: releasing the AL allocation removes render readiness");
  assert.equal(system.IsInstanceDataReady(), false);
  assert.equal(system.aliveCount, 2);
  system.OnPrepareResources();
  assert.equal(system.GetGpuBuffer().IsValid(), true);
  t.diagnostic("Crisis Dark_Front: two emitted CPU particles, 128-byte instance records, 2560-byte AL allocation");
});
