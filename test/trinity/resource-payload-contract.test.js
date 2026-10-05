import assert from "node:assert/strict";
import test from "node:test";
import { Tr2GrannyAnimation, Tr2StaticEmitter, Tr2ParticleSystem, Tr2ParticleElementDeclaration } from "../../npm/dist/trinity/index.js";
import { TriGrannyRes } from "../../npm/dist/resource/geometry/granny/TriGrannyRes.js";

function emitterWith(resource)
{
  const emitter = new Tr2StaticEmitter();
  const system = new Tr2ParticleSystem();
  const position = new Tr2ParticleElementDeclaration();
  position.elementType = Tr2ParticleElementDeclaration.Type.POSITION;
  position.usedByGPU = false;
  system.maxParticleCount = 2;
  system.elements.push(position);
  system.Initialize();
  assert.equal(system.IsValid(), true);
  emitter.particleSystem = system;
  emitter.geometryResource = resource;
  return emitter;
}

for (const [name, create, read, data, absent] of [
  ["Granny animation", resource => Object.assign(new Tr2GrannyAnimation(), { grannyRes: resource }), owner => owner.GetFileInfo(), { animations: [{ name: "idle" }] }, null],
  ["static emitter", emitterWith, owner => owner.ForceSpawn(), { meshes: [{ particles: [{ position: [1, 2, 3] }] }] }, false]
])
{
  test(`${name} requires GetPayload on a runtime resource`, () =>
  {
    const resource = new TriGrannyRes();
    resource.GetPayload = undefined;
    assert.throws(() => read(create(resource)), TypeError);
  });

  test(`${name} never replaces a null payload with wrapper properties`, () =>
  {
    const resource = Object.assign(new TriGrannyRes(), data);
    assert.equal(read(create(resource)), absent);
  });

  test(`${name} retains decoded records without treating structural methods as resource identity`, () =>
  {
    const decoded = { ...data, GetPayload() { throw new Error("Decoded record is not a resource"); } };
    const value = read(create(decoded));
    assert.equal(value, name === "Granny animation" ? decoded : 1);
  });

  test(`${name} reads a concrete resource payload`, () =>
  {
    const resource = new TriGrannyRes();
    resource.SetPayload(data);
    const value = read(create(resource));
    assert.equal(value, name === "Granny animation" ? data : 1);
  });
}

test("static emitter retains the explicit host SpawnParticles callback", () =>
{
  let calls = 0;
  const emitter = emitterWith({ SpawnParticles(system, meshIndex) {
    calls++;
    assert.equal(system, emitter.particleSystem);
    assert.equal(meshIndex, 2);
    return 7;
  } });
  emitter.meshIndex = 2;
  assert.equal(emitter.ForceSpawn(), 7);
  assert.equal(calls, 1);
  assert.equal(emitter.hasSpawnedParticles, true);
});
