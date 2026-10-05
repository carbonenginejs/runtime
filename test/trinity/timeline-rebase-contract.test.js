import assert from "node:assert/strict";
import test from "node:test";
import { Tr2TimelineController } from "../../npm/dist/trinity/index.js";
import { ITr2ControllerAction } from "../../npm/dist/trinity/controllers/action/ITr2ControllerAction.js";

test("timeline rebase requires the installed action contract", () =>
{
  const timeline = new Tr2TimelineController();
  const action = new ITr2ControllerAction();
  timeline.actions.push(action);
  assert.doesNotThrow(() => timeline.OnSimClockRebase(4, 7));
  assert.equal(timeline._lastUpdateTime, 3);
  action.RebaseSimTime = undefined;
  assert.throws(() => timeline.OnSimClockRebase(7, 8), TypeError,
    "Tr2TimelineController.cpp:366-375 calls each installed action");
});

