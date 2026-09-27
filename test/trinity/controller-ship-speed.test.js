// Carbon's ShipSpeed()/ShipMaxSpeed() controller functions
// (Controllers/Tr2ControllerExpression.cpp:142-201): the owner's world-velocity
// length, and the ship's (or container's owner) max speed with a fallback of 1.
import assert from "node:assert/strict";
import test from "node:test";

import { CjsControllerExpressionProgram, EveChildContainer, EveShip2 } from "../../npm/dist/trinity/index.js";

test("ShipSpeed() is the owning ship's world-velocity length; ShipMaxSpeed() its GetMaxSpeed", () =>
{
  const ship = new EveShip2();
  ship.worldVelocity.set([ 3, 0, 4 ]);
  ship.maxSpeed = 250;

  assert.equal(CjsControllerExpressionProgram.Compile("ShipSpeed()").Evaluate({ owner: ship }), 5);
  assert.equal(CjsControllerExpressionProgram.Compile("ShipMaxSpeed()").Evaluate({ owner: ship }), 250);

  ship.maxSpeed = 0;
  assert.equal(CjsControllerExpressionProgram.Compile("ShipMaxSpeed()").Evaluate({ owner: ship }), 1, "unset max speed reads 1");
});

test("an effect container answers from its own sampled velocity and owner max speed; anything else is 0 and 1", () =>
{
  const container = new EveChildContainer();
  assert.equal(CjsControllerExpressionProgram.Compile("ShipSpeed()").Evaluate({ owner: container }), 0);
  assert.equal(CjsControllerExpressionProgram.Compile("ShipMaxSpeed()").Evaluate({ owner: container }), 1);

  assert.equal(CjsControllerExpressionProgram.Compile("ShipSpeed()").Evaluate({ owner: {} }), 0);
  assert.equal(CjsControllerExpressionProgram.Compile("ShipMaxSpeed()").Evaluate({ owner: {} }), 1);
});
