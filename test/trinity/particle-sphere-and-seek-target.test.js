// EveChildParticleSphere (the camera dust field, res:/dx9/scene/dustfield.black) keeps a sphere of particles around
// its parent's position (EveChildParticleSphere.cpp:189-421); SeekTarget steers drones to locators
// (SeekTarget.cpp:53-277).
import test from "node:test";
import assert from "node:assert/strict";
import { vec3 } from "../../npm/dist/global/math/vec3.js";
import { mat4 } from "../../npm/dist/global/math/mat4.js";
import {
  BehaviorGroup,
  DroneAgent,
  EveChildParticleSphere,
  EveLocatorSets,
  EveUpdateContext,
  Locator,
  SeekTarget,
  RawData,
  Tr2ParticleElementDeclaration,
  Tr2ParticleSystem
} from "../../npm/dist/trinity/index.js";

function particleSystem(maxParticleCount)
{
  const system = new Tr2ParticleSystem();
  system.maxParticleCount = maxParticleCount;
  for (const type of [ Tr2ParticleElementDeclaration.Type.LIFETIME, Tr2ParticleElementDeclaration.Type.POSITION,
    Tr2ParticleElementDeclaration.Type.VELOCITY ])
  {
    const declaration = new Tr2ParticleElementDeclaration();
    declaration.elementType = type;
    system.elements.push(declaration);
  }
  return system;
}

function updateAt(sphere, context, x, y, z)
{
  const params = { localToWorldTransform: mat4.fromTranslation(mat4.create(), [ x, y, z ]) };
  sphere.UpdateSyncronous(context, params);
  sphere.UpdateAsyncronous(context, params);
}

function positions(system)
{
  const out = [];
  for (let index = 0; index < system.aliveCount; index++) out.push(vec3.clone(system.GetParticleElement(index, Tr2ParticleElementDeclaration.Type.POSITION)));
  return out;
}

test("a particle sphere fills itself inside its radius and follows only its parent's translation", () =>
{
  const sphere = new EveChildParticleSphere();
  sphere.radius = 100;
  sphere.particleSystem = particleSystem(64);
  const context = new EveUpdateContext();
  context.SetTime(10 * 10_000_000);

  assert.equal(sphere.GetRenderables([]).length, 0, "nothing renders before an update");
  updateAt(sphere, context, 10, 20, 30);
  assert.equal(sphere.isValid, true, "isValid is MAP_PROPERTY_READONLY over CheckBinding");
  assert.equal(sphere.CheckBinding(), true);
  assert.equal(sphere.particleSystem.aliveCount, 64, "every free slot is filled");
  for (const position of positions(sphere.particleSystem)) assert.ok(vec3.length(position) <= 100 + 1e-3, "inside the radius");

  const world = sphere.GetLocalToWorldTransform(mat4.create());
  assert.deepEqual(Array.from(world.subarray(12, 15)), [ 10, 20, 30 ]);
  const bounds = new Float32Array(4);
  sphere.GetBoundingSphere(bounds);
  assert.deepEqual(Array.from(bounds), [ 10, 20, 30, 100 ]);
});

test("moving the parent shifts the particles and refills those that left the sphere", () =>
{
  const sphere = new EveChildParticleSphere();
  sphere.radius = 100;
  sphere.particleSystem = particleSystem(64);
  const context = new EveUpdateContext();
  context.SetTime(10 * 10_000_000);
  updateAt(sphere, context, 0, 0, 0);
  context.SetTime(11 * 10_000_000);
  updateAt(sphere, context, 150, 0, 0);

  assert.equal(sphere.particleSystem.aliveCount, 64);
  for (const position of positions(sphere.particleSystem)) assert.ok(vec3.length(position) <= 100 + 1e-3, "refilled inside the radius");
});

test("seek target steers each drone to the offset point of its locator, then marks arrival", () =>
{
  const behavior = new SeekTarget();
  behavior.AddLocatorSet();
  const locator = new Locator();
  vec3.set(locator.position, 100, 0, 0);
  behavior.locatorSet.locators.push(locator);

  const group = new BehaviorGroup();
  const agent = new DroneAgent();
  const scratch = [ behavior.InitializeScratch() ];
  assert.equal(behavior.GetScratchMemorySize() > 0, true);

  const forces = behavior.CalculateBehavior([ agent ], scratch, 0.1, group, null, []);
  assert.deepEqual(Array.from(agent.target), [ 100, 0, 0 ]);
  assert.equal(forces.length, 2, "one (position + offset, force) pair per drone");
  assert.ok(agent.acceleration[0] > 0, "accelerates toward the locator");
  assert.equal(scratch[0].arrived, false);

  // The target point sits distFromOrigin along the locator's up axis.
  vec3.set(agent.position, 100, 10, 0);
  vec3.set(agent.acceleration, 0, 0, 0);
  behavior.CalculateBehavior([ agent ], scratch, 0.1, group, null, []);
  assert.equal(agent.playFX, true, "the effect starts inside the slow-down radius");
  assert.equal(scratch[0].arrived, true);
});

test("a disabled or weightless seek target returns no forces", () =>
{
  const behavior = new SeekTarget();
  behavior.enabled = false;
  assert.equal(behavior.CalculateBehavior([ new DroneAgent() ], [ behavior.InitializeScratch() ], 0.1, new BehaviorGroup(), null, []).length, 0);
});

test("particle sphere packs Carbon's transposed world and direct inverse", () =>
{
  const sphere = new EveChildParticleSphere();
  // A nonsymmetric fixture makes an accidental extra transpose observable.
  mat4.translate(sphere._worldTransform, sphere._worldTransform, [10, 20, 30]);
  mat4.rotateY(sphere._worldTransform, sphere._worldTransform, 0.7);
  mat4.scale(sphere._worldTransform, sphere._worldTransform, [2, 3, 4]);
  const data = sphere.GetPerObjectData({ Alloc: name => RawData.create(name) });
  const world = mat4.transpose(mat4.create(), sphere._worldTransform);
  const inverse = mat4.invert(mat4.create(), sphere._worldTransform);
  assert.deepEqual(data.GetData().slice(0, 16), world);
  assert.deepEqual(data.GetData().slice(16, 32), inverse);
  assert.notDeepEqual(inverse, mat4.transpose(mat4.create(), inverse));
});
