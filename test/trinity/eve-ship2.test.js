// EveShip2 CPU behavior: speed derivation, booster drive, per-object glow.
import test from "node:test";
import assert from "node:assert/strict";
import { EveShip2, EveUpdateContext } from "../../npm/dist/trinity/index.js";

test("EveShip2 derives speed and drives boosters from the position curve", () =>
{
  const ship = new EveShip2();
  ship.update = true;
  ship.maxSpeed = 100;
  ship.audioSpeedParameter = { value: -1 };

  const boosterCalls = [];
  ship.boosters = {
    Update(...args) { boosterCalls.push(["Update", ...args]); },
    UpdateTrails(deltaT, time) { boosterCalls.push(["UpdateTrails", deltaT, time]); },
    GetBoosterIntensity() { return 0.75; }
  };
  ship.translationCurve = {
    GetValueAt(_time, out) { out[0] = 0; out[1] = 0; out[2] = 0; return out; },
    GetValueDotAt(_time, out) { out[0] = 3; out[1] = 4; out[2] = 0; return out; },
    GetValueDoubleDotAt(_time, out) { out[0] = 9; out[1] = 0; out[2] = 0; return out; }
  };

  const context = new EveUpdateContext();
  context.SetTime?.(0);
  ship.UpdateSyncronous(context);

  assert.ok(ship.speed, "speed holder created");
  assert.ok(Math.abs(ship.speed.value - 5) < 1e-5, "speed = |worldVelocity| from the dot curve");
  assert.ok(Math.abs(ship.audioSpeedParameter.value - 0.05) < 1e-6, "audio parameter = speed / maxSpeed");

  ship.UpdateBoosters(context);
  assert.equal(boosterCalls[0][0], "Update", "boosters updated");
  assert.ok(Math.abs(boosterCalls[0][4] - ship.speed.value) < 1e-6, "booster speed argument");
  assert.ok(Math.abs(boosterCalls[0][5][0] - 9) < 1e-6, "acceleration from the double-dot curve");
  assert.equal(boosterCalls[1][0], "UpdateTrails");
});

test("EveShip2 stamps booster glow into shipData and gates boosters on children display", () =>
{
  const ship = new EveShip2();
  ship.boosters = { GetBoosterIntensity: () => 0.75 };

  const pod = ship.GetPerObjectData();
  assert.equal(pod.vs.GetStruct(), "EveSpaceObjectVSData", "base per-object record");
  assert.ok(Math.abs(ship.GetSpaceObjectShipData()[0] - 0.75) < 1e-6, "shipData.x = booster glow");
  assert.ok(Math.abs(pod.vs.Get("shipData")[0] - 0.75) < 1e-6, "the glow reaches the VS record");

  // DisplayBoosters follows DisplayChildren (activation-strength gate).
  assert.equal(typeof ship.DisplayBoosters(), "boolean");
  assert.equal(ship.GetMaxSpeed(), 0);
  ship.maxSpeed = 42;
  assert.equal(ship.GetMaxSpeed(), 42);
});
