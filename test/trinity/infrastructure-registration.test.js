// Infrastructure device resources keep Carbon's constructor registration and are never evicted
// (docs internal/decisions/device-resource-registration.md, S3 batch 5); their Destruct unregisters,
// so the next pass drops a destructed one instead of keeping it forever.
import assert from "node:assert/strict";
import test from "node:test";
import { trinity, EveSpaceScene } from "../../npm/dist/index.js";

test("a scene registers on construction, never idles out, and is dropped by the pass after Destruct", () =>
{
  const scene = new EveSpaceScene();
  assert.ok(trinity.GetResourcesRegistered().includes(scene), "registered by its constructor, as Carbon's base does");
  assert.equal(scene._retention, Infinity, "infrastructure is never evicted");
  trinity._ReleaseIdleResources();
  assert.ok(trinity.GetResourcesRegistered().includes(scene), "an unused scene is not idle-released");

  scene.Destruct();
  assert.equal(trinity.GetResourcesRegistered().includes(scene), false, "Destruct unregisters at once");
  assert.ok(trinity._resourcesRegistered.includes(scene), "the entry stays until the pass");
  trinity._ReleaseIdleResources();
  assert.equal(trinity._resourcesRegistered.includes(scene), false, "the pass drops the destructed scene");
});
