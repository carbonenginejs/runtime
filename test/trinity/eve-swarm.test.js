import assert from "node:assert/strict";
import { test } from "node:test";
import { EveSwarm } from "../../npm/dist/trinity/index.js";


test("EveSwarm behavior fields use Carbon BehaviorProperties defaults", () =>
{
  const swarm = new EveSwarm();
  assert.deepEqual({
    mass: swarm.mass,
    speedMultiplier: swarm.speedMultiplier,
    speedMinimum: swarm.speedMinimum,
    agility: swarm.agility,
    maxDistance0: swarm.maxDistance0,
    maxDistance1: swarm.maxDistance1,
    timeMultiplier: swarm.timeMultiplier,
    maxTime: swarm.maxTime,
    speed0: swarm.speed0,
    speed1: swarm.speed1,
    weightCohesion: swarm.weightCohesion,
    weightSeparation: swarm.weightSeparation,
    separationDistance: swarm.separationDistance,
    weightAlign: swarm.weightAlign,
    weightWander: swarm.weightWander,
    wanderFluctuation: swarm.wanderFluctuation,
    wanderDistance: swarm.wanderDistance,
    wanderRadius: swarm.wanderRadius,
    weightAnchor: swarm.weightAnchor,
    anchorRadius0: swarm.anchorRadius0,
    anchorRadius1: swarm.anchorRadius1,
    weightDeceleration: swarm.weightDeceleration,
    maxDeceleration: swarm.maxDeceleration,
    weightFormation: swarm.weightFormation,
    formationDistance: swarm.formationDistance
  }, {
    mass: 1,
    speedMultiplier: 1.1,
    speedMinimum: 10,
    agility: 2,
    maxDistance0: 500,
    maxDistance1: 125,
    timeMultiplier: 1,
    maxTime: 0.2,
    speed0: 700,
    speed1: 1000,
    weightCohesion: 0.1,
    weightSeparation: 0.1,
    separationDistance: 250,
    weightAlign: 50,
    weightWander: 0.33,
    wanderFluctuation: 0.05,
    wanderDistance: 100,
    wanderRadius: 80,
    weightAnchor: 0.5,
    anchorRadius0: 75,
    anchorRadius1: 250,
    weightDeceleration: 0.1,
    maxDeceleration: 200,
    weightFormation: 1,
    formationDistance: 50
  });
});


test("EveSwarm re-bases damage locators into the target swarmer's space", async () =>
{
  const { EveLocatorSets } = await import("../../npm/dist/trinity/index.js");
  const { mat4 } = await import("../../npm/dist/global/math/mat4.js");

  const swarm = new EveSwarm();
  const damage = new EveLocatorSets();
  damage.SetName("damage");
  damage.Append([{ position: [ 1, 0, 0 ], direction: [ 0, 0, 0, 1 ], boneIndex: 0 }]);
  swarm.locatorSets.push(damage);

  // Zero swarmers: the base ship resolution answers unmodified.
  swarm.count = 0;
  assert.deepEqual(Array.from(swarm.GetDamageLocator(0)), [ 1, 0, 0 ]);

  // One swarmer 10 units out: impacts land on the vehicle being shot.
  swarm.AddSwarmer();
  swarm.targetIndex = 0;
  mat4.fromTranslation(swarm.renderables[0].worldTransform, [ 10, 0, 0 ]);
  const position = swarm.GetDamageLocator(0);
  assert.deepEqual(Array.from(position), [ 11, 0, 0 ]);
  const direction = swarm.GetDamageLocatorDirection(0);
  assert.deepEqual(Array.from(direction), [ 0, 1, 0 ]);
});


// Behaviour weights that draw on TriRand (wander, and separation for coincident vehicles) are zeroed where a test
// needs exact numbers.
function swarmWith(count, weights = {})
{
  const swarm = new EveSwarm();
  swarm.count = 0;
  swarm.SetCount(count);
  Object.assign(swarm, { weightWander: 0, weightSeparation: 0 }, weights);
  return swarm;
}

const close = (actual, expected, message) =>
  expected.forEach((value, index) => assert.ok(Math.abs(actual[index] - value) < 1e-4, `${message}: ${Array.from(actual)} against ${expected}`));

test("SetCount builds SwarmVehicle and EveSwarmRenderable pairs; Initialize creates the persisted count", async () =>
{
  const { SwarmVehicle, EveSwarmRenderable } = await import("../../npm/dist/trinity/index.js");
  const swarm = swarmWith(3);
  assert.equal(swarm.count, 3);
  assert.ok(swarm.vehicles.every((vehicle) => vehicle instanceof SwarmVehicle));
  assert.ok(swarm.renderables.every((renderable) => renderable instanceof EveSwarmRenderable && renderable.owner === swarm));

  const initialized = new EveSwarm();
  initialized.count = 4;
  initialized.Initialize();
  assert.equal(initialized.vehicles.length, 4, "Initialize resets m_count to 0 and SetCount(count)s back up (EveSwarm.cpp:883-891)");
});

