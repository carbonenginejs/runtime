import assert from "node:assert/strict";
import test from "node:test";

import {
  CjsDirectTrinityStepExecutor,
  CjsTrinityBatchDispatcher,
  CjsTrinityBatchResolver,
  CjsTrinityStepExecutor,
  Tr2RenderContext
} from "../../npm/dist/trinity/core/index.js";
import { TriRenderStep } from "../../npm/dist/trinity/renderJob/index.js";


class TestStep extends TriRenderStep
{
  constructor(events = [])
  {
    super();
    this.events = events;
  }

  BeginExecute(context)
  {
    this.events.push([ "begin", context ]);
  }

  Execute(realTime, simTime, context)
  {
    this.events.push([ "execute", realTime, simTime, context ]);
    return TriRenderStep.RS_OK;
  }

  EndExecute(context)
  {
    this.events.push([ "end", context ]);
  }
}


class RecordingExecutor extends CjsTrinityStepExecutor
{
  constructor(events)
  {
    super();
    this.events = events;
  }

  BeginStep(...args) { this.events.push([ "BeginStep", ...args ]); }
  ExecuteStep(...args) { this.events.push([ "ExecuteStep", ...args ]); return 0; }
  EndStep(...args) { this.events.push([ "EndStep", ...args ]); }
  BeginScene(...args) { this.events.push([ "BeginScene", ...args ]); }
  EndScene(...args) { this.events.push([ "EndScene", ...args ]); }
  BeginBatch(...args) { this.events.push([ "BeginBatch", ...args ]); }
  EndBatch(...args) { this.events.push([ "EndBatch", ...args ]); }
}


test("Trinity nominal bases fail loudly until extended", () =>
{
  const resolver = new CjsTrinityBatchResolver();
  assert.throws(() => resolver.ResolveMaterial(), /ResolveMaterial/u);
  assert.throws(() => resolver.ResolveGeometry(), /ResolveGeometry/u);
  assert.throws(() => resolver.ResolveBindings(), /ResolveBindings/u);

  const dispatcher = new CjsTrinityBatchDispatcher();
  assert.throws(() => dispatcher.PrepareBatchMap(), /PrepareBatchMap/u);
  assert.throws(() => dispatcher.EncodeBatchType(), /EncodeBatchType/u);
  assert.throws(() => dispatcher.DestroyBatchMap(), /DestroyBatchMap/u);

  const executor = new CjsTrinityStepExecutor();
  for (const method of [
    "BeginStep", "ExecuteStep", "EndStep", "BeginScene", "EndScene", "BeginBatch", "EndBatch"
  ])
  {
    assert.throws(() => executor[method](), new RegExp(method, "u"));
  }

  assert.throws(() => new TriRenderStep().Execute(), /TriRenderStep\.Execute/u);
});


test("the direct Trinity executor delegates steps and balances batch stacks", () =>
{
  const executor = new CjsDirectTrinityStepExecutor();
  const context = new Tr2RenderContext();
  const events = [];
  const step = new TestStep(events);
  const job = {};

  executor.BeginStep(step, 1, 2, job, context);
  assert.equal(executor.ExecuteStep(step, 1, 2, job, context), TriRenderStep.RS_OK);
  executor.EndStep(step, 1, 2, job, context);
  assert.deepEqual(events.map(([ name ]) => name), [ "begin", "execute", "end" ]);

  executor.BeginBatch({}, context);
  assert.equal(context.GetStackSizeRT(), 1);
  assert.equal(context.GetStackSizeDS(), 1);
  executor.EndBatch({}, context);
  assert.equal(context.GetStackSizeRT(), 0);
  assert.equal(context.GetStackSizeDS(), 0);

  class FailingContext extends Tr2RenderContext
  {
    PushDepthStencil()
    {
      throw new Error("depth failed");
    }
  }
  const failing = new FailingContext();
  assert.throws(() => executor.BeginBatch({}, failing), /depth failed/u);
  assert.equal(failing.GetStackSizeRT(), 0);
});


test("Tr2RenderContext installs one nominal executor and restores direct execution", () =>
{
  const context = new Tr2RenderContext();
  assert.throws(
    () => context.SetStepExecutor({
      BeginStep() {}, ExecuteStep() {}, EndStep() {}, BeginScene() {}, EndScene() {},
      BeginBatch() {}, EndBatch() {}
    }),
    /CjsTrinityStepExecutor/u
  );

  const events = [];
  const executor = new RecordingExecutor(events);
  const step = new TestStep();
  context.SetStepExecutor(executor);
  context.BeginStep(step, 1, 2, null);
  context.ExecuteStep(step, 1, 2, null);
  context.EndStep(step, 1, 2, null);
  context.BeginRenderContext();
  context.BeginBatch({});
  context.EndBatch({});
  context.SetTriPoolAllocator({ Reset: () => events.push([ "Reset" ]) });
  context.EndRenderContext();
  assert.deepEqual(events.map(([ name ]) => name), [
    "BeginStep", "ExecuteStep", "EndStep", "BeginScene", "BeginBatch", "EndBatch", "Reset", "EndScene"
  ]);

  context.SetStepExecutor(null);
  const directEvents = [];
  const directStep = new TestStep(directEvents);
  assert.equal(context.ExecuteStep(directStep, 3, 4, null), TriRenderStep.RS_OK);
  assert.deepEqual(directEvents.map(([ name ]) => name), [ "execute" ]);
});
