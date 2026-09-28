// Import initialization order: a model referenced by another model of the same
// import is initialized before the model referencing it. Carbon's BlackReader
// initializes each object right after reading its members
// (BlackReader.cpp:388-402), so an object met first as a reference is
// initialized before its referrer; for a cycle, the reference map hands back
// the already-created, not-yet-initialized object.
//
// The fixture is a real CPU particle host from the Crisis Angel skin's effect
// (dx9/model/ship/angel/battleship/angb1/effect/angb1_crisis_fx.black,
// objects[2].objects[0], read as values): its particle system is defined in
// mesh.instanceGeometryResource and referenced by the emitter and the
// particleSystems list. Initialized emitter-first, the emitter's Rebind saw an
// invalid system and the skin's particles never emitted.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { EveChildParticleSystem, Tr2DynamicEmitter, Tr2ParticleSystem } from "../../npm/dist/trinity/index.js";

const host = JSON.parse(readFileSync(new URL("../support/crisisParticleHost.json", import.meta.url), "utf8"));

test("a referenced particle system is initialized before the emitter referencing it", () =>
{
  const built = EveChildParticleSystem.from(structuredClone(host));
  const [ emitter ] = built.particleEmitters;

  assert.ok(emitter.particleSystem, "the reference resolved");
  assert.equal(emitter.particleSystem, built.particleSystems[0], "one system, shared");
  assert.equal(emitter.particleSystem.isValid, true);
  assert.equal(emitter.isValid, true, "the emitter bound to a valid system, so it can emit");
});

test("a reference cycle initializes each model once and terminates", (t) =>
{
  // emitter -> particleSystem and system -> emitParticleOnDeathEmitter, both
  // references: the second arrival at a model in progress is skipped, as
  // Carbon's reference map returns the object without initializing it again.
  const calls = new Map();
  for (const Type of [ Tr2DynamicEmitter, Tr2ParticleSystem ])
  {
    const initialize = Type.prototype.Initialize;
    Type.prototype.Initialize = function (...args)
    {
      calls.set(this, (calls.get(this) ?? 0) + 1);
      return initialize.apply(this, args);
    };
    t.after(() => { Type.prototype.Initialize = initialize; });
  }

  const values = structuredClone(host);
  const system = values.mesh.instanceGeometryResource;
  system.emitParticleOnDeathEmitter = { _ref: values.particleEmitters[0]._id };

  const built = EveChildParticleSystem.from(values);
  const emitter = built.particleEmitters[0];

  assert.equal(emitter.particleSystem.emitParticleOnDeathEmitter, emitter, "the cycle is intact");
  assert.equal(calls.get(emitter), 1);
  assert.equal(calls.get(emitter.particleSystem), 1);
});
