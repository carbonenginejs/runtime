// EveSpaceScene::Initialize registers every object entity with the scene's
// component registry (EveSpaceScene.cpp:3247-3257). Without it GatherLights
// found no light owners and no attachment light reached a shader.
import test from "node:test";
import assert from "node:assert/strict";
import { EveShip2, EveSpaceScene } from "../../npm/dist/trinity/index.js";
import { EveComponentType } from "../../npm/dist/trinity/eve/EveComponentTypes.js";
import { StubContext } from "../support/stubContext.js";

test("Initialize registers the scene's objects, so their light owners are gathered", () =>
{
  const scene = new EveSpaceScene();
  const ship = new EveShip2();
  // EveSpaceObject2::RegisterComponents registers a LightOwner only when the
  // object holds lights.
  ship.lights.push({});
  scene.objects.push(ship);

  const owners = () => scene.componentRegistry.GetComponents(EveComponentType.LightOwner);
  assert.deepEqual(owners(), [], "a pushed object is not registered until Initialize");

  scene.Initialize(StubContext({ width: 16, height: 16 }));

  assert.ok(owners().includes(ship), "the ship is a registered light owner");
});
