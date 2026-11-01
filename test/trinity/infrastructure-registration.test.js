// Infrastructure device resources keep Carbon's constructor registration and are never evicted
// on Carbon's registry, outside the sweep (docs internal/decisions/device-resource-registration.md,
// Revised lifecycle § 1); their Destruct unregisters, as Carbon's destructor does.
import assert from "node:assert/strict";
import test from "node:test";
import { trinity, EveSpaceScene } from "../../npm/dist/index.js";

test("a scene is on Carbon's registry from construction, never swept, and leaves it at Destruct", () =>
{
  const scene = new EveSpaceScene();
  assert.ok(trinity.GetResourcesRegistered().includes(scene), "registered by its constructor, as Carbon's base does");
  assert.equal(trinity._sceneResources.includes(scene), false, "infrastructure is not in the sweep's array");
  trinity.CollectResources();
  assert.ok(trinity.GetResourcesRegistered().includes(scene), "an unused scene is never swept");

  scene.Destruct();
  assert.equal(trinity.GetResourcesRegistered().includes(scene), false, "Destruct unregisters it, as Carbon's destructor does");
});
