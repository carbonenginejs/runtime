import test from "node:test";
import assert from "node:assert/strict";
import { blue } from "../../npm/dist/global/blue/index.js";
import { Tr2ActionChildEffect, EveChildContainer, EveChildParticleSystem, Tr2ParticleSystem, Tr2InstancedMesh, TriDevice } from "../../npm/dist/trinity/index.js";

/** A fresh loaded child with the same particle-to-mesh ownership as an ad. */
function particleChild(onDestroy)
{
  const child = new EveChildParticleSystem();
  const system = new Tr2ParticleSystem();
  system._vertexBuffer = { Destroy: onDestroy };
  child.particleSystems.push(system);
  child.mesh = new Tr2InstancedMesh();
  child.mesh.instanceGeometryResource = system;
  return child;
}

test("child-effect cycles return particle and mesh registrations and buffers to baseline", async t =>
{
  const baseline = TriDevice.GetResourcesRegistered().length;
  let live = 0;
  t.mock.method(blue.resMan, "LoadObject", async () => { live++; return particleChild(() => live--); });
  const owner = new EveChildContainer(), action = new Tr2ActionChildEffect();
  const controller = { GetOwner: () => owner };
  action.path = "res:/synthetic-ad.black";
  for (let i = 0; i < 100; i++)
  {
    action.Start(controller);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(live, 1);
    action.Stop(controller);
    assert.equal(owner.objects.length, 0);
    assert.equal(live, 0);
    assert.equal(TriDevice.GetResourcesRegistered().length, baseline);
  }
});

test("a child arriving after Stop releases the cancelled graph", async t =>
{
  const baseline = TriDevice.GetResourcesRegistered().length;
  let resolveLoad, destroyed = 0;
  t.mock.method(blue.resMan, "LoadObject", () => new Promise(resolve => { resolveLoad = resolve; }));
  const owner = new EveChildContainer(), action = new Tr2ActionChildEffect();
  const controller = { GetOwner: () => owner };
  action.path = "res:/synthetic-ad.black";
  action.Start(controller);
  action.Stop(controller);
  resolveLoad(particleChild(() => destroyed++));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(destroyed, 1);
  assert.equal(owner.objects.length, 0);
  assert.equal(TriDevice.GetResourcesRegistered().length, baseline);
});

test("a retained sibling keeps its shared particle provider alive", async t =>
{
  let destroyed = 0;
  const child = particleChild(() => destroyed++), sibling = new EveChildParticleSystem();
  sibling.particleSystems.push(child.particleSystems[0]);
  t.mock.method(blue.resMan, "LoadObject", async () => child);
  const owner = new EveChildContainer(), action = new Tr2ActionChildEffect();
  const controller = { GetOwner: () => owner };
  owner.objects.push(sibling);
  action.path = "res:/synthetic-ad.black";
  action.Start(controller);
  await new Promise(resolve => setImmediate(resolve));
  action.Stop(controller);
  assert.equal(destroyed, 0);
  assert.ok(TriDevice.GetResourcesRegistered().includes(sibling.particleSystems[0]));
  sibling.particleSystems[0].Destroy();
  assert.equal(destroyed, 1);
});
