import assert from "node:assert/strict";
import { test } from "node:test";
import { EveSwarm } from "../npm/dist/index.js";


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