test("CalculateForces puts vehicle 0 ahead and the rest in a V behind it (EveSwarm.cpp:1164-1176)", () =>
{
  const swarm = swarmWith(3, { weightCohesion: 0, weightAnchor: 0, weightAlign: 0, weightDeceleration: 0 });
  const zero = new Float32Array(3);
  const force = new Float32Array(3);
  const forward = Float32Array.of(0, 0, 1);
  const side = Float32Array.of(1, 0, 0);
  // Base point: vehicle 0 + forward * formationDistance(50) * count(3) * 0.25 = (0, 0, 37.5).
  swarm.CalculateForces(0, swarm.vehicles, zero, zero, zero, forward, side, 0.1, force);
  close(force, [ 0, 0, 37.5 ], "vehicle 0 leads");
  swarm.CalculateForces(1, swarm.vehicles, zero, zero, zero, forward, side, 0.1, force);
  close(force, [ 25, 0, -12.5 ], "odd index: one rank back, half a rank to +side");
  swarm.CalculateForces(2, swarm.vehicles, zero, zero, zero, forward, side, 0.1, force);
  close(force, [ -25, 0, -12.5 ], "even index: the same rank, to -side");
});

test("UpdateSwarm steers by the clamped anchor force and keeps the squad within maxDistance of the ball", () =>
{
  const swarm = swarmWith(1, { weightCohesion: 0 });
  swarm.isVisible = true;
  const t0 = 10000000;
  swarm.UpdateSwarm(t0);
  close(swarm.vehicles[0].position, [ 0, 0, 0 ], "the first update puts every vehicle on the ball");

  swarm.vehicles[0].position.set([ 1000, 0, 0 ]);
  swarm.UpdateSwarm(t0 + 1000000);
  // Anchor (-1000, 0, 0) * linearize(75, 250, 1000) * 0.5 clamps to maxAcceleration = speedMinimum = 10; after 0.1s the
  // velocity is (-1, 0, 0) and the vehicle is at 999.9, which is 499.9 past maxDistance0 (the ball is still), so the
  // squad is pulled back to 500.
  close(swarm.vehicles[0].acceleration, [ -10, 0, 0 ], "acceleration");
  close(swarm.vehicles[0].velocity, [ -1, 0, 0 ], "velocity");
  close(swarm.vehicles[0].position, [ 500, 0, 0 ], "pulled to maxDistance");
  close(swarm.squadBoundsMin, [ 500, 0, 0 ], "bounds move with the squad");
  close(swarm.squadBoundsMax, [ 500, 0, 0 ], "bounds move with the squad");
  // Heading -X: yaw -pi/2, slerped agility(2) * 0.1 of the way: a -0.1pi turn about +Y.
  close(swarm.vehicles[0].rotation, [ 0, Math.sin(-0.05 * Math.PI), 0, Math.cos(0.05 * Math.PI) ], "rotation");
});

test("an off-screen swarm only carries its vehicles with the ball until the LOD interval passes", () =>
{
  const swarm = swarmWith(1);
  swarm.isVisible = false;
  swarm._lodUpdateTime = 1;
  swarm.UpdateSwarm(10000000);
  swarm.vehicles[0].position.set([ 5, 0, 0 ]);
  swarm.UpdateSwarm(10000000 + 1000000);
  close(swarm.vehicles[0].position, [ 5, 0, 0 ], "the ball did not move, and neither did the vehicle");
  assert.ok(Math.abs(swarm._timeSinceUpdate - 0.1) < 1e-6);
});

test("RemoveSwarmer swap-pops the vehicle but erases the renderable (Carbon quirk, EveSwarm.cpp:955-965)", () =>
{
  const swarm = swarmWith(3);
  const [ v0, v1, v2 ] = swarm.vehicles;
  const [ r0, r1, r2 ] = swarm.renderables;
  v0.position.set([ 7, 8, 9 ]);
  swarm.targetIndex = 0;
  const removed = swarm.RemoveSwarmer();
  assert.deepEqual(Array.from(removed), [ 7, 8, 9 ]);
  assert.deepEqual(swarm.vehicles, [ v2, v1 ]);
  assert.deepEqual(swarm.renderables, [ r1, r2 ]);
  assert.equal(r0.owner, null);
  assert.equal(swarm.count, 2);
});

test("PushRenderables pushes the fighters, not the swarm or its children", async () =>
{
  const { Tr2Mesh, EveTransform } = await import("../../npm/dist/trinity/index.js");
  const swarm = new EveSwarm();
  swarm.mesh = new Tr2Mesh();
  swarm.count = 0;
  swarm.SetCount(2);
  swarm.children.push(new EveTransform());
  swarm._isMeshVisible = true;
  const out = [];
  swarm.PushRenderables(out);
  assert.deepEqual(out, swarm.renderables);
});

test("GetTurretTransform: a turret set rides the fighter its swarm ID names", () =>
{
  const swarm = swarmWith(2);
  assert.equal(swarm.GetTurretTransform(1), swarm.renderables[1].GetWorldTransform());
  assert.equal(swarm.GetTurretTransform(2), swarm.worldTransform, "no such fighter: the swarm's own transform");
});

test("EveSpaceObject2.UpdateModelCenterWorldPosition updates the transform, then answers the model centre", async () =>
{
  const { EveShip2 } = await import("../../npm/dist/trinity/index.js");
  const ship = new EveShip2();
  ship.boundingSphereCenter.set([ 1, 2, 3 ]);
  ship.modelScale = 2;
  const position = new Float32Array(3);
  ship.UpdateModelCenterWorldPosition(position, 10000000);
  close(position, [ 2, 4, 6 ], "boundingSphereCenter through the freshly built transform");

  const swarm = swarmWith(1);
  swarm.swarmingEnabled = true;
  swarm.isVisible = true;
  swarm.UpdateModelCenterWorldPosition(position, 10000000);
  close(position, [ 0, 0, 0 ], "swarming: the squad box's centre after UpdateSwarm");
});
