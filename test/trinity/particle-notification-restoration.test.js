import assert from "node:assert/strict";
import test from "node:test";
import { Tr2ParticleSystem } from "../../npm/dist/trinity/index.js";
import { blue, CjsBlueOS, NotifyModified } from "../../npm/dist/global/blue/index.js";

test("particle batch handles sorting, clock rebasing and both emitter notifications", () =>
{
  const prior = blue.os, os = new CjsBlueOS(), system = new Tr2ParticleSystem();
  blue.os = os;
  try
  {
    system.maxParticleCount = 5;
    system.requiresSorting = true;
    system.useSimTimeRebase = true;
    const calls = [];
    system.emitParticleOnDeathEmitter = { SetThreadSafeFlag() { calls.push("death"); } };
    system.emitParticleDuringLifeEmitter = { SetThreadSafeFlag() { calls.push("alive"); } };
    const names = ["requiresSorting", "useSimTimeRebase", "emitParticleOnDeathEmitter", "emitParticleDuringLifeEmitter"];
    system.OnModified("name");
    assert.equal(system._indexes.length, 0);
    assert.equal(os._rebaseListeners.includes(system), false);
    assert.deepEqual(calls, []);
    NotifyModified(system, names);
    assert.equal(system._indexes.length, 5);
    assert.equal(os._rebaseListeners.includes(system), true);
    assert.deepEqual(calls, ["death", "alive"]);
    system._lastUpdate = 9;
    for (const listener of os._rebaseListeners) listener.OnSimClockRebase(10000000, 30000000);
    assert.equal(system._lastUpdate, 11);
    system.requiresSorting = false;
    system.useSimTimeRebase = false;
    system.OnModified(["requiresSorting", "useSimTimeRebase"]);
    assert.equal(system._indexes.length, 0);
    assert.equal(os._rebaseListeners.includes(system), false);
    system.useSimTimeRebase = true;
    system.OnModified("useSimTimeRebase");
    system.Destroy();
    assert.equal(os._rebaseListeners.includes(system), false);
  }
  finally { system.Destroy(); blue.os = prior; }
});

test("particle initialization registers and flags emitters; destruction releases the original clock", () =>
{
  const prior = blue.os, os = new CjsBlueOS(), replacement = new CjsBlueOS(), system = new Tr2ParticleSystem();
  blue.os = os;
  try
  {
    const calls = [];
    system.useSimTimeRebase = true;
    system.emitParticleOnDeathEmitter = { SetThreadSafeFlag() { calls.push("death"); } };
    system.emitParticleDuringLifeEmitter = { SetThreadSafeFlag() { calls.push("alive"); } };
    assert.equal(system.Initialize(), true);
    assert.deepEqual(calls, ["death", "alive"]);
    assert.equal(os._rebaseListeners.filter(value => value === system).length, 1);
    blue.os = replacement;
    system.Destroy();
    assert.equal(os._rebaseListeners.includes(system), false);
    assert.equal(replacement._rebaseListeners.includes(system), false);
  }
  finally { system.Destroy(); blue.os = prior; }
});
