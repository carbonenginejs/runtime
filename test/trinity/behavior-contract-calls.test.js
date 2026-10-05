import test from "node:test";
import assert from "node:assert/strict";
import { BehaviorGroup, EveComponentRegistry, PlayFX, SpawnDrones, ProcessLifetime, EveStretch3 } from "../../npm/dist/trinity/index.js";
import { blue } from "../../npm/dist/global/blue/index.js";

test("PlayFX clones authored firing effects through Blue's copier", () =>
{
  const behavior = new PlayFX();
  behavior.firingEffect = new EveStretch3();
  behavior.firingEffect.name = "authored";
  behavior._CheckCount(2);
  assert.equal(behavior.generatedFiringEffects.length, 2);
  assert.equal(behavior._count, 2);
  for (const effect of behavior.generatedFiringEffects)
  {
    assert.ok(effect instanceof EveStretch3);
    assert.notEqual(effect, behavior.firingEffect);
    assert.equal(effect.name, "authored");
  }
  assert.notEqual(behavior.generatedFiringEffects[0], behavior.generatedFiringEffects[1]);
  behavior._CheckCount(1);
  assert.equal(behavior.generatedFiringEffects.length, 1);
  assert.equal(behavior._count, 1);
});

test("PlayFX preserves absent-template and failed-copy branches", t =>
{
  const behavior = new PlayFX();
  behavior._CheckCount(1);
  assert.equal(behavior.generatedFiringEffects.length, 0);
  behavior.firingEffect = new EveStretch3();
  t.mock.method(blue.classes, "CloneTo", () => null);
  behavior._CheckCount(1);
  assert.equal(behavior.generatedFiringEffects.length, 0);
  assert.equal(behavior._count, 0);
});

function scheduledSpawn(behavior)
{
  const spawn = new SpawnDrones();
  spawn.addOnGrid = false;
  spawn.addByCount = false;
  spawn.seconds = 1;
  const group = new BehaviorGroup();
  if (behavior) group.behaviors.push(behavior);
  const calls = [];
  group.AddAgents = points => calls.push(points.map(point => [...point]));
  return { spawn, group, calls, run: () => spawn.CalculateBehavior([], null, 2, group, null, []) };
}

test("SpawnDrones requires the nominal lifetime entrance-point method", () =>
{
  const lifetime = new ProcessLifetime();
  lifetime.GetEntrancePoints = undefined;
  assert.throws(() => scheduledSpawn(lifetime).run(), /GetEntrancePoints/);
});

test("SpawnDrones consumes entrance-point results without a fallback", () =>
{
  const lifetime = new ProcessLifetime();
  lifetime.GetEntrancePoints = () => undefined;
  assert.throws(() => scheduledSpawn(lifetime).run(), TypeError);
});

test("SpawnDrones casts the named behavior before reading entrance points", () =>
{
  const impostor = new SpawnDrones();
  impostor.GetBehaviorName = () => "ProcessLifetime";
  impostor.GetEntrancePoints = () => { throw new Error("Wrong nominal receiver"); };
  const run = scheduledSpawn(impostor);
  assert.doesNotThrow(run.run);
  assert.deepEqual(run.calls, [[[0, 0, 0]]]);
});

test("SpawnDrones preserves absent and empty lifetime branches and selects real entrance points", () =>
{
  for (const lifetime of [null, new ProcessLifetime()])
  {
    const run = scheduledSpawn(lifetime);
    run.run();
    assert.deepEqual(run.calls, [[[0, 0, 0]]]);
    assert.equal(run.spawn.time, 0);
  }
  const lifetime = new ProcessLifetime();
  lifetime.GetEntrancePoints = () => [new Float32Array([4, 5, 6])];
  const run = scheduledSpawn(lifetime);
  run.run();
  assert.deepEqual(run.calls, [[[4, 5, 6]]]);
});

for (const method of ["UpdateSyncronous", "UpdateAsyncronous", "GetRenderables"])
{
  test(`PlayFX requires generated effect receivers for ${method}`, () =>
  {
    const behavior = new PlayFX();
    behavior.generatedFiringEffects.push(null);
    assert.throws(() => behavior[method](null, null), TypeError);
  });
}

test("disabled PlayFX requires generated effects when stopping them", () =>
{
  const behavior = new PlayFX();
  behavior.enabled = false;
  behavior.generatedFiringEffects.push(null);
  assert.throws(() => behavior.CalculateBehavior([], [], 0, null, null, []), TypeError);
});

test("PlayFX component registration applies the native entity cast", () =>
{
  const behavior = new PlayFX();
  // A real behavior contract that deliberately has no EveEntity identity.
  const nonEntity = new ProcessLifetime();
  nonEntity.Register = nonEntity.UnRegister = () => assert.fail("Not an EveEntity");
  const entity = new EveStretch3();
  const registry = new EveComponentRegistry();
  const calls = [];
  entity.Register = value => calls.push(["register", value]);
  entity.UnRegister = value => calls.push(["unregister", value]);
  behavior.GetComponentRegistry = () => registry;
  behavior.generatedFiringEffects.push(null, nonEntity, entity);
  behavior.RegisterComponents();
  behavior.UnRegisterComponents();
  assert.deepEqual(calls, [["register", registry], ["unregister", registry]]);
});
