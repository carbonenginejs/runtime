import assert from "node:assert/strict";
import test from "node:test";

import { CjsWebgpuTrinityStepRecorder } from "../src/core/trinityStepRecorder.js";

function context()
{
  const intents = [];
  let cursor = 0;
  return {
    Emit(intent)
    {
      intents.push(intent);
    },
    TakeIntents()
    {
      const taken = intents.slice(cursor);
      cursor = intents.length;
      return taken;
    }
  };
}

test("Trinity step recorder captures immutable begin, execute, and end segments", () =>
{
  const renderContext = context();
  const recorder = new CjsWebgpuTrinityStepRecorder();
  const job = { id: "job" };
  const color = [ 0.25, 0.5, 0.75, 1 ];
  const swapChain = { id: "swap-chain" };
  const step = {
    BeginExecute(received)
    {
      assert.equal(received, renderContext);
      received.Emit({ type: "clear", color });
    },
    Execute(realTime, simTime, received)
    {
      assert.deepEqual([ realTime, simTime, received ], [ 1, 2, renderContext ]);
      received.Emit({ type: "draw", count: 3 });
      return 0;
    },
    EndExecute(received)
    {
      received.Emit({ type: "present", swapChain });
    }
  };

  recorder.BeginStep(step, 1, 2, job, renderContext);
  assert.equal(recorder.ExecuteStep(step, 1, 2, job, renderContext), 0);
  recorder.EndStep(step, 1, 2, job, renderContext);
  color[0] = 1;

  const segments = recorder.GetSegments();
  assert.deepEqual(segments.map((entry) => entry.phase), [ "begin", "execute", "end" ]);
  assert.deepEqual(segments.map((entry) => entry.intents[0].type), [ "clear", "draw", "present" ]);
  assert.deepEqual(segments[0].intents[0].color, [ 0.25, 0.5, 0.75, 1 ]);
  assert.equal(Object.isFrozen(segments[0]), true);
  assert.equal(Object.isFrozen(segments[0].intents[0]), true);
  assert.equal(Object.isFrozen(segments[0].intents[0].color), true);
  assert.equal(segments[2].intents[0].swapChain, swapChain);
  assert.equal(Object.isFrozen(swapChain), false);
});

test("Trinity step recorder preserves nested intent order and exactly-once takes", () =>
{
  const renderContext = context();
  const recorder = new CjsWebgpuTrinityStepRecorder();
  const parentJob = { id: "parent-job" };
  const childJob = { id: "child-job" };
  const child = {
    id: "child",
    Execute(_realTime, _simTime, received)
    {
      received.Emit({ type: "child" });
      return 0;
    }
  };
  const parent = {
    id: "parent",
    Execute(_realTime, _simTime, received)
    {
      received.Emit({ type: "parent-before" });
      recorder.BeginStep(child, 3, 4, childJob, received);
      recorder.ExecuteStep(child, 3, 4, childJob, received);
      recorder.EndStep(child, 3, 4, childJob, received);
      received.Emit({ type: "parent-after" });
      return 0;
    }
  };

  renderContext.Emit({ type: "frame-setup" });
  recorder.BeginStep(parent, 1, 2, parentJob, renderContext);
  recorder.ExecuteStep(parent, 1, 2, parentJob, renderContext);
  recorder.EndStep(parent, 1, 2, parentJob, renderContext);

  const segments = recorder.TakeSegments();
  assert.deepEqual(
    segments.flatMap((entry) => entry.intents.map((intent) => intent.type)),
    [ "frame-setup", "parent-before", "child", "parent-after" ]
  );
  assert.deepEqual(
    segments.map((entry) => [ entry.phase, entry.step?.id ?? null ]),
    [
      [ "setup", null ],
      [ "execute", "parent" ],
      [ "execute", "child" ],
      [ "execute", "parent" ]
    ]
  );
  assert.equal(recorder.TakeSegments().length, 0);
  assert.equal(recorder.PeekSegments().length, 0);
  assert.equal(recorder.GetSegments().length, 4);
  recorder.ClearSegments();
  assert.equal(recorder.GetSegments().length, 0);
});

test("Trinity step recorder closes failed setup and enforces balanced ownership", () =>
{
  const renderContext = context();
  const recorder = new CjsWebgpuTrinityStepRecorder();
  const job = { id: "job" };
  const broken = {
    BeginExecute(received)
    {
      received.Emit({ type: "before-error" });
      throw new Error("setup failed");
    }
  };

  assert.throws(
    () => recorder.BeginStep(broken, 0, 0, job, renderContext),
    /setup failed/u
  );
  assert.equal(recorder.GetSegments()[0].intents[0].type, "before-error");

  const next = { Execute: () => 0 };
  recorder.BeginStep(next, 0, 0, job, renderContext);
  assert.throws(
    () => recorder.EndStep({}, 0, 0, job, renderContext),
    /step lifecycle is unbalanced/u
  );
  assert.throws(
    () => recorder.ClearSegments(),
    /while a step is active/u
  );
  recorder.ExecuteStep(next, 0, 0, job, renderContext);
  recorder.EndStep(next, 0, 0, job, renderContext);

  const otherContext = context();
  assert.throws(
    () => recorder.Flush(otherContext),
    /already bound to another context/u
  );
});
