import { addChild, removeChild } from "../../npm/dist/global/blue/children.js";
// EveSpaceScene::OnListModified (EveSpaceScene.cpp:3414-3491): adding to the
// scene's objects through the notified list registers the entity and the
// secondary light source; removing unregisters both; a plain push raises
// nothing.
import test from "node:test";
import assert from "node:assert/strict";
import { EveEffectRoot2, EveSpaceScene, Tr2ShLightingManager } from "../../npm/dist/trinity/index.js";

/** A real manager whose register/unregister results are recorded. */
function RecordingManager()
{
  const manager = new Tr2ShLightingManager();
  const calls = { registered: 0, unregistered: [] };
  const register = manager.RegisterSecondaryLightSource.bind(manager);
  const unregister = manager.UnregisterSecondaryLightSource.bind(manager);
  manager.RegisterSecondaryLightSource = (...args) => { calls.registered += 1; return register(...args); };
  manager.UnregisterSecondaryLightSource = position => { const found = unregister(position); calls.unregistered.push(found); return found; };
  return { manager, calls };
}

test("adding and removing through the notified list registers and unregisters, as Carbon's BlueList", () =>
{
  const scene = new EveSpaceScene();
  const { manager, calls } = RecordingManager();
  scene.shLightingManager = manager;
  const root = new EveEffectRoot2();
  const registered = () => scene.componentRegistry.registeredEntities.includes(root);

  addChild(scene, "objects", root, { listNotify: scene });
  assert.equal(registered(), true, "an inserted entity joins the component registry");
  assert.equal(calls.registered, 1, "an inserted light source joins the SH lighting manager");

  assert.equal(removeChild(scene, "objects", root, { listNotify: scene }), true);
  assert.equal(registered(), false, "a removed entity leaves the component registry");
  // The manager matches by the registered translation's identity: found.
  assert.deepEqual(calls.unregistered, [ true ], "a removed light source leaves the manager");
});

test("a plain push raises no list event (negative control)", () =>
{
  const scene = new EveSpaceScene();
  const { manager, calls } = RecordingManager();
  scene.shLightingManager = manager;
  const root = new EveEffectRoot2();
  scene.objects.push(root);
  assert.equal(scene.componentRegistry.registeredEntities.includes(root), false);
  assert.equal(calls.registered, 0);
});

test("uiObjects insertions register no entity, as Carbon gates entities to three lists", () =>
{
  const scene = new EveSpaceScene();
  const root = new EveEffectRoot2();
  addChild(scene, "uiObjects", root, { listNotify: scene });
  assert.equal(scene.componentRegistry.registeredEntities.includes(root), false);
});
