import assert from "node:assert/strict";
import { Tr2Controller } from "../../npm/dist/trinity/index.js";

/** Checks the native DELETING unlink without touching an unrelated controller. */
export function assertControllerDestruct(owner, hook = owner._Destructor ?? owner.OnDestruct)
{
  const controller = new Tr2Controller(), peer = new Tr2Controller();
  const controllers = owner.controllers;
  controllers.push(controller);
  controller.Link(owner);
  peer.Link({});
  controller.Start();
  assert.equal(controller.IsLinked(), true);
  assert.equal(controller.isPlaying, true);
  try
  {
    hook.call(owner);
    hook.call(owner);
    assert.equal(controller.IsLinked(), false);
    assert.equal(controller.isPlaying, true, "DELETING skips Stop; ordinary unlink would stop playback");
    assert.equal(peer.IsLinked(), true);
    assert.equal(owner.controllers, controllers);
    assert.deepEqual(Array.from(controllers), [controller]);
  }
  finally { peer.Unlink(); }
}
