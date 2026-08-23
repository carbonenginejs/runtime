import assert from "node:assert/strict";
import test from "node:test";

import { CjsWebgpuTrinityStepRecorder } from "../../../npm/dist/engine/webgpu/internal.js";
import {
  CjsTrinityStepExecutor,
  Tr2RenderContext
} from "../../../npm/dist/trinity/core/index.js";
import { TriRenderJob, TriRenderStep } from "../../../npm/dist/trinity/renderJob/index.js";


class TestStep extends TriRenderStep
{
  constructor({ begin = null, execute = () => 0, end = null, id = "" } = {})
  {
    super();
    this.begin = begin;
    this.execute = execute;
    this.end = end;
    this.id = id;
  }

  BeginExecute(context)
  {
    return this.begin ? this.begin(context) : undefined;
  }

  Execute(realTime, simTime, context)
  {
    return this.execute(realTime, simTime, context);
  }

  EndExecute(context)
  {
    return this.end ? this.end(context) : undefined;
  }
}

test("Trinity step recorder captures immutable begin, execute, and end segments", () =>
{
  const renderContext = new Tr2RenderContext();
  const recorder = new CjsWebgpuTrinityStepRecorder();
  const job = new TriRenderJob();
  const color = [ 0.25, 0.5, 0.75, 1 ];
  const swapChain = { id: "swap-chain" };
  const step = new TestStep({
    begin(received)
    {
      assert.equal(received, renderContext);
      received.Clear({ color, clearColor: true });
    },
    execute(realTime, simTime, received)
    {
      assert.deepEqual([ realTime, simTime, received ], [ 1, 2, renderContext ]);
      received.RenderObject({ id: "draw" }, { count: 3 });
      return 0;
    },
    end(received)
    {
      received.PresentSwapChain(swapChain);
    }
  });

  assert.ok(recorder instanceof CjsTrinityStepExecutor);

  recorder.BeginStep(step, 1, 2, job, renderContext);
  assert.equal(recorder.ExecuteStep(step, 1, 2, job, renderContext), 0);
  recorder.EndStep(step, 1, 2, job, renderContext);
  color[0] = 1;

  const segments = recorder.GetSegments();
  assert.deepEqual(segments.map((entry) => entry.phase), [ "begin", "execute", "end" ]);
  assert.deepEqual(segments.map((entry) => entry.intents[0].type), [ "clear", "render-object", "present-swap-chain" ]);
  assert.deepEqual(segments[0].intents[0].color, [ 0.25, 0.5, 0.75, 1 ]);
  assert.equal(Object.isFrozen(segments[0]), true);
  assert.equal(Object.isFrozen(segments[0].intents[0]), true);
  assert.equal(Object.isFrozen(segments[0].intents[0].color), true);
  assert.equal(segments[2].intents[0].swapChain, swapChain);
  assert.equal(Object.isFrozen(swapChain), false);
});

test("Trinity step recorder preserves nested intent order and exactly-once takes", () =>
{
  const renderContext = new Tr2RenderContext();
  const recorder = new CjsWebgpuTrinityStepRecorder();
  const parentJob = new TriRenderJob();
  const childJob = new TriRenderJob();
  const child = new TestStep({
    id: "child",
    execute(_realTime, _simTime, received)
    {
      received.RenderObject({ id: "child" });
      return 0;
    }
  });
  const parent = new TestStep({
    id: "parent",
    execute(_realTime, _simTime, received)
    {
      received.RenderObject({ id: "parent-before" });
      recorder.BeginStep(child, 3, 4, childJob, received);
      recorder.ExecuteStep(child, 3, 4, childJob, received);
      recorder.EndStep(child, 3, 4, childJob, received);
      received.RenderObject({ id: "parent-after" });
      return 0;
    }
  });

  renderContext.RenderObject({ id: "frame-setup" });
  recorder.BeginStep(parent, 1, 2, parentJob, renderContext);
  recorder.ExecuteStep(parent, 1, 2, parentJob, renderContext);
  recorder.EndStep(parent, 1, 2, parentJob, renderContext);

  const segments = recorder.TakeSegments();
  assert.deepEqual(
    segments.flatMap((entry) => entry.intents.map((intent) => intent.renderable.id)),
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
  const renderContext = new Tr2RenderContext();
  const recorder = new CjsWebgpuTrinityStepRecorder();
  const job = new TriRenderJob();
  const broken = new TestStep({
    begin(received)
    {
      received.RenderObject({ id: "before-error" });
      throw new Error("setup failed");
    }
  });

  assert.throws(
    () => recorder.BeginStep(broken, 0, 0, job, renderContext),
    /setup failed/u
  );
  assert.equal(recorder.GetSegments()[0].intents[0].renderable.id, "before-error");

  const next = new TestStep();
  recorder.BeginStep(next, 0, 0, job, renderContext);
  assert.throws(
    () => recorder.EndStep(new TestStep(), 0, 0, job, renderContext),
    /step lifecycle is unbalanced/u
  );
  assert.throws(
    () => recorder.ClearSegments(),
    /while a step is active/u
  );
  recorder.ExecuteStep(next, 0, 0, job, renderContext);
  recorder.EndStep(next, 0, 0, job, renderContext);

  const otherContext = new Tr2RenderContext();
  assert.throws(
    () => recorder.Flush(otherContext),
    /already bound to another context/u
  );
  assert.throws(
    () => new CjsWebgpuTrinityStepRecorder().Flush({ TakeIntents: () => [] }),
    /Tr2RenderContext/u
  );
});
