// EveShip2::GetParentData adds the ship's kill count to the base record
// (EveShip2.cpp:336-342); the kill-counter decals read it as displayData.x
// (EveSpaceObjectDecal.cpp:374).
import test from "node:test";
import assert from "node:assert/strict";
import { EveShip2, EveSpaceObject2 } from "../../npm/dist/trinity/index.js";

test("a ship's parent data carries its displayed kill count", () =>
{
  const ship = new EveShip2();
  ship.displayKillCounterValue = 42;
  assert.equal(ship.GetParentData().killCount, 42);
});

test("a plain space object's parent data has no kill count", () =>
{
  assert.equal(new EveSpaceObject2().GetParentData().killCount, 0, "Carbon never assigns it on the base path");
});
